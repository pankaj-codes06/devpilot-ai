import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server.js';
import { prisma } from '@devpilot/database';
import { signSessionPayload } from '../utils/crypto.js';
import { AUTH_COOKIE_NAME } from '@devpilot/shared';
import { analysisQueueService } from '../services/analysis-queue.service.js';

describe('Repository Analysis API Endpoints', () => {
  const app = createApp();
  let orgId;
  let otherOrgId;
  let userId;
  let otherUserId;
  let sessionCookie;
  let otherSessionCookie;
  let repoId;
  let runId;

  beforeEach(async () => {
    // Setup test organization and users
    const org = await prisma.organization.create({
      data: {
        name: 'Analysis Test Org',
        slug: `analysis-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    orgId = org.id;

    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Other Analysis Org',
        slug: `other-org-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    otherOrgId = otherOrg.id;

    const user = await prisma.user.create({
      data: {
        githubId: BigInt(Math.floor(Math.random() * 10000000) + 100000),
        githubUsername: `analyzer-user-${Date.now().toString(36)}`,
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

    // Create connected repository
    const repo = await prisma.repository.create({
      data: {
        organizationId: org.id,
        githubRepoId: BigInt(Math.floor(Math.random() * 10000000) + 100000),
        installationId: BigInt(123456),
        name: 'test-intelligence-repo',
        fullName: 'test-org/test-intelligence-repo',
        owner: 'test-org',
        htmlUrl: 'https://github.com/test-org/test-intelligence-repo',
        defaultBranch: 'main',
        isConnected: true,
      },
    });
    repoId = repo.id;

    // Create a mock past completed run with tasks
    const run = await prisma.agentRun.create({
      data: {
        repositoryId: repo.id,
        triggerType: 'MANUAL',
        status: 'SUCCESS',
        summary: 'Architecture analysis complete with 2 tasks.',
        metadata: {
          languages: { TypeScript: 90, JSON: 10 },
          frameworks: ['React', 'Express'],
          projectType: 'Node.js App',
          totalFiles: 20,
          testFrameworks: ['Vitest'],
          hasDocumentation: true,
          hasCi: false,
          entryPoints: ['src/server.ts'],
          modules: [],
        },
        tasks: {
          create: [
            {
              title: 'Add unit tests for payment webhook',
              description: 'Payment webhook lacks test assertions.',
              status: 'PENDING',
              order: 1,
              priority: 'HIGH',
              category: 'TEST_COVERAGE',
              estimatedComplexity: 'S',
              relevantFiles: ['src/routes/payment.ts'],
              evidence: 'No test file found for payment route.',
            },
            {
              title: 'Add README setup guide',
              description: 'README is empty.',
              status: 'PENDING',
              order: 2,
              priority: 'LOW',
              category: 'DOCUMENTATION',
              estimatedComplexity: 'XS',
              relevantFiles: ['README.md'],
              evidence: 'Empty README file.',
            },
          ],
        },
      },
    });
    runId = run.id;
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

  afterAll(async () => {
    await analysisQueueService.close();
  });

  it('rejects unauthenticated requests to analysis endpoints', async () => {
    const postRes = await request(app).post(`/api/repositories/${repoId}/analyze`);
    expect(postRes.status).toBe(401);

    const getRes = await request(app).get(`/api/repositories/${repoId}/analysis`);
    expect(getRes.status).toBe(401);

    const taskRes = await request(app).get(`/api/repositories/${repoId}/tasks`);
    expect(taskRes.status).toBe(401);

    const runRes = await request(app).get(`/api/agent-runs/${runId}`);
    expect(runRes.status).toBe(401);
  });

  it('enforces tenant isolation (other organization cannot access analysis)', async () => {
    const res = await request(app)
      .get(`/api/repositories/${repoId}/analysis`)
      .set('Cookie', otherSessionCookie);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('retrieves analysis overview and task count correctly', async () => {
    const res = await request(app)
      .get(`/api/repositories/${repoId}/analysis`)
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.repositoryId).toBe(repoId);
    expect(res.body.data.totalTasks).toBe(2);
    expect(res.body.data.tasksByPriority.HIGH).toBe(1);
    expect(res.body.data.tasksByPriority.LOW).toBe(1);
    expect(res.body.data.architecture.frameworks).toContain('React');
  });

  it('retrieves prioritized task backlog', async () => {
    const res = await request(app)
      .get(`/api/repositories/${repoId}/tasks`)
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].title).toBe('Add unit tests for payment webhook');
    expect(res.body.data[0].priority).toBe('HIGH');
  });

  it('retrieves detailed agent run breakdown', async () => {
    const res = await request(app)
      .get(`/api/agent-runs/${runId}`)
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(runId);
    expect(res.body.data.tasks).toHaveLength(2);
  });

  it('triggers analysis and dispatches BullMQ job', async () => {
    const res = await request(app)
      .post(`/api/repositories/${repoId}/analyze`)
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('QUEUED');
    expect(res.body.data.runId).toBeDefined();

    // Verify duplicate active run prevention
    const duplicateRes = await request(app)
      .post(`/api/repositories/${repoId}/analyze`)
      .set('Cookie', sessionCookie);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe('CONFLICT');
    expect(duplicateRes.body.error.message).toContain('already queued');
  });
});
