import { timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { pool } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';

/**
 * Analytics dashboard data, derived from the api_calls and consents tables.
 *
 * This is the bank's control room: which partner is calling, on whose behalf,
 * how often, and what is failing. Everything here is plain SQL over the audit
 * trail written by the auditLog middleware.
 *
 * Not partner-facing. Guarded by a shared X-Admin-Key for the MVP; in
 * production these sit behind the bank's staff SSO.
 */
export const analyticsRouter = Router();

const requireAdminKey: RequestHandler = (req, _res, next) => {
  const supplied = req.header('x-admin-key');
  if (!supplied) return next(ApiError.unauthorized('admin_key_required', 'X-Admin-Key header is required'));
  // Constant-time compare so the key cannot be recovered byte by byte.
  const a = Buffer.from(supplied);
  const b = Buffer.from(config.ADMIN_KEY);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return next(ApiError.unauthorized('invalid_admin_key', 'X-Admin-Key is not valid'));
  }
  next();
};

analyticsRouter.use(requireAdminKey);

/** Windows the dashboard may ask for, mapped to Postgres intervals. */
const WINDOWS = { '1h': '1 hour', '6h': '6 hours', '24h': '24 hours', '7d': '7 days' } as const;
const windowQuery = z.object({ window: z.enum(['1h', '6h', '24h', '7d']).default('24h') });

const CONSENT_STATUSES = ['awaiting_authorisation', 'authorised', 'rejected', 'revoked', 'expired'] as const;

// GET /analytics/summary — the headline tiles
analyticsRouter.get('/summary', async (req, res, next) => {
  try {
    const { window } = parse(windowQuery, req.query);
    const interval = WINDOWS[window];

    const [traffic, consents] = await Promise.all([
      pool.query<{ calls: number; errors: number; p95_latency_ms: number }>(
        `SELECT (count(*))::int AS calls,
                (count(*) FILTER (WHERE status_code >= 400))::int AS errors,
                (coalesce(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0))::int AS p95_latency_ms
           FROM api_calls
          WHERE created_at > now() - $1::interval`,
        [interval],
      ),
      pool.query<{ active_consents: number; revocations: number; total_consents: number }>(
        `SELECT (count(*) FILTER (WHERE status = 'authorised'))::int AS active_consents,
                (count(*) FILTER (WHERE status = 'revoked' AND revoked_at > now() - $1::interval))::int AS revocations,
                (count(*))::int AS total_consents
           FROM consents`,
        [interval],
      ),
    ]);

    const t = traffic.rows[0]!;
    const c = consents.rows[0]!;
    res.json({
      window,
      calls: t.calls,
      errors: t.errors,
      error_rate: t.calls > 0 ? Math.round((t.errors / t.calls) * 10000) / 10000 : 0,
      p95_latency_ms: t.p95_latency_ms,
      active_consents: c.active_consents,
      revocations: c.revocations,
      total_consents: c.total_consents,
    });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/calls-per-client — every registered client, busiest first
analyticsRouter.get('/calls-per-client', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT cl.client_id,
              cl.name,
              cl.status,
              (count(ac.id))::int AS calls,
              (count(ac.id) FILTER (WHERE ac.status_code >= 400))::int AS errors
         FROM clients cl
         LEFT JOIN api_calls ac ON ac.client_id = cl.id
        GROUP BY cl.id, cl.client_id, cl.name, cl.status
        ORDER BY calls DESC, cl.name ASC`,
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/timeseries?window=24h — calls per 5-minute bucket, gaps filled
// so the line chart has a continuous x-axis.
analyticsRouter.get('/timeseries', async (req, res, next) => {
  try {
    const { window } = parse(windowQuery, req.query);
    const interval = WINDOWS[window];

    const { rows } = await pool.query(
      `WITH buckets AS (
         SELECT generate_series(
                  date_bin(interval '5 minutes', now() - $1::interval, timestamptz '2000-01-01'),
                  date_bin(interval '5 minutes', now(), timestamptz '2000-01-01'),
                  interval '5 minutes'
                ) AS bucket
       )
       SELECT b.bucket,
              (count(ac.id))::int AS calls,
              (count(ac.id) FILTER (WHERE ac.status_code >= 400))::int AS errors
         FROM buckets b
         LEFT JOIN api_calls ac
           ON ac.created_at >= b.bucket AND ac.created_at < b.bucket + interval '5 minutes'
        GROUP BY b.bucket
        ORDER BY b.bucket`,
      [interval],
    );
    res.json({ window, bucket_seconds: 300, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/recent-calls?limit=50 — the live audit feed
const recentQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

analyticsRouter.get('/recent-calls', async (req, res, next) => {
  try {
    const { limit } = parse(recentQuery, req.query);
    const { rows } = await pool.query(
      `SELECT ac.id::text AS id,
              ac.correlation_id,
              cl.client_id,
              cl.name AS client_name,
              ac.consent_id,
              ac.customer_id,
              ac.method,
              ac.path,
              ac.status_code,
              ac.error_code,
              ac.duration_ms,
              ac.ip,
              ac.created_at
         FROM api_calls ac
         LEFT JOIN clients cl ON cl.id = ac.client_id
        ORDER BY ac.id DESC
        LIMIT $1`,
      [limit],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/consents — counts by status, every status always present
analyticsRouter.get('/consents', async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{ status: string; count: number }>(
      `SELECT status::text AS status, (count(*))::int AS count FROM consents GROUP BY status`,
    );
    const counts = new Map(rows.map((r) => [r.status, r.count]));
    const data = CONSENT_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
    res.json({ data, total: data.reduce((sum, r) => sum + r.count, 0) });
  } catch (err) {
    next(err);
  }
});
