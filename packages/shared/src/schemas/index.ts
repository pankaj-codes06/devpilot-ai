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

export const prioritizedTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string(),
  module: z.string().default('Unassigned'),
  relevantFiles: z.array(z.string()),
  evidence: z.string(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  category: z.enum([
    'BUG_RISK',
    'TEST_COVERAGE',
    'DUPLICATION',
    'DOCUMENTATION',
    'TECH_DEBT',
    'SECURITY',
  ]),
  estimatedComplexity: z.enum(['XS', 'S', 'M', 'L', 'XL']),
  expectedBenefit: z.string(),
  suggestedApproach: z.string(),
  requiredTests: z.string(),
});

export const codebaseAnalysisOutputSchema = z.object({
  summary: z.string(),
  architecture: z.object({
    overview: z.string(),
    primaryLanguages: z.array(z.string()),
    detectedFrameworks: z.array(z.string()),
    projectStructure: z.string(),
  }),
  tasks: z.array(prioritizedTaskSchema),
});

export type PrioritizedTaskInput = z.infer<typeof prioritizedTaskSchema>;
export type CodebaseAnalysisOutput = z.infer<typeof codebaseAnalysisOutputSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  repositoryId: z.string().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50),
  description: z.string().max(300).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code')
    .default('#3b82f6'),
  leadName: z.string().max(100).optional(),
  leadEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
});

export const mapModuleSchema = z.object({
  name: z.string().min(2).max(100),
  pathPattern: z.string().min(1, 'Path pattern is required'),
  teamId: z.string().nullable().optional(),
  description: z.string().max(300).optional(),
  isShared: z.boolean().default(false),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50).optional(),
  description: z.string().max(300).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex code')
    .optional(),
  leadName: z.string().max(100).optional(),
  leadEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
});

export const updateModuleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  pathPattern: z.string().min(1, 'Path pattern is required').optional(),
  teamId: z.string().nullable().optional(),
  description: z.string().max(300).optional(),
  isShared: z.boolean().optional(),
});



