import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { config } from './config.js';
import { coreBanking } from './core-banking/index.js';
import { pool } from './lib/db.js';
import { logger } from './lib/logger.js';
import { auditLog } from './middleware/auditLog.js';
import { correlationId } from './middleware/correlationId.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { publicRateLimit } from './middleware/rateLimit.js';
import { analyticsRouter } from './modules/analytics/routes.js';
import { oauthRouter } from './modules/auth/routes.js';
import { bankRouter } from './modules/bank/routes.js';
import { demoRouter } from './modules/demo/routes.js';
import { portalRouter } from './modules/portal/routes.js';
import { resourcesRouter } from './modules/resources/routes.js';

const openapiPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'openapi', 'openapi.yaml');

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Gateway layer: applies to everything -------------------------------
  app.use(correlationId);
  app.use(auditLog); // one api_calls row per request, on response finish
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ correlationId: req.correlationId }),
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );
  // Standard security headers. CSP is off because Swagger UI at /docs needs
  // inline scripts, and every other route returns JSON, where CSP adds nothing.
  app.use(helmet({ contentSecurityPolicy: false }));
  // Explicit browser allowlist — a bank API must never reflect arbitrary origins.
  app.use(
    cors({
      origin: config.CORS_ORIGINS,
      credentials: true,
      // Let browser clients (the portal sandbox) read the headers partners care about.
      exposedHeaders: ['X-Correlation-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After', 'WWW-Authenticate'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false })); // /oauth/token is form-encoded per RFC 6749

  // --- Health & docs -------------------------------------------------------
  app.get('/health', async (_req, res) => {
    const [db, core] = await Promise.all([
      pool.query('SELECT 1').then(() => true).catch(() => false),
      coreBanking.healthy(),
    ]);
    const ok = db && core;
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', checks: { database: db, core_banking: core } });
  });

  const openapiDoc = YAML.parse(readFileSync(openapiPath, 'utf8'));
  app.get('/openapi.yaml', (_req, res) => res.type('text/yaml').sendFile(openapiPath));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc, { customSiteTitle: 'Open Banking API Marketplace' }));

  // --- Modules -------------------------------------------------------------
  app.use('/oauth', publicRateLimit, oauthRouter); // partner-facing OAuth 2.0 endpoints
  app.use('/bank/login', publicRateLimit);
  app.use('/bank', bankRouter); // backend for the bank's own consent UI (login, approve, connected apps)
  app.use('/api/v1', resourcesRouter); // partner-facing resource APIs (token + consent enforced)
  app.use('/portal', portalRouter); // developer portal backend
  app.use('/analytics', analyticsRouter); // dashboard data
  // Stands in for the sample fintech app's own server — not part of the product,
  // and disabled outside development. See modules/demo/routes.ts.
  app.use('/demo', publicRateLimit, demoRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
