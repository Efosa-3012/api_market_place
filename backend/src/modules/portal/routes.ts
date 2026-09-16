import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { pool } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { coreBanking } from '../../core-banking/index.js';
import { issueAccessToken } from '../auth/tokens.js';
import { consentService } from '../consent/service.js';
import { developerFromRequest, issuePortalToken, publicDeveloper, type DeveloperRow } from './session.js';

/**
 * Developer portal backend: signup, login, app registration, credentials.
 *
 * This is the self-service front door. A developer signs up, registers an app
 * and gets a client_id and a secret they see exactly once. The secret is stored
 * only as a bcrypt hash — we cannot show it again, we can only replace it.
 *
 * Deactivating an app is the blast-radius switch: it flips the client to
 * 'deactivated' AND revokes every consent customers ever granted it, so every
 * token issued under it stops working on the very next call.
 */
export const portalRouter = Router();

const BCRYPT_ROUNDS = 10;

interface ClientRow {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  redirect_uris: string[];
  allowed_scopes: string[];
  status: 'active' | 'deactivated';
  created_at: Date;
  deactivated_at: Date | null;
}

function publicClient(c: ClientRow) {
  return {
    id: c.id,
    client_id: c.client_id,
    name: c.name,
    description: c.description,
    redirect_uris: c.redirect_uris,
    allowed_scopes: c.allowed_scopes,
    status: c.status,
    created_at: c.created_at,
    deactivated_at: c.deactivated_at,
  };
}

declare module 'express-serve-static-core' {
  interface Request {
    developer?: DeveloperRow;
  }
}

/** Authorization: Bearer <portal token> issued by signup/login. */
const requirePortalAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.developer = await developerFromRequest(req.header('authorization'));
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Look up one of the caller's own apps. Returns 404 rather than 403 so a
 * developer cannot probe which app ids exist under other accounts.
 */
async function findOwnClient(clientRowId: string, developerId: string) {
  const { rows } = await pool.query<ClientRow>(`SELECT * FROM clients WHERE id = $1 AND developer_id = $2`, [
    clientRowId,
    developerId,
  ]);
  const client = rows[0];
  if (!client) throw ApiError.notFound('app_not_found', 'App not found');
  return client;
}

const appIdParam = z.object({ id: z.string().uuid('Must be a valid app id') });

// ---------------------------------------------------------------------------
// POST /portal/signup
// ---------------------------------------------------------------------------
const signupBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
});

