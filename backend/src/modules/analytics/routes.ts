import { timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { pool } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { developerFromRequest } from '../portal/session.js';

/**
 * Analytics dashboard data, derived from the api_calls and consents tables.
 *
 * This is the bank's control room: which partner is calling, on whose behalf,
 * how often, and what is failing. Everything here is plain SQL over the audit
 * trail written by the auditLog middleware.
 *
 * Not partner-facing. Two credentials are accepted:
 *   - `X-Admin-Key`, a shared secret, for scripts and smoke tests
 *   - a portal session belonging to a developer whose role is 'admin', which is
 *     what the dashboard UI sends, so the key never has to ship to a browser
 *
 * In production both are replaced by the bank's staff SSO.
 */
export const analyticsRouter = Router();

const requireAdmin: RequestHandler = async (req, _res, next) => {
  const suppliedKey = req.header('x-admin-key');
  const hasBearer = (req.header('authorization') ?? '').toLowerCase().startsWith('bearer ');

  if (!suppliedKey && !hasBearer) {
    return next(
      ApiError.unauthorized('admin_key_required', 'Sign in as an administrator or send a valid X-Admin-Key header'),
    );
  }

  if (suppliedKey) {
    // Constant-time compare so the key cannot be recovered byte by byte.
    const a = Buffer.from(suppliedKey);
    const b = Buffer.from(config.ADMIN_KEY);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return next(ApiError.unauthorized('invalid_admin_key', 'X-Admin-Key is not valid'));
    }
    return next();
  }

  try {
    const developer = await developerFromRequest(req.header('authorization'));
    if (developer.role !== 'admin') {
      throw ApiError.forbidden('admin_required', 'This account does not have dashboard access');
    }
    req.developer = developer;
    next();
  } catch (err) {
    next(err);
  }
};

analyticsRouter.use(requireAdmin);

/**
 * Windows the dashboard may ask for, with the bucket each one is charted at.
 * Buckets scale with the window so a series is always 60–170 points: fine
 * enough to show a spike, coarse enough that the payload stays small.
 */
const WINDOWS = {
  '1h': { interval: '1 hour', bucket: '1 minute', bucketSeconds: 60 },
  '6h': { interval: '6 hours', bucket: '5 minutes', bucketSeconds: 300 },
  '24h': { interval: '24 hours', bucket: '15 minutes', bucketSeconds: 900 },
  '7d': { interval: '7 days', bucket: '1 hour', bucketSeconds: 3600 },
  '30d': { interval: '30 days', bucket: '6 hours', bucketSeconds: 21_600 },
} as const;

const windowQuery = z.object({ window: z.enum(['1h', '6h', '24h', '7d', '30d']).default('24h') });

const CONSENT_STATUSES = ['awaiting_authorisation', 'authorised', 'rejected', 'revoked', 'expired'] as const;

