import { z } from 'zod';
import { SUPPORTED_TIMEZONES } from '../constants/index.js';

export const connectRepositorySchema = z.object({
  githubRepoId: z.number().int().positive('Valid GitHub repository ID is required'),
  installationId: z.number().int().positive('Valid GitHub installation ID is required'),
});

export const syncRepositoriesSchema = z.object({
  installationId: z.number().int().positive('Valid GitHub installation ID is required').optional(),
  repositoryIds: z.array(z.number().int().positive()).optional(),
});

export const updateAgentSettingsSchema = z.object({
  isEnabled: z.boolean().optional(),
  scheduleCron: z
    .string()
    .min(5, 'Cron expression must be at least 5 characters')
    .max(100)
    .optional(),
  timezone: z.enum(SUPPORTED_TIMEZONES).optional(),
  branchPrefix: z
    .string()
    .regex(/^[a-zA-Z0-9_\-/]+$/, 'Invalid branch prefix format')
    .max(50)
    .optional(),
  allowedPaths: z.array(z.string().min(1)).optional(),
  excludedPaths: z.array(z.string().min(1)).optional(),
  maxDailyRuns: z.number().int().min(1).max(20).optional(),
  requirePrReview: z.boolean().optional(),
});

export const updateRepositorySettingsSchema = z.object({
  agentSettings: updateAgentSettingsSchema.optional(),
});

export type ConnectRepositoryInput = z.infer<typeof connectRepositorySchema>;
export type SyncRepositoriesInput = z.infer<typeof syncRepositoriesSchema>;
export type UpdateAgentSettingsInput = z.infer<typeof updateAgentSettingsSchema>;

