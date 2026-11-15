import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createApp } from '../server.js';
import { prisma } from '@devpilot/database';
import { signSessionPayload } from '../utils/crypto.js';
import { AUTH_COOKIE_NAME } from '@devpilot/shared';
import { SafeZipService } from '../services/safe-zip.service.js';
import { ProjectService } from '../services/project.service.js';

const execFileAsync = promisify(execFile);

describe('Hybrid ZIP Project Upload & Versioning Core', () => {
  const app = createApp();
  let orgId;
  let otherOrgId;
  let userId;
  let otherUserId;
  let sessionCookie;
  let otherSessionCookie;
  let createdProjectId;

  let testTempDir;
  let validZipPath;
  let validZipBuffer;
  let zipSlipPath;
  let zipSlipBuffer;
  let symlinkZipPath;
  let symlinkZipBuffer;

  beforeAll(async () => {
    testTempDir = path.join(os.tmpdir(), `devpilot-test-archives-${Date.now().toString(36)}`);
    await fs.mkdir(testTempDir, { recursive: true });

    // 1. Create a valid standard project directory and zip it
    const validSrcDir = path.join(testTempDir, 'valid-src');
    await fs.mkdir(path.join(validSrcDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(validSrcDir, 'node_modules', 'dummy'), { recursive: true });
    await fs.writeFile(path.join(validSrcDir, 'package.json'), JSON.stringify({ name: 'test-app', version: '1.0.0' }));
    await fs.writeFile(path.join(validSrcDir, 'README.md'), '# Test App Setup');
    await fs.writeFile(path.join(validSrcDir, 'src', 'index.ts'), 'console.log("Hello DevPilot");');
    await fs.writeFile(path.join(validSrcDir, '.env'), 'SECRET_KEY=leak');
    await fs.writeFile(path.join(validSrcDir, 'node_modules', 'dummy', 'index.js'), 'module.exports = 1;');

    validZipPath = path.join(testTempDir, 'valid-app.zip');
    await execFileAsync('/usr/bin/zip', ['-r', '-q', validZipPath, '.'], { cwd: validSrcDir });
    validZipBuffer = await fs.readFile(validZipPath);

    // 2. Create a zip with a path traversal entry (Zip Slip attempt)
    const zipSlipDir = path.join(testTempDir, 'zipslip-src');
    await fs.mkdir(zipSlipDir, { recursive: true });
    await fs.writeFile(path.join(zipSlipDir, 'safe.txt'), 'safe');
    zipSlipPath = path.join(testTempDir, 'zipslip.zip');
    await execFileAsync('/usr/bin/zip', ['-q', zipSlipPath, 'safe.txt'], { cwd: zipSlipDir });

    const slipBuffer = await fs.readFile(zipSlipPath);
    let injected = slipBuffer.toString('binary');
    injected = injected.replaceAll('safe.txt', '../escap');
    zipSlipBuffer = Buffer.from(injected, 'binary');
    await fs.writeFile(zipSlipPath, zipSlipBuffer);

    // 3. Create a zip with a symbolic link
    const symlinkSrcDir = path.join(testTempDir, 'symlink-src');
    await fs.mkdir(symlinkSrcDir, { recursive: true });
    await fs.writeFile(path.join(symlinkSrcDir, 'real.txt'), 'real file');
    try {
      await fs.symlink('real.txt', path.join(symlinkSrcDir, 'symlink.txt'));
      symlinkZipPath = path.join(testTempDir, 'symlink.zip');
      await execFileAsync('/usr/bin/zip', ['-r', '-y', '-q', symlinkZipPath, 'real.txt', 'symlink.txt'], {
        cwd: symlinkSrcDir,
      });
      symlinkZipBuffer = await fs.readFile(symlinkZipPath);
    } catch {
      // If symlink not supported in temp, fallback
      symlinkZipBuffer = Buffer.alloc(0);
    }
  });

  afterAll(async () => {
    if (testTempDir && fsSync.existsSync(testTempDir)) {
      await fs.rm(testTempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  beforeEach(async () => {
    const org = await prisma.organization.create({
      data: {
        name: 'Hybrid Platform Org',
        slug: `hybrid-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    orgId = org.id;

    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Competitor Org',
        slug: `comp-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    otherOrgId = otherOrg.id;

    const user = await prisma.user.create({
      data: {
        githubId: BigInt(Math.floor(Math.random() * 10000000) + 100000),
        githubUsername: `hybrid-user-${Date.now().toString(36)}`,
        memberships: {
          create: {
            organizationId: org.id,
            role: 'ADMIN',
          },
        },
      },
    });
    userId = user.id;

    const otherUser = await prisma.user.create({
      data: {
        githubId: BigInt(Math.floor(Math.random() * 10000000) + 100000),
        githubUsername: `other-user-${Date.now().toString(36)}`,
        memberships: {
          create: {
            organizationId: otherOrg.id,
            role: 'ADMIN',
          },
        },
      },
    });
    otherUserId = otherUser.id;

    sessionCookie = `${AUTH_COOKIE_NAME}=${signSessionPayload({
      userId: user.id,
      organizationId: org.id,
    })}`;

    otherSessionCookie = `${AUTH_COOKIE_NAME}=${signSessionPayload({
      userId: otherUser.id,
      organizationId: otherOrg.id,
    })}`;

    const initialProject = await ProjectService.createProjectFromZip(
      org.id,
      user.id,
      { name: 'Initial Workspace Project' },
      validZipBuffer
    );
    createdProjectId = initialProject.id;
  });

  afterEach(async () => {
    await prisma.organization
      .deleteMany({
        where: { id: { in: [orgId, otherOrgId].filter(Boolean) } },
      })
      .catch(() => {});
    await prisma.user
      .deleteMany({
        where: { id: { in: [userId, otherUserId].filter(Boolean) } },
      })
      .catch(() => {});
  });

  describe('SafeZipService Security & Extraction Engine', () => {
    it('validates standard ZIP magic bytes correctly', () => {
      expect(SafeZipService.hasValidMagicBytes(validZipBuffer)).toBe(true);
      expect(SafeZipService.hasValidMagicBytes(Buffer.from('not a zip file'))).toBe(false);
      expect(SafeZipService.hasValidMagicBytes(Buffer.alloc(0))).toBe(false);
    });

    it('identifies and sanitizes excluded paths (node_modules, .git, .env)', () => {
      expect(SafeZipService.isExcludedPath('node_modules/express/index.js')).toBe(true);
      expect(SafeZipService.isExcludedPath('.git/config')).toBe(true);
      expect(SafeZipService.isExcludedPath('.env')).toBe(true);
      expect(SafeZipService.isExcludedPath('.env.production')).toBe(true);
      expect(SafeZipService.isExcludedPath('dist/bundle.js')).toBe(true);
      expect(SafeZipService.isExcludedPath('.DS_Store')).toBe(true);
      expect(SafeZipService.isExcludedPath('src/components/Header.tsx')).toBe(false);
      expect(SafeZipService.isExcludedPath('package.json')).toBe(false);
    });

    it('rejects archives containing path traversal (Zip Slip)', async () => {
      await expect(SafeZipService.inspectZip(zipSlipPath)).rejects.toThrow(/Dangerous archive entry/);
    });

    if (symlinkZipBuffer && symlinkZipBuffer.length > 0) {
      it('rejects archives containing symbolic links', async () => {
        await expect(SafeZipService.inspectZip(symlinkZipPath)).rejects.toThrow(/symbolic links are strictly prohibited/);
      });
    }

    it('extracts sanitized files while omitting node_modules and .env', async () => {
      const destDir = path.join(testTempDir, 'extracted-check');
      const result = await SafeZipService.extractArchive(validZipPath, destDir);

      expect(result.extractedCount).toBeGreaterThan(0);
      expect(result.extractedFiles).toContain('package.json');
      expect(result.extractedFiles).toContain(path.join('src', 'index.ts'));

      // Verify excluded files were not written to destination
      expect(fsSync.existsSync(path.join(destDir, '.env'))).toBe(false);
      expect(fsSync.existsSync(path.join(destDir, 'node_modules'))).toBe(false);

      await fs.rm(destDir, { recursive: true, force: true }).catch(() => {});
    });
  });

  describe('Project Upload & Version Management API', () => {
    it('rejects unauthenticated upload requests', async () => {
      const res = await request(app)
        .post('/api/projects/upload')
        .set('Content-Type', 'application/zip')
        .send(validZipBuffer);

      expect(res.status).toBe(401);
    });

    it('rejects uploads with invalid non-zip format', async () => {
      const res = await request(app)
        .post('/api/projects/upload?name=Corrupt+App')
        .set('Cookie', sessionCookie)
        .set('Content-Type', 'application/zip')
        .send(Buffer.from('corrupted non-zip payload'));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ARCHIVE');
    });

    it('successfully uploads valid ZIP project and extracts Version 1', async () => {
      const res = await request(app)
        .post('/api/projects/upload?name=E-Commerce+Core&description=Main+platform')
        .set('Cookie', sessionCookie)
        .set('Content-Type', 'application/zip')
        .send(validZipBuffer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('E-Commerce Core');
      expect(res.body.data.sourceType).toBe('ZIP');
      expect(res.body.data.activeVersion).toBeDefined();
      expect(res.body.data.activeVersion.versionNumber).toBe(1);
      expect(res.body.data.activeVersion.status).toBe('READY');
      expect(res.body.data.activeVersion.fileCount).toBeGreaterThan(0);

      createdProjectId = res.body.data.id;

      // Verify workspace directory exists on disk
      const workspacePath = res.body.data.activeVersion.extractedPath;
      expect(fsSync.existsSync(workspacePath)).toBe(true);
      expect(fsSync.existsSync(path.join(workspacePath, 'package.json'))).toBe(true);
      expect(fsSync.existsSync(path.join(workspacePath, '.env'))).toBe(false); // sanitized
    });

    it('handles multipart/form-data upload correctly', async () => {
      const boundary = '---------------------------974767299852498929531610575';
      const multipartPayload = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nMultipart App\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nForm upload\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="app.zip"\r\nContent-Type: application/zip\r\n\r\n`),
        validZipBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const res = await request(app)
        .post('/api/projects/upload')
        .set('Cookie', sessionCookie)
        .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
        .send(multipartPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Multipart App');
    });

    it('uploads a new updated version to an existing project (Version 2)', async () => {
      const res = await request(app)
        .post(`/api/projects/${createdProjectId}/versions?label=v2.0.0-beta&changelog=Bugfixes`)
        .set('Cookie', sessionCookie)
        .set('Content-Type', 'application/zip')
        .send(validZipBuffer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.versionNumber).toBe(2);
      expect(res.body.data.label).toBe('v2.0.0-beta');
      expect(res.body.data.status).toBe('READY');

      // Verify active version was updated on project
      const projectRes = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .set('Cookie', sessionCookie);

      expect(projectRes.status).toBe(200);
      expect(projectRes.body.data.activeVersion.versionNumber).toBe(2);
      expect(projectRes.body.data.versionsCount).toBe(2);
    });

    it('enforces multi-tenant isolation (other organization cannot access project)', async () => {
      const res = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .set('Cookie', otherSessionCookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('lists project versions with checksum and file counts', async () => {
      await request(app)
        .post(`/api/projects/${createdProjectId}/versions?label=v2.0.0`)
        .set('Cookie', sessionCookie)
        .set('Content-Type', 'application/zip')
        .send(validZipBuffer);

      const res = await request(app)
        .get(`/api/projects/${createdProjectId}/versions`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].versionNumber).toBe(2);
      expect(res.body.data[1].versionNumber).toBe(1);
    });

    it('deletes project from database and cleans workspaces from disk', async () => {
      const projectBefore = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .set('Cookie', sessionCookie);

      const workspacePath = projectBefore.body.data.activeVersion.extractedPath;
      expect(fsSync.existsSync(workspacePath)).toBe(true);

      const delRes = await request(app)
        .delete(`/api/projects/${createdProjectId}`)
        .set('Cookie', sessionCookie);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify deleted in DB
      const getRes = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .set('Cookie', sessionCookie);
      expect(getRes.status).toBe(404);

      // Verify disk storage purged
      expect(fsSync.existsSync(workspacePath)).toBe(false);
    });
  });
});
