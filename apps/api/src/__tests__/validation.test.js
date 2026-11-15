import { describe, it, expect } from 'vitest';
import {
  connectRepositorySchema,
  updateAgentSettingsSchema,
  DEFAULT_TIMEZONE,
} from '@devpilot/shared';

describe('Zod Validation Schemas', () => {
  describe('connectRepositorySchema', () => {
    it('accepts valid repository and installation IDs', () => {
      const valid = { githubRepoId: 12345678, installationId: 987654 };
      const result = connectRepositorySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects missing or non-positive IDs', () => {
      expect(connectRepositorySchema.safeParse({}).success).toBe(false);
      expect(
        connectRepositorySchema.safeParse({ githubRepoId: -1, installationId: 100 })
          .success
      ).toBe(false);
      expect(
        connectRepositorySchema.safeParse({ githubRepoId: 100, installationId: 0 })
          .success
      ).toBe(false);
    });
  });

  describe('updateAgentSettingsSchema', () => {
    it('accepts valid agent settings updates', () => {
      const valid = {
        isEnabled: true,
        scheduleCron: '0 10 * * 1-5',
        timezone: DEFAULT_TIMEZONE,
        branchPrefix: 'devpilot/',
        allowedPaths: ['src/**'],
        excludedPaths: ['.github/**'],
        maxDailyRuns: 5,
        requirePrReview: true,
      };
      const result = updateAgentSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid timezones', () => {
      const invalid = { timezone: 'Mars/Phobos' };
      const result = updateAgentSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid branch prefix containing invalid characters', () => {
      const invalid = { branchPrefix: 'invalid prefix with spaces!' };
      const result = updateAgentSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
