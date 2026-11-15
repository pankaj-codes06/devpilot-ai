import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIMEZONE,
  SUPPORTED_TIMEZONES,
  DEFAULT_SCHEDULE_CRON,
  DEFAULT_BRANCH_PREFIX,
  DEFAULT_MAX_DAILY_RUNS,
  AUTH_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  INSTALL_STATE_COOKIE_NAME,
  ACTIVE_ORG_COOKIE_NAME,
  REPOSITORY_ANALYSIS_QUEUE,
  connectRepositorySchema,
  syncRepositoriesSchema,
  updateAgentSettingsSchema,
  prioritizedTaskSchema,
  codebaseAnalysisOutputSchema,
  createProjectSchema,
  createTeamSchema,
  mapModuleSchema,
  updateTeamSchema,
  updateModuleSchema,
} from '../index.js';

describe('@devpilot/shared — JavaScript Module Verification', () => {
  describe('Constants & Configuration', () => {
    it('exports correct system default timezone and supported timezone list', () => {
      expect(DEFAULT_TIMEZONE).toBe('Asia/Kolkata');
      expect(Array.isArray(SUPPORTED_TIMEZONES)).toBe(true);
      expect(SUPPORTED_TIMEZONES).toContain('Asia/Kolkata');
      expect(SUPPORTED_TIMEZONES).toContain('UTC');
      expect(SUPPORTED_TIMEZONES).toContain('America/New_York');
    });

    it('exports expected scheduler and agent defaults', () => {
      expect(DEFAULT_SCHEDULE_CRON).toBe('0 9 * * 1-5');
      expect(DEFAULT_BRANCH_PREFIX).toBe('devpilot/');
      expect(DEFAULT_MAX_DAILY_RUNS).toBe(3);
    });

    it('exports standardized cookie and queue names', () => {
      expect(AUTH_COOKIE_NAME).toBe('devpilot_session');
      expect(OAUTH_STATE_COOKIE_NAME).toBe('devpilot_oauth_state');
      expect(INSTALL_STATE_COOKIE_NAME).toBe('devpilot_install_state');
      expect(ACTIVE_ORG_COOKIE_NAME).toBe('devpilot_active_org');
      expect(REPOSITORY_ANALYSIS_QUEUE).toBe('repository-analysis');
    });
  });

  describe('Repository Schemas', () => {
    it('validates connectRepositorySchema correctly', () => {
      const valid = { githubRepoId: 101, installationId: 202 };
      const parsed = connectRepositorySchema.safeParse(valid);
      expect(parsed.success).toBe(true);

      const invalid = { githubRepoId: -1, installationId: 'abc' };
      expect(connectRepositorySchema.safeParse(invalid).success).toBe(false);
    });

    it('validates syncRepositoriesSchema correctly', () => {
      expect(syncRepositoriesSchema.safeParse({}).success).toBe(true);
      expect(syncRepositoriesSchema.safeParse({ installationId: 50 }).success).toBe(true);
      expect(syncRepositoriesSchema.safeParse({ repositoryIds: [1, 2, 3] }).success).toBe(true);
      expect(syncRepositoriesSchema.safeParse({ repositoryIds: [-5] }).success).toBe(false);
    });

    it('validates updateAgentSettingsSchema correctly', () => {
      const validSettings = {
        isEnabled: true,
        scheduleCron: '0 12 * * *',
        timezone: 'UTC',
        branchPrefix: 'devpilot/bot-',
        allowedPaths: ['src/**'],
        excludedPaths: ['.env*'],
        maxDailyRuns: 5,
        requirePrReview: true,
      };
      expect(updateAgentSettingsSchema.safeParse(validSettings).success).toBe(true);

      // Rejects invalid timezone
      expect(updateAgentSettingsSchema.safeParse({ timezone: 'Invalid/Zone' }).success).toBe(false);

      // Rejects invalid branchPrefix with spaces
      expect(updateAgentSettingsSchema.safeParse({ branchPrefix: 'invalid branch' }).success).toBe(false);

      // Rejects maxDailyRuns out of range
      expect(updateAgentSettingsSchema.safeParse({ maxDailyRuns: 100 }).success).toBe(false);
    });
  });

  describe('Intelligence & Task Schemas', () => {
    it('validates prioritizedTaskSchema correctly', () => {
      const validTask = {
        title: 'Refactor Auth Controller',
        description: 'Decouple token exchange logic',
        module: 'Authentication',
        relevantFiles: ['apps/api/src/controllers/auth.controller.js'],
        evidence: 'High cyclomatic complexity in login method',
        priority: 'HIGH',
        category: 'TECH_DEBT',
        estimatedComplexity: 'M',
        expectedBenefit: 'Improves maintainability and testability',
        suggestedApproach: 'Extract OAuth flow to service',
        requiredTests: 'Unit test auth controller responses',
      };
      const parsed = prioritizedTaskSchema.safeParse(validTask);
      expect(parsed.success).toBe(true);

      // Rejects task with invalid priority
      const invalid = { ...validTask, priority: 'SUPER_CRITICAL' };
      expect(prioritizedTaskSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates codebaseAnalysisOutputSchema correctly', () => {
      const validOutput = {
        summary: 'Full-stack Node.js and React monorepo',
        architecture: {
          overview: 'Microservices and monolithic hybrid',
          primaryLanguages: ['JavaScript', 'HTML', 'CSS'],
          detectedFrameworks: ['Express', 'React'],
          projectStructure: 'Standard monorepo layout',
        },
        tasks: [
          {
            title: 'Add Health Check',
            description: 'Provide system uptime endpoint',
            module: 'API',
            relevantFiles: ['server.js'],
            evidence: 'Missing /health route',
            priority: 'LOW',
            category: 'DOCUMENTATION',
            estimatedComplexity: 'S',
            expectedBenefit: 'Monitoring support',
            suggestedApproach: 'Add express health handler',
            requiredTests: 'GET /health returns 200',
          },
        ],
      };
      expect(codebaseAnalysisOutputSchema.safeParse(validOutput).success).toBe(true);
    });
  });

  describe('Hybrid Projects & Team Schemas', () => {
    it('validates createProjectSchema correctly', () => {
      expect(createProjectSchema.safeParse({ name: 'Ecommerce Platform' }).success).toBe(true);
      expect(createProjectSchema.safeParse({ name: 'E' }).success).toBe(false); // Min 2 chars
    });

    it('validates createTeamSchema and color hex formatting', () => {
      const validTeam = {
        name: 'Backend Core',
        description: 'Core API development team',
        color: '#10b981',
        leadName: 'Alice Dev',
        leadEmail: 'alice@example.com',
      };
      expect(createTeamSchema.safeParse(validTeam).success).toBe(true);

      // Rejects invalid hex color
      expect(createTeamSchema.safeParse({ name: 'Bad Color Team', color: 'red' }).success).toBe(false);
      expect(createTeamSchema.safeParse({ name: 'Bad Color Team', color: '#GGG123' }).success).toBe(false);

      // Rejects invalid email
      expect(createTeamSchema.safeParse({ name: 'Bad Email', leadEmail: 'not-an-email' }).success).toBe(false);
    });

    it('validates mapModuleSchema correctly', () => {
      const validModule = {
        name: 'Authentication Module',
        pathPattern: 'apps/api/src/auth/**',
        teamId: 'team_cuid123',
        description: 'Handles OAuth and sessions',
        isShared: false,
      };
      expect(mapModuleSchema.safeParse(validModule).success).toBe(true);

      // Rejects missing pathPattern
      expect(mapModuleSchema.safeParse({ name: 'No Pattern' }).success).toBe(false);
    });

    it('validates updateTeamSchema and updateModuleSchema partial inputs', () => {
      expect(updateTeamSchema.safeParse({ color: '#f59e0b' }).success).toBe(true);
      expect(updateModuleSchema.safeParse({ isShared: true }).success).toBe(true);
      expect(updateModuleSchema.safeParse({ pathPattern: 'packages/shared/**' }).success).toBe(true);
    });
  });
});
