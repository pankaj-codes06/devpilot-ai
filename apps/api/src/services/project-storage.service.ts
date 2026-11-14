import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { SafeZipService, type ExtractionResult } from './safe-zip.service.js';

export interface StoredProjectVersion {
  originalZipPath: string;
  extractedPath: string;
  checksum: string;
  fileCount: number;
  totalBytes: number;
  extractedFiles: string[];
}

export class ProjectStorageService {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = path.resolve(customBaseDir || env.STORAGE_DIR);
  }

  getProjectDir(projectId: string): string {
    return path.join(this.baseDir, 'projects', projectId);
  }

  getArchiveDir(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'archives');
  }

  getWorkspaceDir(projectId: string, versionNumber: number): string {
    return path.join(this.getProjectDir(projectId), 'workspaces', `v${versionNumber}`);
  }

  getArtifactDir(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'artifacts');
  }

  /**
   * Initializes durable directories for a new project.
   */
  async initProjectStorage(projectId: string): Promise<string> {
    const projectDir = this.getProjectDir(projectId);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(this.getArchiveDir(projectId), { recursive: true });
    await fs.mkdir(this.getArtifactDir(projectId), { recursive: true });
    return projectDir;
  }

  /**
   * Saves uploaded ZIP buffer and securely extracts it into a versioned isolated workspace.
   */
  async storeAndExtractVersion(
    projectId: string,
    versionNumber: number,
    zipBuffer: Buffer
  ): Promise<StoredProjectVersion> {
    await this.initProjectStorage(projectId);

    // Compute SHA-256 Checksum
    const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');

    // Save Archive
    const archivePath = path.join(this.getArchiveDir(projectId), `v${versionNumber}-${Date.now().toString(36)}.zip`);
    await fs.writeFile(archivePath, zipBuffer);

    // Extract to Isolated Workspace
    const workspacePath = this.getWorkspaceDir(projectId, versionNumber);
    if (fsSync.existsSync(workspacePath)) {
      await fs.rm(workspacePath, { recursive: true, force: true });
    }
    await fs.mkdir(workspacePath, { recursive: true });

    const extraction: ExtractionResult = await SafeZipService.extractArchive(archivePath, workspacePath);

    return {
      originalZipPath: archivePath,
      extractedPath: workspacePath,
      checksum,
      fileCount: extraction.extractedCount,
      totalBytes: extraction.totalBytes,
      extractedFiles: extraction.extractedFiles,
    };
  }

  /**
   * Purges a project directory and all associated workspaces and archives.
   */
  async deleteProjectStorage(projectId: string): Promise<void> {
    const projectDir = this.getProjectDir(projectId);
    if (fsSync.existsSync(projectDir)) {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  }
}

export const projectStorageService = new ProjectStorageService();
