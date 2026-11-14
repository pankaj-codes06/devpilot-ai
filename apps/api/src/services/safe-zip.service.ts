import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AppError } from '../utils/response.js';

const execFileAsync = promisify(execFile);

export interface ZipEntryMeta {
  path: string;
  isDir: boolean;
  isSymlink: boolean;
  uncompressedSize: number;
}

export interface ZipInspectionResult {
  isValid: boolean;
  entries: ZipEntryMeta[];
  totalFiles: number;
  totalBytes: number;
}

export interface ExtractionResult {
  extractedCount: number;
  totalBytes: number;
  extractedFiles: string[];
  skippedFiles: string[];
}

export interface PackagingResult {
  zipPath: string;
  fileSize: number;
  checksum: string;
  fileCount: number;
}

export class SafeZipService {
  public static readonly MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
  public static readonly MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024; // 500MB (Decompression bomb guard)

  private static readonly EXCLUDED_PATTERNS = [
    /(^|\/)node_modules(\/|$)/i,
    /(^|\/)\.git(\/|$)/i,
    /(^|\/)\.env(\..*)?$/i,
    /(^|\/)(dist|build|out|\.next|coverage)(\/|$)/i,
    /(^|\/)\.DS_Store$/i,
    /(^|\/)__MACOSX(\/|$)/i,
    /\.(pem|key|id_rsa)$/i,
  ];

