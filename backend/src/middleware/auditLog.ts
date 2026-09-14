import type { RequestHandler } from 'express';
import { pool } from '../lib/db.js';
import { logger } from '../lib/logger.js';

/**
 * Writes one api_calls row per request once the response finishes. This is
 * the audit trail (who / on whose behalf / under which consent / when) and the
 * source for the analytics dashboard. Failures are logged, never surfaced —
 * an audit write must not break a partner's call.
 */
export const auditLog: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    const auth = req.auth ?? req.audit;
    pool
      .query(
        `INSERT INTO api_calls
           (correlation_id, client_id, consent_id, customer_id, method, path, status_code, error_code, duration_ms, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          req.correlationId,
          auth?.clientRowId ?? null,
          auth?.consentId ?? null,
          auth?.customerId ?? null,
          req.method,
          req.originalUrl.split('?')[0],
          res.statusCode,
          req.errorCode ?? null,
          durationMs,
          req.ip ?? null,
        ],
      )
      .catch((err) => logger.error({ err }, 'failed to write audit log'));
  });

  next();
};
