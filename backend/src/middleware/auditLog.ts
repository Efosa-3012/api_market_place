import type { RequestHandler } from 'express';
import { pool } from '../lib/db.js';
import { logger } from '../lib/logger.js';

/**
 * The audit trail. One row in `api_calls` per request: who called, on whose
 * behalf, under which consent, when, and how it went. It is both the compliance
 * record and the data source for the analytics dashboard.
 *
 * Attribution prefers `req.auth` (the call passed every check) and falls back to
 * `req.audit`, which `authenticate` stamps before its status checks — so a call
 * rejected for a revoked consent is still attributed to the client that made it.
 *
 * The insert is fire-and-forget. A failed audit write must never break a
 * partner's call, so it is logged and swallowed.
 */
export const auditLog: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const method = req.method;
  // originalUrl is never rewritten by routers; the query string is dropped so
  // cursors and filters do not end up in the audit record.
  const path = req.originalUrl.split('?')[0] ?? req.originalUrl;

  res.on('finish', () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6);
    const who = req.auth
      ? { clientRowId: req.auth.clientRowId, consentId: req.auth.consentId, customerId: req.auth.customerId }
      : (req.audit ?? {});

    pool
      .query(
        `INSERT INTO api_calls
           (correlation_id, client_id, consent_id, customer_id, method, path,
            status_code, error_code, duration_ms, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          req.correlationId,
          who.clientRowId ?? null,
          who.consentId ?? null,
          who.customerId ?? null,
          method,
          path,
          res.statusCode,
          req.errorCode ?? null,
          durationMs,
          req.ip ?? null,
        ],
      )
      .catch((err) => logger.error({ err, correlationId: req.correlationId }, 'audit log insert failed'));
  });

  next();
};