  /**
   * Validates standard ZIP magic bytes (PK\x03\x04 or PK\x05\x06).
   */
  static hasValidMagicBytes(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) return false;
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      ((buffer[2] === 0x03 && buffer[3] === 0x04) || (buffer[2] === 0x05 && buffer[3] === 0x06))
    );
  }

  /**
   * Tests if an entry path is excluded by project hygiene rules.
   */
  static isExcludedPath(entryPath: string): boolean {
    const normalized = entryPath.replace(/\\/g, '/');
    return this.EXCLUDED_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  /**
   * Thoroughly inspects a ZIP archive using Info-ZIP zipinfo:
   * - Verifies ZIP integrity
   * - Detects path traversal attempts (Zip Slip)
   * - Detects forbidden symbolic links
   * - Computes total uncompressed byte limits
   */
  static async inspectZip(archivePath: string): Promise<ZipInspectionResult> {
    if (!fsSync.existsSync(archivePath)) {
      throw new AppError('Archive file not found on disk', 404, 'NOT_FOUND');
    }

    // 1. Verify Magic Bytes
    const header = Buffer.alloc(4);
    const fd = fsSync.openSync(archivePath, 'r');
    try {
      fsSync.readSync(fd, header, 0, 4, 0);
    } finally {
      fsSync.closeSync(fd);
    }

    if (!this.hasValidMagicBytes(header)) {
      throw new AppError(
        'Invalid file format. The provided file is not a valid ZIP archive.',
        400,
        'INVALID_ARCHIVE'
      );
    }

    // 2. Query exact entry names using unzip -Z -1
    let listStdout: string;
    try {
      const res = await execFileAsync('/usr/bin/unzip', ['-Z', '-1', archivePath], {
        maxBuffer: 20 * 1024 * 1024,
      });
      listStdout = res.stdout;
    } catch (err: any) {
      throw new AppError(
        `Failed to parse ZIP archive: ${err.message || 'corrupt or encrypted file'}`,
        400,
        'CORRUPT_ARCHIVE'
      );
    }

    const entryNames = listStdout
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (const entryName of entryNames) {
      // Path traversal checks (Zip Slip)
      const cleanPath = path.normalize(entryName).replace(/^(\.\.(\/|\\|$))+/, '');
      if (
        entryName.includes('..') ||
        entryName.startsWith('/') ||
        entryName.startsWith('\\') ||
        /^[a-zA-Z]:/.test(entryName) ||
        cleanPath !== path.normalize(entryName)
      ) {
        throw new AppError(
          `Dangerous archive entry detected: path traversal attempt (${entryName}).`,
          400,
          'SECURITY_RISK'
        );
      }
    }

    // 3. Check for symbolic links using zipinfo short mode
    const sRes = await execFileAsync('/usr/bin/unzip', ['-Z', '-s', archivePath], {
      maxBuffer: 20 * 1024 * 1024,
    });
    for (const line of sRes.stdout.split('\n')) {
      const trimmed = line.trim();
      if (/^l[rwx-]{9}/.test(trimmed)) {
        throw new AppError(
          'Dangerous archive entry detected: symbolic links are strictly prohibited.',
          400,
          'SECURITY_RISK'
        );
      }
    }

    // 4. Calculate total uncompressed size using zipinfo total summary (-Z -t)
    let totalBytes = 0;
    try {
      const tRes = await execFileAsync('/usr/bin/unzip', ['-Z', '-t', archivePath], {
        maxBuffer: 20 * 1024 * 1024,
      });
      const match = tRes.stdout.match(/(\d+)\s+bytes\s+uncompressed/i);
      if (match && match[1]) {
        totalBytes = parseInt(match[1], 10);
      }
    } catch {
      // Ignore if summary format varies
    }

    if (totalBytes > this.MAX_UNCOMPRESSED_SIZE) {
      throw new AppError(
        `Archive exceeds maximum uncompressed limit of ${Math.round(this.MAX_UNCOMPRESSED_SIZE / 1024 / 1024)}MB.`,
        400,
        'PAYLOAD_TOO_LARGE'
      );
    }

    const entries: ZipEntryMeta[] = entryNames.map((name) => ({
      path: name,
      isDir: name.endsWith('/'),
      isSymlink: false,
      uncompressedSize: 0,
    }));

    return {
      isValid: true,
      entries,
      totalFiles: entries.filter((e) => !e.isDir).length,
      totalBytes,
    };
  }

  /**
   * Securely extracts a validated ZIP archive into an isolated destination directory.
   * Strips forbidden directories (node_modules, .git, .env, etc.).
   */
  static async extractArchive(
    archivePath: string,
    destinationDir: string
  ): Promise<ExtractionResult> {
    // 1. Pre-inspection
    await this.inspectZip(archivePath);

    // 2. Prepare temporary sandbox for extraction
    const tempSandbox = path.join(os.tmpdir(), `devpilot-extract-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
    await fs.mkdir(tempSandbox, { recursive: true });

    try {
      // 3. Extract in isolation
      await execFileAsync('/usr/bin/unzip', ['-q', archivePath, '-d', tempSandbox], {
        maxBuffer: 50 * 1024 * 1024,
      });

      // 4. Clean destination directory
      await fs.mkdir(destinationDir, { recursive: true });

      // 5. Transfer sanitized files to destination
      const extractedFiles: string[] = [];
      const skippedFiles: string[] = [];
      let totalBytes = 0;

      // Detect if archive has a single top-level folder wrapping everything (common in GitHub downloads)
      const rootEntries = await fs.readdir(tempSandbox);
      let sourceBase = tempSandbox;
      if (rootEntries.length === 1) {
        const singlePath = path.join(tempSandbox, rootEntries[0]!);
        const stat = await fs.stat(singlePath);
        if (stat.isDirectory()) {
          sourceBase = singlePath;
        }
      }

      const copySanitizedRecursive = async (currentDir: string, relativeBase: string = '') => {
        const items = await fs.readdir(currentDir, { withFileTypes: true });

        for (const item of items) {
          const relPath = path.join(relativeBase, item.name);
          const fullSrcPath = path.join(currentDir, item.name);
          const fullDestPath = path.join(destinationDir, relPath);

          // Security check against destination escaping
          const normalizedDest = path.normalize(fullDestPath);
          if (!normalizedDest.startsWith(path.resolve(destinationDir) + path.sep) && normalizedDest !== path.resolve(destinationDir)) {
            throw new AppError(`Path traversal escaping detected: ${relPath}`, 400, 'SECURITY_RISK');
          }

          if (this.isExcludedPath(relPath)) {
            skippedFiles.push(relPath);
            continue;
          }

          if (item.isSymbolicLink()) {
            throw new AppError(`Symbolic link detected during extraction: ${relPath}`, 400, 'SECURITY_RISK');
          }

          if (item.isDirectory()) {
            await fs.mkdir(fullDestPath, { recursive: true, mode: 0o755 });
            await copySanitizedRecursive(fullSrcPath, relPath);
          } else if (item.isFile()) {
            await fs.mkdir(path.dirname(fullDestPath), { recursive: true });
            await fs.copyFile(fullSrcPath, fullDestPath);
            await fs.chmod(fullDestPath, 0o644);

            const stat = await fs.stat(fullDestPath);
            totalBytes += stat.size;
            extractedFiles.push(relPath);
          }
        }
      };

      await copySanitizedRecursive(sourceBase);

      return {
        extractedCount: extractedFiles.length,
        totalBytes,
        extractedFiles,
        skippedFiles,
      };
    } finally {
      // Guaranteed cleanup of temporary extraction sandbox
      await fs.rm(tempSandbox, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Packages a project directory into a ZIP archive.
   * If filterPaths is provided, includes only matching paths plus root project configs.
   */
  static async createZip(
    sourceDir: string,
    targetZipPath: string,
    filterPaths?: string[]
  ): Promise<PackagingResult> {
    if (!fsSync.existsSync(sourceDir)) {
      throw new AppError(`Source directory does not exist: ${sourceDir}`, 404, 'NOT_FOUND');
    }

    await fs.mkdir(path.dirname(targetZipPath), { recursive: true });

    // If filterPaths is specified, prepare temporary filtered copy
    let zipSourceDir = sourceDir;
    let tempFilterDir: string | null = null;

    if (filterPaths && filterPaths.length > 0) {
      tempFilterDir = path.join(os.tmpdir(), `devpilot-pack-${Date.now().toString(36)}`);
      await fs.mkdir(tempFilterDir, { recursive: true });

      // Always include root manifest and build config files for working dependencies
      const rootConfigs = [
        'package.json',
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        'tsconfig.json',
        'README.md',
        'go.mod',
        'go.sum',
        'requirements.txt',
        'pyproject.toml',
        'Cargo.toml',
        'Cargo.lock',
      ];

      for (const cfg of rootConfigs) {
        const src = path.join(sourceDir, cfg);
        if (fsSync.existsSync(src)) {
          await fs.copyFile(src, path.join(tempFilterDir, cfg));
        }
      }

      // Copy matching filter paths
      for (const pattern of filterPaths) {
        const cleanPattern = pattern.replace(/^\/+/, '').replace(/\/\*+$/, '');
        const srcPath = path.join(sourceDir, cleanPattern);
        const destPath = path.join(tempFilterDir, cleanPattern);

        if (fsSync.existsSync(srcPath)) {
          const stat = await fs.stat(srcPath);
          if (stat.isDirectory()) {
            await fs.cp(srcPath, destPath, { recursive: true });
          } else {
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.copyFile(srcPath, destPath);
          }
        }
      }

      zipSourceDir = tempFilterDir;
    }

    try {
      // Remove target zip if it already exists
      if (fsSync.existsSync(targetZipPath)) {
        await fs.unlink(targetZipPath);
      }

      // Execute zip command: -r -q -9 (maximum compression)
      await execFileAsync('/usr/bin/zip', ['-r', '-q', '-9', targetZipPath, '.'], {
        cwd: zipSourceDir,
        maxBuffer: 50 * 1024 * 1024,
      });

      const stat = await fs.stat(targetZipPath);
      const fileData = await fs.readFile(targetZipPath);
      const checksum = crypto.createHash('sha256').update(fileData).digest('hex');

      const info = await this.inspectZip(targetZipPath);

      return {
        zipPath: targetZipPath,
        fileSize: stat.size,
        checksum,
        fileCount: info.totalFiles,
      };
    } finally {
      if (tempFilterDir) {
        await fs.rm(tempFilterDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}