// GET /analytics/summary — the headline tiles
analyticsRouter.get('/summary', async (req, res, next) => {
  try {
    const { window } = parse(windowQuery, req.query);
    const { interval } = WINDOWS[window];

    const [traffic, consents, partners] = await Promise.all([
      pool.query<{
        calls: number;
        errors: number;
        client_errors: number;
        server_errors: number;
        p99_latency_ms: number;
        avg_latency_ms: number;
      }>(
        `SELECT (count(*))::int AS calls,
                (count(*) FILTER (WHERE status_code >= 400))::int AS errors,
                (count(*) FILTER (WHERE status_code BETWEEN 400 AND 499))::int AS client_errors,
                (count(*) FILTER (WHERE status_code >= 500))::int AS server_errors,
                (coalesce(percentile_disc(0.99) WITHIN GROUP (ORDER BY duration_ms), 0))::int AS p99_latency_ms,
                (coalesce(round(avg(duration_ms)), 0))::int AS avg_latency_ms
           FROM api_calls
          WHERE created_at > now() - $1::interval`,
        [interval],
      ),
      pool.query<{ active_consents: number; revocations: number; total_consents: number; new_consents: number }>(
        `SELECT (count(*) FILTER (WHERE status = 'authorised'))::int AS active_consents,
                (count(*) FILTER (WHERE status = 'revoked' AND revoked_at > now() - $1::interval))::int AS revocations,
                (count(*))::int AS total_consents,
                (count(*) FILTER (WHERE authorised_at > now() - $1::interval))::int AS new_consents
           FROM consents`,
        [interval],
      ),
      pool.query<{ developers: number; clients_total: number; clients_active: number; clients_calling: number }>(
        `SELECT (SELECT count(*) FROM developers WHERE role = 'developer')::int AS developers,
                (SELECT count(*) FROM clients)::int AS clients_total,
                (SELECT count(*) FROM clients WHERE status = 'active')::int AS clients_active,
                (SELECT count(DISTINCT client_id) FROM api_calls
                  WHERE client_id IS NOT NULL AND created_at > now() - $1::interval)::int AS clients_calling`,
        [interval],
      ),
    ]);

    const t = traffic.rows[0]!;
    res.json({
      window,
      calls: t.calls,
      errors: t.errors,
      client_errors: t.client_errors,
      server_errors: t.server_errors,
      error_rate: t.calls > 0 ? Math.round((t.errors / t.calls) * 10000) / 10000 : 0,
      p99_latency_ms: t.p99_latency_ms,
      avg_latency_ms: t.avg_latency_ms,
      ...consents.rows[0]!,
      ...partners.rows[0]!,
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
              d.name AS developer_name,
              d.company AS developer_company,
              (count(ac.id))::int AS calls,
              (count(ac.id) FILTER (WHERE ac.status_code >= 400))::int AS errors,
              max(ac.created_at) AS last_call_at,
              (SELECT count(*) FROM consents c
                WHERE c.client_id = cl.id AND c.status = 'authorised' AND NOT c.sandbox)::int AS active_consents
         FROM clients cl
         JOIN developers d ON d.id = cl.developer_id
         LEFT JOIN api_calls ac ON ac.client_id = cl.id
        GROUP BY cl.id, cl.client_id, cl.name, cl.status, d.name, d.company
        ORDER BY calls DESC, cl.name ASC`,
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/developers — every developer account on the platform, with the
// apps registered under it. The partner register: who signed up, what they have
// built, whether it is being used. Staff accounts are not partners and are left out.
interface DeveloperRow {
  id: string;
  email: string;
  name: string;
  company: string | null;
  created_at: Date;
  apps_total: number;
  apps_active: number;
  calls: number;
  errors: number;
  active_consents: number;
  last_call_at: Date | null;
}

interface DeveloperAppRow {
  developer_id: string;
  id: string;
  client_id: string;
  name: string;
  status: string;
  created_at: Date;
  deactivated_at: Date | null;
  calls: number;
  active_consents: number;
  last_call_at: Date | null;
}

analyticsRouter.get('/developers', async (_req, res, next) => {
  try {
    const [developers, apps] = await Promise.all([
      pool.query<DeveloperRow>(
        `SELECT d.id, d.email, d.name, d.company, d.created_at,
                (count(DISTINCT cl.id))::int AS apps_total,
                (count(DISTINCT cl.id) FILTER (WHERE cl.status = 'active'))::int AS apps_active,
                (count(ac.id))::int AS calls,
                (count(ac.id) FILTER (WHERE ac.status_code >= 400))::int AS errors,
                (SELECT count(*) FROM consents c JOIN clients c2 ON c2.id = c.client_id
                  WHERE c2.developer_id = d.id AND c.status = 'authorised' AND NOT c.sandbox)::int AS active_consents,
                max(ac.created_at) AS last_call_at
           FROM developers d
           LEFT JOIN clients cl ON cl.developer_id = d.id
           LEFT JOIN api_calls ac ON ac.client_id = cl.id
          WHERE d.role = 'developer'
          GROUP BY d.id
          ORDER BY calls DESC, d.created_at ASC`,
      ),
      pool.query<DeveloperAppRow>(
        `SELECT cl.developer_id, cl.id, cl.client_id, cl.name, cl.status::text AS status, cl.created_at, cl.deactivated_at,
                (count(ac.id))::int AS calls,
                (SELECT count(*) FROM consents c
                  WHERE c.client_id = cl.id AND c.status = 'authorised' AND NOT c.sandbox)::int AS active_consents,
                max(ac.created_at) AS last_call_at
           FROM clients cl
           LEFT JOIN api_calls ac ON ac.client_id = cl.id
          GROUP BY cl.id
          ORDER BY calls DESC, cl.created_at ASC`,
      ),
    ]);

    const byDeveloper = new Map<string, Omit<DeveloperAppRow, 'developer_id'>[]>();
    for (const { developer_id, ...app } of apps.rows) {
      const list = byDeveloper.get(developer_id) ?? [];
      list.push(app);
      byDeveloper.set(developer_id, list);
    }
    res.json({ data: developers.rows.map((d) => ({ ...d, apps: byDeveloper.get(d.id) ?? [] })) });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/top-endpoints?window=24h — which APIs partners actually use.
//
// Only the partner surface (/api/v1/*) counts: the bank's own consent pages and
// the portal are not products anyone consumes. Account ids are collapsed back to
// {accountId} so one busy account does not become its own row, and CORS
// preflights are dropped — a browser sending OPTIONS is not API usage.
analyticsRouter.get('/top-endpoints', async (req, res, next) => {
  try {
    const { window } = parse(windowQuery, req.query);
    const { interval } = WINDOWS[window];

    const { rows } = await pool.query(
      `SELECT regexp_replace(path, '/api/v1/accounts/[^/]+', '/api/v1/accounts/{accountId}') AS path,
              method,
              (count(*))::int AS calls,
              (count(*) FILTER (WHERE status_code >= 400))::int AS errors,
              (coalesce(percentile_disc(0.99) WITHIN GROUP (ORDER BY duration_ms), 0))::int AS p99_latency_ms
         FROM api_calls
        WHERE created_at > now() - $1::interval
          AND path LIKE '/api/v1/%'
          AND method <> 'OPTIONS'
        GROUP BY 1, 2
        ORDER BY calls DESC
        LIMIT 10`,
      [interval],
    );
    res.json({ window, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/endpoints?window=24h — usage of every product endpoint, for the
// catalogue view. Unlike top-endpoints this is unbounded and includes the OAuth
// endpoints, so the consent product can be shown alongside the data products.
analyticsRouter.get('/endpoints', async (req, res, next) => {
  try {
    const { window } = parse(windowQuery, req.query);
    const { interval } = WINDOWS[window];

    const { rows } = await pool.query(
      `SELECT regexp_replace(path, '/api/v1/accounts/[^/]+', '/api/v1/accounts/{accountId}') AS path,
              method,
              (count(*))::int AS calls,
              (count(*) FILTER (WHERE status_code >= 400))::int AS errors,
              (coalesce(percentile_disc(0.99) WITHIN GROUP (ORDER BY duration_ms), 0))::int AS p99_latency_ms,
              (count(DISTINCT client_id))::int AS partners,
              max(created_at) AS last_call_at
         FROM api_calls
        WHERE created_at > now() - $1::interval
          AND (path LIKE '/api/v1/%' OR path LIKE '/oauth/%')
          AND method <> 'OPTIONS'
        GROUP BY 1, 2
        ORDER BY calls DESC`,
      [interval],
    );
    res.json({ window, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/timeseries?window=24h — calls per bucket, gaps filled so the
// line chart has a continuous x-axis.
analyticsRouter.get('/timeseries', async (req, res, next) => {
  try {
    const { window } = parse(windowQuery, req.query);
    const { interval, bucket, bucketSeconds } = WINDOWS[window];

    const { rows } = await pool.query(
      `WITH buckets AS (
         SELECT generate_series(
                  date_bin($2::interval, now() - $1::interval, timestamptz '2000-01-01'),
                  date_bin($2::interval, now(), timestamptz '2000-01-01'),
                  $2::interval
                ) AS bucket
       )
       SELECT b.bucket,
              (count(ac.id))::int AS calls,
              (count(ac.id) FILTER (WHERE ac.status_code >= 400))::int AS errors
         FROM buckets b
         LEFT JOIN api_calls ac
           ON ac.created_at >= b.bucket AND ac.created_at < b.bucket + $2::interval
        GROUP BY b.bucket
        ORDER BY b.bucket`,
      [interval, bucket],
    );
    res.json({ window, bucket_seconds: bucketSeconds, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/recent-calls?limit=50 — the live audit feed
//
// Shows the traffic this dashboard exists to oversee: partner API calls and the
// consent journey behind them (/api/v1, /oauth, /bank). The management plane —
// this dashboard's own /analytics reads and the developer portal's /portal calls
// — is excluded, or a portal left open in another tab buries the partner traffic.
// CORS preflights go too: a browser asking permission is not a call anyone made.
// `include_internal=true` brings it all back for debugging the platform itself.
const recentQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  errors_only: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  include_internal: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

analyticsRouter.get('/recent-calls', async (req, res, next) => {
  try {
    const { limit, errors_only, include_internal } = parse(recentQuery, req.query);
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
        WHERE ($2::boolean IS NOT TRUE OR ac.status_code >= 400)
          AND ($3::boolean IS TRUE OR (ac.method <> 'OPTIONS'
                                       AND ac.path NOT LIKE '/analytics%'
                                       AND ac.path NOT LIKE '/portal%'
                                       AND ac.path NOT LIKE '/demo%'))
        ORDER BY ac.id DESC
        LIMIT $1`,
      [limit, errors_only, include_internal],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /analytics/consents — counts by status, every status always present
analyticsRouter.get('/consents', async (_req, res, next) => {
  try {
    const [counts, recent] = await Promise.all([
      pool.query<{ status: string; count: number }>(
        `SELECT status::text AS status, (count(*))::int AS count FROM consents GROUP BY status`,
      ),
      // The consent story the dashboard tells: who granted or withdrew access,
      // to which partner, and when.
      pool.query(
        `SELECT c.id,
                c.status::text AS status,
                c.customer_id,
                c.scopes,
                array_length(c.account_ids, 1) AS account_count,
                c.sandbox,
                c.authorised_at,
                c.revoked_at,
                c.revoked_by,
                c.created_at,
                cl.client_id,
                cl.name AS client_name
           FROM consents c
           JOIN clients cl ON cl.id = c.client_id
          ORDER BY greatest(c.created_at, coalesce(c.authorised_at, c.created_at),
                            coalesce(c.revoked_at, c.created_at)) DESC
          LIMIT 12`,
      ),
    ]);

    const byStatus = new Map(counts.rows.map((r) => [r.status, r.count]));
    const data = CONSENT_STATUSES.map((status) => ({ status, count: byStatus.get(status) ?? 0 }));
    res.json({ data, total: data.reduce((sum, r) => sum + r.count, 0), recent: recent.rows });
  } catch (err) {
    next(err);
  }
});
