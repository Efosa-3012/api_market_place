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
  CONSENT_REQUEST_TTL_MINUTES: z.coerce.number().positive().default(15),
  // Demo customer whose accounts back developer sandbox tokens (must exist in core banking).
  SANDBOX_CUSTOMER_ID: z.string().default('customer-demo-001'),

  // The seeded sample fintech app. /demo/* acts as that app's own backend so the
  // browser never holds its secret.
  DEMO_CLIENT_ID: z.string().default('budgetbuddy'),
  // Hosting the sample app is an explicit choice, never an accident: a real
  // deployment leaves this off and /demo/* returns 404.
  DEMO_SAMPLE_APP: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // Bank login lockout: after this many failures the username is locked for this long.
  LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

  CONSENT_UI_URL: z.string().url().default('http://localhost:3000/consent'),

  // Browser origins allowed to call us (consent UI, portal, dashboard, sample app).
  // Server-to-server partner calls send no Origin header and are unaffected.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),

  CORE_BANKING_URL: z.string().url().default('http://localhost:8081'),
  CORE_BANKING_API_KEY: z.string().default(''),
  CORE_BANKING_ADAPTER: z.enum(['http', 'memory']).default('http'),

  // Per-client quota on /api/v1/*. Keyed by client_id, not IP.
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  // Per-IP limit on the unauthenticated endpoints that write or check secrets:
  // /oauth/* and /bank/login. Stops consent-row flooding and credential stuffing.
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  // Shared secret for the analytics dashboard, sent as X-Admin-Key. MVP-grade:
  // in production these endpoints sit behind the bank's staff SSO.
  ADMIN_KEY: z.string().min(16, 'ADMIN_KEY must be at least 16 characters'),
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

// A production process must never run on the secrets shipped in .env.example / compose.
if (config.NODE_ENV === 'production') {
  const leaks = ([
    ['JWT_SECRET', config.JWT_SECRET],
    ['ADMIN_KEY', config.ADMIN_KEY],
  ] as const).filter(([, v]) => /change-me|dev-only|^test-/i.test(v));
  if (leaks.length > 0) {
    console.error(`Refusing to start in production with placeholder secrets: ${leaks.map(([k]) => k).join(', ')}`);
    process.exit(1);
  }
}
export type Config = typeof config;
