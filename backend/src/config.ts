import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(86400),
  AUTH_CODE_TTL_SECONDS: z.coerce.number().default(300),
  CONSENT_TTL_DAYS: z.coerce.number().default(90),

  CONSENT_UI_URL: z.string().url().default('http://localhost:3000/consent'),

  CORE_BANKING_URL: z.string().url().default('http://localhost:8081'),
  CORE_BANKING_API_KEY: z.string().default(''),
  CORE_BANKING_ADAPTER: z.enum(['http', 'memory']).default('http'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(60),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
