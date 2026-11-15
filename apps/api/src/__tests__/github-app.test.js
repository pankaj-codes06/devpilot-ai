import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../server.js';
import { prisma } from '@devpilot/database';
import { normalizePrivateKey } from '@devpilot/github';
import { signSessionPayload } from '../utils/crypto.js';
import { AUTH_COOKIE_NAME, INSTALL_STATE_COOKIE_NAME } from '@devpilot/shared';
import { env } from '../config/env.js';

describe('GitHub App Integration & Lifecycle Tests', () => {
  const app = createApp();
  let orgId;
  let userId;
  let sessionCookie;
  let repoId;
  const mockInstallationId = 987654321;
  const mockRepoId = 88776655;

  function signWebhook(payload) {
    if (!env.GITHUB_WEBHOOK_SECRET) return '';
    return `sha256=${crypto
      .createHmac('sha256', env.GITHUB_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')}`;
  }

  beforeEach(async () => {
    const org = await prisma.organization.create({
      data: {
        name: 'GitHub App Test Org',
        slug: `ghapp-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        githubId: BigInt(Math.floor(Math.random() * 10000000) + 100000),
        githubUsername: `ghapp-user-${Date.now().toString(36)}`,
        memberships: {
          create: {
            organizationId: org.id,
            role: 'ADMIN',
          },
        },
      },
    });
    userId = user.id;

    sessionCookie = `${AUTH_COOKIE_NAME}=${signSessionPayload({
      userId: user.id,
      organizationId: org.id,
    })}`;

    const repo = await prisma.repository.create({
      data: {
        organizationId: org.id,
        githubRepoId: BigInt(mockRepoId),
        installationId: BigInt(mockInstallationId),
        name: 'verified-test-repo',
        fullName: 'test-org/verified-test-repo',
        owner: 'test-org',
        htmlUrl: 'https://github.com/test-org/verified-test-repo',
        defaultBranch: 'main',
        isConnected: true,
        agentSettings: {
          create: {
            isEnabled: true,
            scheduleCron: '0 9 * * 1-5',
            timezone: 'Asia/Kolkata',
          },
        },
      },
    });
    repoId = repo.id;
  });

  afterEach(async () => {
    await prisma.organization
      .deleteMany({
        where: { id: orgId },
      })
      .catch(() => {});
    await prisma.user
      .deleteMany({
        where: { id: userId },
      })
      .catch(() => {});
  });

  describe('Private Key Resolution (normalizePrivateKey)', () => {
    it('normalizes inline PEM keys with literal \\n characters', () => {
      const inlineKey = '-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA...\\n-----END RSA PRIVATE KEY-----';
      const normalized = normalizePrivateKey(inlineKey);
      expect(normalized).toBe('-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----');
    });

    it('reads and normalizes a PEM file from disk', async () => {
      const tempKeyPath = path.join(os.tmpdir(), `test-key-${Date.now().toString(36)}.pem`);
      const keyContent = '-----BEGIN RSA PRIVATE KEY-----\nMOCK_FILE_KEY_DATA\n-----END RSA PRIVATE KEY-----';
      await fs.writeFile(tempKeyPath, keyContent, 'utf-8');

      try {
        const normalized = normalizePrivateKey(tempKeyPath);
        expect(normalized).toBe(keyContent);
      } finally {
        await fs.unlink(tempKeyPath).catch(() => {});
      }
    });

    it('decodes base64-encoded private keys', () => {
      const rawPem = '-----BEGIN RSA PRIVATE KEY-----\nMOCK_BASE64_KEY_1234567890\n-----END RSA PRIVATE KEY-----';
      const b64 = Buffer.from(rawPem).toString('base64');
      const normalized = normalizePrivateKey(b64);
      expect(normalized).toBe(rawPem);
    });

    it('strips surrounding single or double quotes', () => {
      const quoted = '"-----BEGIN RSA PRIVATE KEY-----\\nLINE1\\n-----END RSA PRIVATE KEY-----"';
      const normalized = normalizePrivateKey(quoted);
      expect(normalized).toBe('-----BEGIN RSA PRIVATE KEY-----\nLINE1\n-----END RSA PRIVATE KEY-----');
    });
  });

  describe('Installation Callback Endpoint', () => {
    it('redirects to frontend with installation_id and setup_action', async () => {
      const res = await request(app).get(
        '/api/github/callback?installation_id=123456&setup_action=install'
      );

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/repositories');
      expect(res.headers.location).toContain('installation_id=123456');
      expect(res.headers.location).toContain('setup_action=install');
    });

    it('validates matching state cookie when provided', async () => {
      const state = 'secure_random_state_123';
      const res = await request(app)
        .get(`/api/github/callback?installation_id=123456&setup_action=install&state=${state}`)
        .set('Cookie', `${INSTALL_STATE_COOKIE_NAME}=${state}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/repositories');
    });

    it('rejects installation callback when state cookie mismatches', async () => {
      const res = await request(app)
        .get('/api/github/callback?installation_id=123456&setup_action=install&state=attacker_state')
        .set('Cookie', `${INSTALL_STATE_COOKIE_NAME}=victim_state`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });
  });

  describe('GitHub Webhook Handling & Lifecycle Events', () => {
    it('rejects webhooks with invalid signature when secret is configured', async () => {
      if (!env.GITHUB_WEBHOOK_SECRET) return;

      const res = await request(app)
        .post('/api/github/webhook')
        .set('x-github-event', 'ping')
        .set('x-hub-signature-256', 'sha256=invalid_bad_signature_0000000000')
        .send({ zen: 'Testing signature check' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('responds to ping event with pong', async () => {
      const payload = { zen: 'Keep it logically awesome.' };
      const reqBuilder = request(app)
        .post('/api/github/webhook')
        .set('x-github-event', 'ping');

      if (env.GITHUB_WEBHOOK_SECRET) {
        reqBuilder.set('x-hub-signature-256', signWebhook(payload));
      }

      const res = await reqBuilder.send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('pong');
    });

    it('disconnects all repositories when an installation is deleted on GitHub', async () => {
      const payload = {
        action: 'deleted',
        installation: {
          id: mockInstallationId,
        },
      };

      const reqBuilder = request(app)
        .post('/api/github/webhook')
        .set('x-github-event', 'installation');

      if (env.GITHUB_WEBHOOK_SECRET) {
        reqBuilder.set('x-hub-signature-256', signWebhook(payload));
      }

      const res = await reqBuilder.send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in database that the repository was marked disconnected
      const updatedRepo = await prisma.repository.findUnique({
        where: { id: repoId },
        include: { agentSettings: true },
      });

      expect(updatedRepo?.isConnected).toBe(false);
      expect(updatedRepo?.agentSettings?.isEnabled).toBe(false);
    });

    it('disconnects specific repositories when removed from installation', async () => {
      const payload = {
        action: 'removed',
        installation: {
          id: mockInstallationId,
        },
        repositories_removed: [
          { id: mockRepoId, name: 'verified-test-repo', full_name: 'test-org/verified-test-repo' },
        ],
      };

      const reqBuilder = request(app)
        .post('/api/github/webhook')
        .set('x-github-event', 'installation_repositories');

      if (env.GITHUB_WEBHOOK_SECRET) {
        reqBuilder.set('x-hub-signature-256', signWebhook(payload));
      }

      const res = await reqBuilder.send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedRepo = await prisma.repository.findUnique({
        where: { id: repoId },
        include: { agentSettings: true },
      });

      expect(updatedRepo?.isConnected).toBe(false);
      expect(updatedRepo?.agentSettings?.isEnabled).toBe(false);
    });
  });

  describe('Repository Disconnection Endpoint', () => {
    it('allows an authenticated admin to disconnect a connected repository', async () => {
      const res = await request(app)
        .delete(`/api/github/repositories/${repoId}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedRepo = await prisma.repository.findUnique({
        where: { id: repoId },
        include: { agentSettings: true },
      });

      expect(updatedRepo?.isConnected).toBe(false);
      expect(updatedRepo?.agentSettings?.isEnabled).toBe(false);
    });

    it('rejects unauthenticated requests to disconnect', async () => {
      const res = await request(app).delete(`/api/github/repositories/${repoId}`);
      expect(res.status).toBe(401);
    });
  });
});
