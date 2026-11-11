import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root if not already loaded
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // GitHub OAuth App
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),

  // GitHub App
  GITHUB_APP_ID: z.coerce.number().optional().default(0),
  GITHUB_APP_PRIVATE_KEY: z.string().optional().default(''),
  GITHUB_APP_SLUG: z.string().optional().default('devpilot-ai'),
  GITHUB_WEBHOOK_SECRET: z.string().optional().default(''),

  // Application Secrets and URLs
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters').default('devpilot_session_secret_default_key_32chars!'),
  APP_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:4000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
});

export const env = envSchema.parse(process.env);

