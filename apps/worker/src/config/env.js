import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  // GitHub App credentials
  GITHUB_APP_ID: z.coerce.number().optional().default(0),
  GITHUB_APP_PRIVATE_KEY: z.string().optional().default(''),
  GITHUB_APP_SLUG: z.string().optional().default('devpilot-ai'),
  GITHUB_WEBHOOK_SECRET: z.string().optional().default(''),

  // LLM Providers (Optional - falls back to heuristic static engine if omitted)
  GEMINI_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),

  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  WORKER_CONCURRENCY: z.coerce.number().default(2),
});

export const env = envSchema.parse(process.env);
