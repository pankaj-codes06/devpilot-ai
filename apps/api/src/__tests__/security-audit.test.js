import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server.js';
import { prisma } from '@devpilot/database';
import { signSessionPayload } from '../utils/crypto.js';
import { AUTH_COOKIE_NAME } from '@devpilot/shared';

describe('Security and Multi-Tenant Isolation Audit', () => {
  const app = createApp();
  let org1Id;
  let org2Id;
  let user1Id;
  let user2Id;
  let user1SessionCookie;
  let user2SessionCookie;
  let repo1Id;

  beforeEach(async () => {
    // Generate isolated test data in PostgreSQL
    const org1 = await prisma.organization.create({
      data: {
        name: 'Alpha Security Org',
        slug: `alpha-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    org1Id = org1.id;

    const org2 = await prisma.organization.create({
      data: {
        name: 'Beta Security Org',
        slug: `beta-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    org2Id = org2.id;

    const user1 = await prisma.user.create({
      data: {
        githubId: BigInt(Math.floor(Math.random() * 10000000) + 100000),
        githubUsername: `secuser1-${Date.now().toString(36)}`,
        name: 'Security User 1',
        email: `sec1-${Date.now()}@test.com`,
        memberships: {
          create: {
            organizationId: org1.id,
            role: 'OWNER',
          },
        },
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        githubId: BigInt(Math.floor(Math.random() * 10000000) + 100000),
        githubUsername: `secuser2-${Date.now().toString(36)}`,
        name: 'Security User 2',
        email: `sec2-${Date.now()}@test.com`,
        memberships: {
          create: {
            organizationId: org2.id,
            role: 'OWNER',
          },
        },
      },
    });
    user2Id = user2.id;

    const token1 = signSessionPayload({ userId: user1.id, organizationId: org1.id });
    user1SessionCookie = `${AUTH_COOKIE_NAME}=${token1}`;

    const token2 = signSessionPayload({ userId: user2.id, organizationId: org2.id });
    user2SessionCookie = `${AUTH_COOKIE_NAME}=${token2}`;

    // Create a repository belonging to Org 1
    const repo1 = await prisma.repository.create({
      data: {
        organizationId: org1.id,
        githubRepoId: BigInt(Math.floor(Math.random() * 10000000) + 100000),
        installationId: BigInt(998877),
        name: 'alpha-core',
        fullName: 'alpha-org/alpha-core',
        owner: 'alpha-org',
        htmlUrl: 'https://github.com/alpha-org/alpha-core',
        defaultBranch: 'main',
        isConnected: true,
        agentSettings: {
          create: {
            isEnabled: false,
            scheduleCron: '0 9 * * 1-5',
            timezone: 'Asia/Kolkata',
            branchPrefix: 'devpilot/',
          },
        },
      },
    });
    repo1Id = repo1.id;
  });

  afterEach(async () => {
    // Clean up test organizations (cascades to repositories, team members, etc.)
    await prisma.organization
      .deleteMany({
        where: { id: { in: [org1Id, org2Id].filter(Boolean) } },
      })
      .catch(() => {});
    await prisma.user
      .deleteMany({
        where: { id: { in: [user1Id, user2Id].filter(Boolean) } },
      })
      .catch(() => {});
  });

  it('enforces strict multi-tenant organization isolation (Org 2 cannot access Org 1 repo)', async () => {
    // User 1 in Org 1 can access repo1
    const res1 = await request(app)
      .get(`/api/repositories/${repo1Id}`)
      .set('Cookie', user1SessionCookie);
    expect(res1.status).toBe(200);
    expect(res1.body.data.id).toBe(repo1Id);

    // User 2 in Org 2 CANNOT access repo1 (fails with 400/404)
    const res2 = await request(app)
      .get(`/api/repositories/${repo1Id}`)
      .set('Cookie', user2SessionCookie);
    expect(res2.status).toBeGreaterThanOrEqual(400);
    expect(res2.body.success).toBe(false);
  });

  it('prevents cross-tenant settings tampering', async () => {
    // User 2 in Org 2 attempts to change settings of Org 1 repository
    const tamperRes = await request(app)
      .patch(`/api/repositories/${repo1Id}/settings`)
      .set('Cookie', user2SessionCookie)
      .send({ isEnabled: true });

    expect(tamperRes.status).toBeGreaterThanOrEqual(400);
    expect(tamperRes.body.success).toBe(false);

    // Verify repo1 settings were not altered
    const verifyRes = await request(app)
      .get(`/api/repositories/${repo1Id}`)
      .set('Cookie', user1SessionCookie);
    expect(verifyRes.body.data.agentSettings.isEnabled).toBe(false);
  });

  it('disallows enabling autonomous agent on disconnected repositories', async () => {
    // Disconnect repo1
    const discRes = await request(app)
      .delete(`/api/github/repositories/${repo1Id}`)
      .set('Cookie', user1SessionCookie);
    expect(discRes.status).toBe(200);

    // Attempt to update settings with isEnabled: true on disconnected repo
    const enableRes = await request(app)
      .patch(`/api/repositories/${repo1Id}/settings`)
      .set('Cookie', user1SessionCookie)
      .send({ isEnabled: true });

    expect(enableRes.status).toBe(400);
    expect(enableRes.body.error.message).toContain('disconnected repository');
  });

  it('preserves immutable audit logs when user account is deleted', async () => {
    // Record audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId: org1Id,
        userId: user1Id,
        repositoryId: repo1Id,
        action: 'TEST_AUDIT_ACTION',
        entityType: 'REPOSITORY',
        entityId: repo1Id,
        metadata: { test: true },
      },
    });

    // Delete user1
    await prisma.user.delete({ where: { id: user1Id } });

    // Verify audit log still exists and userId is set to null (SetNull onDelete)
    const retrievedLog = await prisma.auditLog.findUnique({
      where: { id: auditLog.id },
    });

    expect(retrievedLog).not.toBeNull();
    expect(retrievedLog?.userId).toBeNull();
    expect(retrievedLog?.action).toBe('TEST_AUDIT_ACTION');
  });

  it('verifies rate limiting headers are populated on API requests', async () => {
    const apiRes = await request(app)
      .get('/api/repositories')
      .set('Cookie', user1SessionCookie);

    expect(apiRes.headers['x-ratelimit-limit']).toBeDefined();
    expect(apiRes.headers['x-ratelimit-remaining']).toBeDefined();
    expect(apiRes.headers['x-ratelimit-reset']).toBeDefined();
  });
});
