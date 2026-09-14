import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router, type RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../config.js';
import { pool } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { consentService } from '../consent/service.js';

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

const PORTAL_TOKEN_TTL_SECONDS = 86_400;
const BCRYPT_ROUNDS = 10;

interface DeveloperRow {
  id: string;
  email: string;
  name: string;
  company: string | null;
  created_at: Date;
}

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

function publicDeveloper(d: DeveloperRow) {
  return { id: d.id, email: d.email, name: d.name, company: d.company, created_at: d.created_at };
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

/**
 * Portal session token. Deliberately NOT the partner access-token shape: it
 * carries a developer_id and a typ marker, so a portal token can never be
 * presented as a partner token (authenticate would find no consent for it) and
 * a partner token can never be presented here.
 */
function issuePortalToken(developerId: string) {
  return jwt.sign({ typ: 'portal', developer_id: developerId }, config.JWT_SECRET, {
    algorithm: 'HS256',
    subject: developerId,
    expiresIn: PORTAL_TOKEN_TTL_SECONDS,
  });
}

declare module 'express-serve-static-core' {
  interface Request {
    developer?: DeveloperRow;
  }
}

/** Authorization: Bearer <portal token> issued by signup/login. */
const requirePortalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw ApiError.unauthorized('portal_token_required', 'Log in to the developer portal first');
    }

    let claims: { typ?: string; developer_id?: string };
    try {
      claims = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as typeof claims;
    } catch (err) {
      const expired = err instanceof jwt.TokenExpiredError;
      throw ApiError.unauthorized(
        expired ? 'portal_token_expired' : 'invalid_portal_token',
        expired ? 'Portal session has expired, log in again' : 'Portal token is invalid',
      );
    }
    if (claims.typ !== 'portal' || !claims.developer_id) {
      throw ApiError.unauthorized('invalid_portal_token', 'Portal token is invalid');
    }

    const { rows } = await pool.query<DeveloperRow>(
      `SELECT id, email, name, company, created_at FROM developers WHERE id = $1`,
      [claims.developer_id],
    );
    if (!rows[0]) throw ApiError.unauthorized('invalid_portal_token', 'Portal token is invalid');
    req.developer = rows[0];
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
       RETURNING id, email, name, company, created_at`,
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
      `SELECT id, email, name, company, created_at, password_hash FROM developers WHERE email = $1`,
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