portalRouter.post('/signup', async (req, res, next) => {
  try {
    const body = parse(signupBody, req.body);

    // ON CONFLICT DO NOTHING keeps the unique-email race in one statement.
    const { rows } = await pool.query<DeveloperRow>(
      `INSERT INTO developers (email, password_hash, name, company)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name, company, role::text AS role, created_at`,
      [body.email.toLowerCase(), await bcrypt.hash(body.password, BCRYPT_ROUNDS), body.name, body.company ?? null],
    );
    const developer = rows[0];
    if (!developer) throw ApiError.conflict('email_taken', 'An account with that email already exists');

    res.status(201).json({ developer: publicDeveloper(developer), portal_token: issuePortalToken(developer.id) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /portal/login
// ---------------------------------------------------------------------------
const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

portalRouter.post('/login', async (req, res, next) => {
  try {
    const body = parse(loginBody, req.body);
    const { rows } = await pool.query<DeveloperRow & { password_hash: string }>(
      `SELECT id, email, name, company, role::text AS role, created_at, password_hash FROM developers WHERE email = $1`,
      [body.email.toLowerCase()],
    );
    const developer = rows[0];
    if (!developer || !(await bcrypt.compare(body.password, developer.password_hash))) {
      throw ApiError.unauthorized('invalid_credentials', 'Incorrect email or password');
    }
    res.json({ developer: publicDeveloper(developer), portal_token: issuePortalToken(developer.id) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /portal/apps
// ---------------------------------------------------------------------------
portalRouter.get('/apps', requirePortalAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query<ClientRow>(
      `SELECT * FROM clients WHERE developer_id = $1 ORDER BY created_at DESC`,
      [req.developer!.id],
    );
    res.json({ data: rows.map(publicClient) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /portal/apps
//
// The secret in this response is the only time it exists in readable form.
// We keep the bcrypt hash and nothing else.
// ---------------------------------------------------------------------------
const createAppBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  redirect_uris: z.array(z.string().url('Each redirect_uri must be an absolute URL')).min(1).max(5),
});

/** cl_ plus 16 base64url chars — short enough for a developer to recognise. */
const newClientId = () => `cl_${randomBytes(12).toString('base64url')}`;
const newClientSecret = () => randomBytes(32).toString('base64url');

portalRouter.post('/apps', requirePortalAuth, async (req, res, next) => {
  try {
    const body = parse(createAppBody, req.body);
    const secret = newClientSecret();

    const { rows } = await pool.query<ClientRow>(
      `INSERT INTO clients (developer_id, name, description, client_id, client_secret_hash, redirect_uris)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.developer!.id,
        body.name,
        body.description ?? null,
        newClientId(),
        await bcrypt.hash(secret, BCRYPT_ROUNDS),
        body.redirect_uris,
      ],
    );

    res.status(201).json({
      ...publicClient(rows[0]!),
      client_secret: secret,
      warning: 'Store this secret now. It is hashed on our side and cannot be shown again.',
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /portal/apps/:id/rotate-secret — the old secret stops working at once
// ---------------------------------------------------------------------------
portalRouter.post('/apps/:id/rotate-secret', requirePortalAuth, async (req, res, next) => {
  try {
    const { id } = parse(appIdParam, req.params);
    const client = await findOwnClient(id, req.developer!.id);
    if (client.status !== 'active') {
      throw ApiError.conflict('client_deactivated', 'This app is deactivated; its secret cannot be rotated');
    }

    const secret = newClientSecret();
    const { rows } = await pool.query<ClientRow>(
      `UPDATE clients SET client_secret_hash = $2 WHERE id = $1 RETURNING *`,
      [client.id, await bcrypt.hash(secret, BCRYPT_ROUNDS)],
    );

    res.json({
      ...publicClient(rows[0]!),
      client_secret: secret,
      warning: 'The previous secret stopped working. Store this one now; it cannot be shown again.',
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /portal/apps/:id/deactivate
//
// The blast-radius switch. One call kills the app AND every consent customers
// ever granted it, so every token issued under it fails on the next request.
// Safe to call twice: the original deactivated_at is preserved.
// ---------------------------------------------------------------------------
portalRouter.post('/apps/:id/deactivate', requirePortalAuth, async (req, res, next) => {
  try {
    const { id } = parse(appIdParam, req.params);
    const client = await findOwnClient(id, req.developer!.id);

    const { rows } = await pool.query<ClientRow>(
      `UPDATE clients
          SET status = 'deactivated', deactivated_at = coalesce(deactivated_at, now())
        WHERE id = $1 RETURNING *`,
      [client.id],
    );
    const consentsRevoked = await consentService.revokeAllForClient(client.id);

    res.json({ ...publicClient(rows[0]!), consents_revoked: consentsRevoked });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Integration activity — the developer's own slice of the gateway audit trail.
//
// Same `api_calls` table the bank's analytics dashboard reads, scoped to the
// caller's own apps. A developer sees what their integration did and nothing
// else: no other developer's traffic, and none of the customer identifiers the
// bank keeps for its own audit.
// ---------------------------------------------------------------------------

/** Windows the portal may ask for, mapped to Postgres intervals. */
const PORTAL_WINDOWS = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days', '30d': '30 days' } as const;
const portalWindowQuery = z.object({ window: z.enum(['1h', '24h', '7d', '30d']).default('24h') });

// GET /portal/summary?window=24h — the headline tiles on the portal overview
portalRouter.get('/summary', requirePortalAuth, async (req, res, next) => {
  try {
    const { window } = parse(portalWindowQuery, req.query);
    const interval = PORTAL_WINDOWS[window];
    const developerId = req.developer!.id;

    const [traffic, byApp, consents] = await Promise.all([
      pool.query<{
        calls: number;
        errors: number;
        client_errors: number;
        server_errors: number;
        p95_latency_ms: number;
      }>(
        `SELECT (count(*))::int AS calls,
                (count(*) FILTER (WHERE ac.status_code >= 400))::int AS errors,
                (count(*) FILTER (WHERE ac.status_code BETWEEN 400 AND 499))::int AS client_errors,
                (count(*) FILTER (WHERE ac.status_code >= 500))::int AS server_errors,
                (coalesce(percentile_disc(0.95) WITHIN GROUP (ORDER BY ac.duration_ms), 0))::int AS p95_latency_ms
           FROM api_calls ac
           JOIN clients cl ON cl.id = ac.client_id
          WHERE cl.developer_id = $1 AND ac.created_at > now() - $2::interval`,
        [developerId, interval],
      ),
      pool.query(
        `SELECT cl.id AS app_id, cl.client_id, cl.name, cl.status::text AS status,
                (count(ac.id) FILTER (WHERE ac.created_at > now() - $2::interval))::int AS calls,
                (count(ac.id) FILTER (WHERE ac.created_at > now() - $2::interval AND ac.status_code >= 400))::int AS errors
           FROM clients cl
           LEFT JOIN api_calls ac ON ac.client_id = cl.id
          WHERE cl.developer_id = $1
          GROUP BY cl.id, cl.client_id, cl.name, cl.status
          ORDER BY calls DESC, cl.name ASC`,
        [developerId, interval],
      ),
      pool.query<{ active_consents: number; sandbox_consents: number; revoked_consents: number }>(
        `SELECT (count(*) FILTER (WHERE c.status = 'authorised' AND NOT c.sandbox))::int AS active_consents,
                (count(*) FILTER (WHERE c.status = 'authorised' AND c.sandbox))::int AS sandbox_consents,
                (count(*) FILTER (WHERE c.status = 'revoked'))::int AS revoked_consents
           FROM consents c
           JOIN clients cl ON cl.id = c.client_id
          WHERE cl.developer_id = $1`,
        [developerId],
      ),
    ]);

    const t = traffic.rows[0]!;
    const apps = byApp.rows as { status: string; calls: number }[];
    res.json({
      window,
      calls: t.calls,
      errors: t.errors,
      client_errors: t.client_errors,
      server_errors: t.server_errors,
      error_rate: t.calls > 0 ? Math.round((t.errors / t.calls) * 10000) / 10000 : 0,
      p95_latency_ms: t.p95_latency_ms,
      apps_total: apps.length,
      apps_active: apps.filter((a) => a.status === 'active').length,
      ...consents.rows[0]!,
      by_app: byApp.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /portal/logs — the developer's request log, newest first.
//
// Keyset pagination on the bigserial id: stable under inserts, unlike an offset,
// and the audit trail is append-only so a cursor never goes stale.
const logsQuery = z.object({
  app_id: z.string().uuid('Must be a valid app id').optional(),
  status: z.enum(['2xx', '4xx', '5xx', 'errors']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().regex(/^\d+$/, 'Cursor must come from meta.next_cursor').optional(),
});

portalRouter.get('/logs', requirePortalAuth, async (req, res, next) => {
  try {
    const q = parse(logsQuery, req.query);

    // Status filter as an inclusive [min, max] band so one pair of parameters
    // covers a single class and the catch-all "errors".
    const band: [number, number] | null =
      q.status === '2xx' ? [200, 299]
      : q.status === '4xx' ? [400, 499]
      : q.status === '5xx' ? [500, 599]
      : q.status === 'errors' ? [400, 599]
      : null;

    const { rows } = await pool.query(
      `SELECT ac.id::text AS id,
              ac.correlation_id,
              cl.id AS app_id,
              cl.client_id,
              cl.name AS app_name,
              ac.consent_id,
              ac.method,
              ac.path,
              ac.status_code,
              ac.error_code,
              ac.duration_ms,
              ac.created_at
         FROM api_calls ac
         JOIN clients cl ON cl.id = ac.client_id
        WHERE cl.developer_id = $1
          AND ($2::uuid IS NULL OR cl.id = $2)
          AND ($3::int IS NULL OR ac.status_code BETWEEN $3 AND $4)
          AND ($5::bigint IS NULL OR ac.id < $5)
        ORDER BY ac.id DESC
        LIMIT $6`,
      [req.developer!.id, q.app_id ?? null, band?.[0] ?? null, band?.[1] ?? null, q.cursor ?? null, q.limit + 1],
    );

    // One row over the limit tells us there is another page without a count(*).
    const hasMore = rows.length > q.limit;
    const data = hasMore ? rows.slice(0, q.limit) : rows;
    res.json({
      data,
      meta: {
        pagination: {
          limit: q.limit,
          has_more: hasMore,
          ...(hasMore ? { next_cursor: String(data[data.length - 1]!.id) } : {}),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Sandbox — the portal's try-it console.
//
// A sandbox token is a REAL access token for the developer's app, bound to a
// pre-authorised consent for a demo customer. It goes through the exact same
// `authenticate` checks as a token from the OAuth flow, so what the developer
// sees in the sandbox is what their production integration will see.
// ---------------------------------------------------------------------------

function publicSandboxConsent(c: { id: string; status: string; scopes: string[]; account_ids: string[]; customer_id: string | null; authorised_at: Date | null; expires_at: Date | null; revoked_at: Date | null }) {
  return {
    consent_id: c.id,
    status: c.status,
    scopes: c.scopes,
    account_ids: c.account_ids,
    customer_id: c.customer_id,
    authorised_at: c.authorised_at,
    expires_at: c.expires_at,
    revoked_at: c.revoked_at,
  };
}

// GET /portal/apps/:id/sandbox — current sandbox state + the demo customer's accounts
portalRouter.get('/apps/:id/sandbox', requirePortalAuth, async (req, res, next) => {
  try {
    const { id } = parse(appIdParam, req.params);
    const client = await findOwnClient(id, req.developer!.id);
    const [consent, accounts] = await Promise.all([
      consentService.activeSandboxForClient(client.id),
      coreBanking.listCustomerAccounts(config.SANDBOX_CUSTOMER_ID),
    ]);
    res.json({
      customer_id: config.SANDBOX_CUSTOMER_ID,
      accounts: accounts.map((a) => ({
        account_id: a.account_id,
        account_type: a.account_type,
        currency: a.currency,
        status: a.status,
      })),
      consent: consent ? publicSandboxConsent(consent) : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /portal/apps/:id/sandbox-token — mint a sandbox access token
portalRouter.post('/apps/:id/sandbox-token', requirePortalAuth, async (req, res, next) => {
  try {
    const { id } = parse(appIdParam, req.params);
    const client = await findOwnClient(id, req.developer!.id);
    if (client.status !== 'active') {
      throw ApiError.conflict('client_deactivated', 'This app is deactivated and cannot be issued tokens');
    }

    let consent = await consentService.activeSandboxForClient(client.id);
    if (!consent) {
      const accounts = await coreBanking.listCustomerAccounts(config.SANDBOX_CUSTOMER_ID);
      if (accounts.length === 0) {
        throw ApiError.upstream('The sandbox customer has no accounts in core banking');
      }
      consent = await consentService.createSandbox({
        clientRowId: client.id,
        customerId: config.SANDBOX_CUSTOMER_ID,
        scopes: client.allowed_scopes,
        accountIds: accounts.map((a) => a.account_id),
      });
    }

    const token = issueAccessToken({
      clientId: client.client_id,
      consentId: consent.id,
      customerId: consent.customer_id!,
      scopes: consent.scopes,
    });

    res.setHeader('Cache-Control', 'no-store');
    res.json({ ...token, ...publicSandboxConsent(consent) });
  } catch (err) {
    next(err);
  }
});

// POST /portal/apps/:id/sandbox/revoke — simulate the customer withdrawing consent
portalRouter.post('/apps/:id/sandbox/revoke', requirePortalAuth, async (req, res, next) => {
  try {
    const { id } = parse(appIdParam, req.params);
    const client = await findOwnClient(id, req.developer!.id);
    const revoked = await consentService.revokeSandboxForClient(client.id);
    res.json({ consents_revoked: revoked });
  } catch (err) {
    next(err);
  }
});
