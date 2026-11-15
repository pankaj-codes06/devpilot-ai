import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  RepositoryAnalyzer,
  TeamSuggester,
  HeuristicStaticProvider,
  IntelligenceEngineFactory,
} from '../index.js';

describe('@devpilot/intelligence — JavaScript Module Verification', () => {
  let tempRepoDir;

  beforeEach(async () => {
    tempRepoDir = path.join(
      os.tmpdir(),
      `test-intel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    );
    await fs.mkdir(tempRepoDir, { recursive: true });

    // Mock structure
    await fs.mkdir(path.join(tempRepoDir, 'apps/web/src'), { recursive: true });
    await fs.mkdir(path.join(tempRepoDir, 'apps/api/src/routes'), { recursive: true });
    await fs.mkdir(path.join(tempRepoDir, 'packages/database/prisma'), { recursive: true });
    await fs.mkdir(path.join(tempRepoDir, 'packages/shared/src'), { recursive: true });
    await fs.mkdir(path.join(tempRepoDir, 'node_modules/fake'), { recursive: true });
    await fs.mkdir(path.join(tempRepoDir, '.git'), { recursive: true });

    await fs.writeFile(
      path.join(tempRepoDir, 'package.json'),
      JSON.stringify({
        name: 'test-monorepo',
        dependencies: {
          react: '^18.3.1',
          express: '^4.19.2',
          prisma: '^5.14.0',
        },
        devDependencies: {
          vitest: '^1.6.0',
        },
      })
    );

    await fs.writeFile(path.join(tempRepoDir, 'apps/web/src/App.tsx'), 'export default () => null;');
    await fs.writeFile(path.join(tempRepoDir, 'apps/api/src/routes/api.ts'), 'export const r = 1;');
    await fs.writeFile(path.join(tempRepoDir, 'packages/database/prisma/schema.prisma'), 'datasource db {}');
    await fs.writeFile(path.join(tempRepoDir, 'packages/shared/src/index.ts'), 'export const x = 1;');
    await fs.writeFile(path.join(tempRepoDir, 'README.md'), '# Full documentation for project.');
    await fs.writeFile(path.join(tempRepoDir, '.env'), 'SECRET_KEY=leaked');
    await fs.writeFile(path.join(tempRepoDir, 'node_modules/fake/index.js'), 'bad');
  });

  afterEach(async () => {
    await fs.rm(tempRepoDir, { recursive: true, force: true }).catch(() => {});
  });

  describe('RepositoryAnalyzer', () => {
    it('analyzes repository, detects frameworks, and sanitizes secrets', async () => {
      const result = await RepositoryAnalyzer.analyze(tempRepoDir);

      expect(result.summary.frameworks).toContain('React');
      expect(result.summary.frameworks).toContain('Express');
      expect(result.summary.frameworks).toContain('Prisma ORM');
      expect(result.summary.frameworks).toContain('Vitest');
      expect(result.summary.languages['TypeScript']).toBeGreaterThan(0);

      const filePaths = result.files.map((f) => f.relativePath);
      expect(filePaths).not.toContain('.env');
      expect(filePaths.some((p) => p.startsWith('node_modules/'))).toBe(false);
      expect(filePaths).toContain('apps/web/src/App.tsx');
      expect(filePaths).toContain('apps/api/src/routes/api.ts');
    });
  });

  describe('TeamSuggester', () => {
    it('generates automated team suggestions based on monorepo structure', async () => {
      const analysis = await RepositoryAnalyzer.analyze(tempRepoDir);
      const suggestions = TeamSuggester.suggest(analysis);

      expect(suggestions.teams.length).toBeGreaterThanOrEqual(4);
      const teamSlugs = suggestions.teams.map((t) => t.slug);
      expect(teamSlugs).toContain('frontend-team');
      expect(teamSlugs).toContain('backend-api-team');
      expect(teamSlugs).toContain('core-data-team');

      const modPatterns = suggestions.modules.map((m) => m.pathPattern);
      expect(modPatterns).toContain('apps/web/**');
      expect(modPatterns).toContain('apps/api/**');
      expect(modPatterns).toContain('packages/database/**');
      expect(modPatterns).toContain('packages/shared/**');

      // Shared package is flagged as shared
      const sharedMod = suggestions.modules.find((m) => m.pathPattern === 'packages/shared/**');
      expect(sharedMod.isShared).toBe(true);
    });

    it('detects and prevents conflicting module ownership across teams', () => {
      const existing = [
        {
          id: 'mod-1',
          name: 'API Core',
          pathPattern: 'apps/api/**',
          teamId: 'team-backend',
          isShared: false,
        },
      ];

      // Different team claiming a sub-path as private -> conflict!
      const conflict = TeamSuggester.detectConflict(existing, {
        name: 'API Routes',
        pathPattern: 'apps/api/src/routes/**',
        teamId: 'team-frontend',
        isShared: false,
      });

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.reason).toContain('conflicts with');

      // Marking as shared avoids conflict
      const safeShared = TeamSuggester.detectConflict(existing, {
        name: 'Shared Middleware',
        pathPattern: 'apps/api/src/middleware/**',
        teamId: 'team-frontend',
        isShared: true,
      });

      expect(safeShared.hasConflict).toBe(false);
    });
  });

  describe('Intelligence Providers & Factory', () => {
    it('generates grounded tasks using the deterministic static provider', async () => {
      const analysis = await RepositoryAnalyzer.analyze(tempRepoDir);
      const provider = new HeuristicStaticProvider();

      const output = await provider.analyze({
        repositoryName: 'test/repo',
        defaultBranch: 'main',
        analysis,
      });

      expect(output.summary).toBeDefined();
      expect(output.tasks.length).toBeGreaterThan(0);
      for (const task of output.tasks) {
        expect(task.title).toBeTruthy();
        expect(task.description).toBeTruthy();
        expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(task.priority);
        expect(task.relevantFiles.length).toBeGreaterThan(0);
      }
    });

    it('returns the Deterministic Static Analyzer when no API keys are provided', () => {
      const provider = IntelligenceEngineFactory.getProvider({});
      expect(provider.name).toBe('Deterministic Static Analyzer');
    });
  });
});
