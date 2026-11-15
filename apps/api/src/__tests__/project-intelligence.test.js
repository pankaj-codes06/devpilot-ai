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
import { ProjectService } from '../services/project.service.js';
import { projectStorageService } from '../services/project-storage.service.js';

const execFileAsync = promisify(execFile);

describe('Project Intelligence & Automated Team Mapping (Phase 3)', () => {
  const app = createApp();
  let orgId;
  let otherOrgId;
  let userId;
  let otherUserId;
  let sessionCookie;
  let otherSessionCookie;
  let projectId;

  let testTempDir;
  let testZipBuffer;

  beforeAll(async () => {
    testTempDir = path.join(os.tmpdir(), `devpilot-intel-test-${Date.now().toString(36)}`);
    await fs.mkdir(testTempDir, { recursive: true });

    // Build a realistic hybrid monorepo structure
    const srcDir = path.join(testTempDir, 'sample-monorepo');
    await fs.mkdir(path.join(srcDir, 'apps/web/src/components'), { recursive: true });
    await fs.mkdir(path.join(srcDir, 'apps/api/src/routes'), { recursive: true });
    await fs.mkdir(path.join(srcDir, 'apps/api/src/controllers'), { recursive: true });
    await fs.mkdir(path.join(srcDir, 'packages/database/prisma'), { recursive: true });
    await fs.mkdir(path.join(srcDir, 'packages/shared/src'), { recursive: true });
    await fs.mkdir(path.join(srcDir, '.github/workflows'), { recursive: true });
    await fs.mkdir(path.join(srcDir, 'tests'), { recursive: true });

    // Root package.json
    await fs.writeFile(
      path.join(srcDir, 'package.json'),
      JSON.stringify({
        name: 'fullstack-saas',
        version: '1.0.0',
        dependencies: {
          react: '^18.3.1',
          express: '^4.19.2',
          prisma: '^5.14.0',
          tailwindcss: '^3.4.3',
        },
        devDependencies: {
          vitest: '^1.6.0',
          typescript: '^5.4.5',
        },
      })
    );

    // Readme & CI
    await fs.writeFile(
      path.join(srcDir, 'README.md'),
      '# Fullstack SaaS Project\nComprehensive architecture overview and installation instructions.'
    );
    await fs.writeFile(
      path.join(srcDir, '.github/workflows/ci.yml'),
      'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n'
    );

    // Frontend UI
    await fs.writeFile(
      path.join(srcDir, 'apps/web/src/components/Navbar.tsx'),
      'export function Navbar() { return <nav>Navigation</nav>; }'
    );
    await fs.writeFile(
      path.join(srcDir, 'apps/web/src/App.tsx'),
      'export default function App() { return <div>App</div>; }'
    );

    // Backend API
    await fs.writeFile(
      path.join(srcDir, 'apps/api/src/routes/users.ts'),
      'import express from "express"; export const router = express.Router();'
    );
    await fs.writeFile(
      path.join(srcDir, 'apps/api/src/controllers/user.controller.ts'),
      'export class UserController { static async getProfile() {} }'
    );
    await fs.writeFile(
      path.join(srcDir, 'apps/api/src/server.ts'),
      'import express from "express"; const app = express();'
    );

    // Database & Schemas
    await fs.writeFile(
      path.join(srcDir, 'packages/database/prisma/schema.prisma'),
      'datasource db { provider = "postgresql" url = env("DATABASE_URL") }'
    );

    // Shared library
    await fs.writeFile(
      path.join(srcDir, 'packages/shared/src/index.ts'),
      'export const APP_NAME = "FullstackSaas";'
    );

    // Tests
    await fs.writeFile(
      path.join(srcDir, 'tests/user.test.ts'),
      'describe("users", () => { it("works", () => {}); });'
    );

    const zipFilePath = path.join(testTempDir, 'monorepo.zip');
    await execFileAsync('/usr/bin/zip', ['-r', '-q', zipFilePath, '.'], { cwd: srcDir });
    testZipBuffer = await fs.readFile(zipFilePath);
  });

  afterAll(async () => {
    if (testTempDir && fsSync.existsSync(testTempDir)) {
      await fs.rm(testTempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  beforeEach(async () => {
    // 1. Setup primary Organization and User
    const org = await prisma.organization.create({
      data: {
        name: 'Alpha Engineering Org',
        slug: `alpha-eng-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        githubId: BigInt(Math.floor(Math.random() * 10000000) + 1000000),
        githubUsername: `alpha-lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: 'Alpha Lead Engineer',
        email: `alpha-lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@devpilot.test`,
      },
    });
    userId = user.id;

    await prisma.teamMember.create({
      data: {
        organizationId: orgId,
        userId,
        role: 'OWNER',
      },
    });

    const sessionToken = signSessionPayload({
      userId,
      githubUsername: user.githubUsername,
      currentOrganizationId: orgId,
      role: 'OWNER',
    });
    sessionCookie = `${AUTH_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`;

    // 2. Setup secondary isolated Organization for multi-tenant checks
    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Beta Security Org',
        slug: `beta-sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      },
    });
    otherOrgId = otherOrg.id;

    const otherUser = await prisma.user.create({
      data: {
        githubId: BigInt(Math.floor(Math.random() * 10000000) + 2000000),
        githubUsername: `beta-lead-${Date.now().toString(36)}`,
        name: 'Beta Lead',
      },
    });
    otherUserId = otherUser.id;

    await prisma.teamMember.create({
      data: {
        organizationId: otherOrgId,
        userId: otherUserId,
        role: 'OWNER',
      },
    });

    const otherToken = signSessionPayload({
      userId: otherUserId,
      githubUsername: otherUser.githubUsername,
      currentOrganizationId: otherOrgId,
      role: 'OWNER',
    });
    otherSessionCookie = `${AUTH_COOKIE_NAME}=${otherToken}; Path=/; HttpOnly; SameSite=Lax`;

    // 3. Upload project ZIP to create Project and extracted Version 1
    const project = await ProjectService.createProjectFromZip(
      orgId,
      userId,
      {
        name: 'Cloud SaaS Platform',
        description: 'Multi-service monorepo application',
      },
      testZipBuffer
    );
    projectId = project.id;
  });

  afterEach(async () => {
    // Delete projects and files
    if (projectId) {
      await projectStorageService.deleteProjectStorage(projectId).catch(() => {});
    }
    await prisma.project.deleteMany({ where: { organizationId: { in: [orgId, otherOrgId] } } }).catch(() => {});
    await prisma.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } }).catch(() => {});
  });

  describe('Project Intelligence Analysis Engine', () => {
    it('analyzes extracted ZIP workspace without requiring GitHub connection', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/analyze`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { summary, report, tasks } = res.body.data;
      expect(summary).toBeDefined();
      expect(summary.totalFiles).toBeGreaterThanOrEqual(8);
      expect(summary.languages['TypeScript']).toBeGreaterThan(0);
      expect(summary.frameworks).toContain('React');
      expect(summary.frameworks).toContain('Express');
      expect(summary.frameworks).toContain('Prisma ORM');
      expect(summary.frameworks).toContain('Vitest');
      expect(summary.hasCi).toBe(true);
      expect(summary.hasDocumentation).toBe(true);

      expect(report).toBeDefined();
      expect(tasks).toBeInstanceOf(Array);
      expect(tasks.length).toBeGreaterThan(0);

      // Verify task fields are grounded and populated
      const firstTask = tasks[0];
      expect(firstTask.title).toBeDefined();
      expect(firstTask.description).toBeDefined();
      expect(firstTask.priority).toBeDefined();
      expect(firstTask.category).toBeDefined();
      expect(firstTask.relevantFiles.length).toBeGreaterThan(0);
      expect(firstTask.projectId).toBe(projectId);

      // Verify PostgreSQL persistence in ProjectVersion.metadata
      const version = await prisma.projectVersion.findFirst({
        where: { projectId },
      });
      expect(version?.status).toBe('READY');
      expect(version?.metadata).toBeDefined();
      const meta = version?.metadata;
      expect(meta.languages['TypeScript']).toBeGreaterThan(0);

      // Verify DevelopmentTask records in database
      const dbTasks = await prisma.developmentTask.findMany({
        where: { projectId },
      });
      expect(dbTasks.length).toBe(tasks.length);
    });

    it('retrieves architecture overview and task metrics via GET /api/projects/:id/analysis', async () => {
      // First run analysis
      await request(app)
        .post(`/api/projects/${projectId}/analyze`)
        .set('Cookie', sessionCookie);

      const res = await request(app)
        .get(`/api/projects/${projectId}/analysis`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const overview = res.body.data;
      expect(overview.projectId).toBe(projectId);
      expect(overview.projectName).toBe('Cloud SaaS Platform');
      expect(overview.activeVersionNumber).toBe(1);
      expect(overview.status).toBe('READY');
      expect(overview.architecture.frameworks).toContain('React');
      expect(overview.metrics.totalFiles).toBeGreaterThanOrEqual(8);
      expect(overview.metrics.totalTasks).toBeGreaterThan(0);
      expect(overview.metrics.tasksByPriority).toBeDefined();
    });

    it('retrieves development tasks with priority and category filters via GET /api/projects/:id/tasks', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/analyze`)
        .set('Cookie', sessionCookie);

      // Get all tasks
      const allRes = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .set('Cookie', sessionCookie);

      expect(allRes.status).toBe(200);
      expect(allRes.body.data.length).toBeGreaterThan(0);

      // Filter by category
      const filteredRes = await request(app)
        .get(`/api/projects/${projectId}/tasks?category=TEST_COVERAGE`)
        .set('Cookie', sessionCookie);

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.data.every((t) => t.category === 'TEST_COVERAGE')).toBe(true);
    });
  });

  describe('Automated Team & Module Suggestions', () => {
    it('automatically suggests teams and modules based on monorepo layout', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/modules/suggest`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { teams, modules } = res.body.data;

      // Check suggested teams
      const teamNames = teams.map((t) => t.name);
      expect(teamNames).toContain('Frontend Team');
      expect(teamNames).toContain('Backend API Team');
      expect(teamNames).toContain('DevOps & QA Team');
      expect(teamNames).toContain('Core & Data Team');

      // Check suggested modules
      const modPatterns = modules.map((m) => m.pathPattern);
      expect(modPatterns).toContain('apps/web/**');
      expect(modPatterns).toContain('apps/api/**');
      expect(modPatterns).toContain('packages/database/**');
      expect(modPatterns).toContain('packages/shared/**');
      expect(modPatterns).toContain('*.json');

      // Verify shared flag on shared modules
      const sharedMod = modules.find((m) => m.pathPattern === 'packages/shared/**');
      expect(sharedMod.isShared).toBe(true);

      const rootConfigMod = modules.find((m) => m.pathPattern === '*.json');
      expect(rootConfigMod.isShared).toBe(true);

      // Verify unshared flag on team-specific modules
      const webMod = modules.find((m) => m.pathPattern === 'apps/web/**');
      expect(webMod.isShared).toBe(false);
      expect(webMod.teamName).toBe('Frontend Team');
    });

    it('reconciles existing development tasks with newly suggested modules and teams', async () => {
      // 1. Run analysis first to create tasks
      await request(app)
        .post(`/api/projects/${projectId}/analyze`)
        .set('Cookie', sessionCookie);

      // 2. Run suggestions to map modules and teams
      await request(app)
        .post(`/api/projects/${projectId}/modules/suggest`)
        .set('Cookie', sessionCookie);

      // 3. Inspect tasks to verify team and module linkage
      const tasksRes = await request(app)
        .get(`/api/projects/${projectId}/tasks`)
        .set('Cookie', sessionCookie);

      const tasks = tasksRes.body.data;
      const linkedTasks = tasks.filter((t) => t.moduleId !== null || t.teamId !== null);
      expect(linkedTasks.length).toBeGreaterThan(0);
    });
  });

  describe('Team Management CRUD', () => {
    it('creates, reads, updates, and deletes teams', async () => {
      // 1. Create Team
      const createRes = await request(app)
        .post(`/api/projects/${projectId}/teams`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Mobile App Team',
          description: 'React Native iOS and Android development',
          color: '#ec4899',
          leadName: 'Sarah Connor',
          leadEmail: 'sarah@example.com',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.name).toBe('Mobile App Team');
      expect(createRes.body.data.slug).toContain('mobile-app-team');
      expect(createRes.body.data.color).toBe('#ec4899');
      const teamId = createRes.body.data.id;

      // 2. List Teams
      const listRes = await request(app)
        .get(`/api/projects/${projectId}/teams`)
        .set('Cookie', sessionCookie);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((t) => t.id === teamId)).toBe(true);

      // 3. Get Team by ID
      const getRes = await request(app)
        .get(`/api/projects/${projectId}/teams/${teamId}`)
        .set('Cookie', sessionCookie);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.leadName).toBe('Sarah Connor');

      // 4. Update Team
      const updateRes = await request(app)
        .put(`/api/projects/${projectId}/teams/${teamId}`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Mobile & Wearables Team',
          color: '#f43f5e',
          leadName: 'John Connor',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Mobile & Wearables Team');
      expect(updateRes.body.data.color).toBe('#f43f5e');
      expect(updateRes.body.data.leadName).toBe('John Connor');

      // 5. Delete Team
      const deleteRes = await request(app)
        .delete(`/api/projects/${projectId}/teams/${teamId}`)
        .set('Cookie', sessionCookie);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.deleted).toBe(true);

      // Verify deletion
      const verifyRes = await request(app)
        .get(`/api/projects/${projectId}/teams/${teamId}`)
        .set('Cookie', sessionCookie);
      expect(verifyRes.status).toBe(404);
    });
  });

  describe('Module Ownership & Conflict Detection', () => {
    let teamAId;
    let teamBId;

    beforeEach(async () => {
      const teamA = await prisma.team.create({
        data: {
          organizationId: orgId,
          projectId,
          name: 'Team Alpha',
          slug: 'team-alpha',
          color: '#3b82f6',
        },
      });
      teamAId = teamA.id;

      const teamB = await prisma.team.create({
        data: {
          organizationId: orgId,
          projectId,
          name: 'Team Bravo',
          slug: 'team-bravo',
          color: '#10b981',
        },
      });
      teamBId = teamB.id;
    });

    it('creates and lists module mappings successfully', async () => {
      const createRes = await request(app)
        .post(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Billing Module',
          description: 'Payment integration and invoices',
          pathPattern: 'apps/api/src/billing/**',
          teamId: teamAId,
          isShared: false,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.name).toBe('Billing Module');
      expect(createRes.body.data.teamName).toBe('Team Alpha');

      const listRes = await request(app)
        .get(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((m) => m.name === 'Billing Module')).toBe(true);
    });

    it('detects and rejects conflicting module ownership across different teams', async () => {
      // 1. Team Alpha claims 'apps/api/**' as private (isShared: false)
      const firstRes = await request(app)
        .post(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Backend API Base',
          pathPattern: 'apps/api/**',
          teamId: teamAId,
          isShared: false,
        });

      expect(firstRes.status).toBe(201);

      // 2. Team Bravo tries to claim 'apps/api/src/routes/**' as private
      // This is a conflicting overlap across different teams!
      const conflictRes = await request(app)
        .post(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Bravo Routes',
          pathPattern: 'apps/api/src/routes/**',
          teamId: teamBId,
          isShared: false,
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.error.code).toBe('MODULE_CONFLICT');
      expect(conflictRes.body.error.message).toContain('conflicts with');
    });

    it('allows overlapping patterns when module is marked as shared (isShared: true)', async () => {
      // 1. Team Alpha claims 'packages/shared/**' as private
      await request(app)
        .post(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Core Types',
          pathPattern: 'packages/shared/**',
          teamId: teamAId,
          isShared: false,
        });

      // 2. Team Bravo adds a shared sub-module with isShared: true
      const sharedRes = await request(app)
        .post(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Shared Contracts',
          pathPattern: 'packages/shared/src/contracts/**',
          teamId: teamBId,
          isShared: true, // explicitly shared
        });

      expect(sharedRes.status).toBe(201);
      expect(sharedRes.body.data.isShared).toBe(true);
    });

    it('prevents updating a module into a conflict with another team', async () => {
      // Team Alpha claims 'src/auth/**'
      await request(app)
        .post(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Alpha Auth',
          pathPattern: 'src/auth/**',
          teamId: teamAId,
          isShared: false,
        });

      // Team Bravo creates 'src/billing/**'
      const bravoRes = await request(app)
        .post(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Bravo Billing',
          pathPattern: 'src/billing/**',
          teamId: teamBId,
          isShared: false,
        });

      const bravoModuleId = bravoRes.body.data.id;

      // Update Bravo module to collide with Team Alpha's pattern
      const updateRes = await request(app)
        .put(`/api/projects/${projectId}/modules/${bravoModuleId}`)
        .set('Cookie', sessionCookie)
        .send({
          pathPattern: 'src/auth/**',
        });

      expect(updateRes.status).toBe(409);
      expect(updateRes.body.error.code).toBe('MODULE_CONFLICT');
    });

    it('allows manual deletion of a module', async () => {
      const createRes = await request(app)
        .post(`/api/projects/${projectId}/modules`)
        .set('Cookie', sessionCookie)
        .send({
          name: 'Temporary Mod',
          pathPattern: 'temp/**',
          isShared: true,
        });

      const moduleId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/projects/${projectId}/modules/${moduleId}`)
        .set('Cookie', sessionCookie);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.deleted).toBe(true);
    });
  });

  describe('Security & Multi-Tenant Isolation', () => {
    it('enforces multi-tenant isolation on analysis endpoints', async () => {
      // Other organization cannot analyze this project
      const analyzeRes = await request(app)
        .post(`/api/projects/${projectId}/analyze`)
        .set('Cookie', otherSessionCookie);

      expect(analyzeRes.status).toBe(404);

      // Other organization cannot get analysis
      const getRes = await request(app)
        .get(`/api/projects/${projectId}/analysis`)
        .set('Cookie', otherSessionCookie);

      expect(getRes.status).toBe(404);
    });

    it('enforces multi-tenant isolation on team and module endpoints', async () => {
      // Other organization cannot list teams
      const teamsRes = await request(app)
        .get(`/api/projects/${projectId}/teams`)
        .set('Cookie', otherSessionCookie);

      expect(teamsRes.status).toBe(404);

      // Other organization cannot create a team
      const createTeamRes = await request(app)
        .post(`/api/projects/${projectId}/teams`)
        .set('Cookie', otherSessionCookie)
        .send({ name: 'Hacker Team' });

      expect(createTeamRes.status).toBe(404);

      // Other organization cannot list modules
      const modulesRes = await request(app)
        .get(`/api/projects/${projectId}/modules`)
        .set('Cookie', otherSessionCookie);

      expect(modulesRes.status).toBe(404);
    });

    it('rejects unauthenticated requests to Phase 3 endpoints with 401', async () => {
      const analyzeRes = await request(app).post(`/api/projects/${projectId}/analyze`);
      expect(analyzeRes.status).toBe(401);

      const teamsRes = await request(app).get(`/api/projects/${projectId}/teams`);
      expect(teamsRes.status).toBe(401);

      const modulesRes = await request(app).get(`/api/projects/${projectId}/modules`);
      expect(modulesRes.status).toBe(401);
    });
  });
});
