import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../lib/db.js';
import { ApiError } from '../lib/errors.js';
import type { AccessTokenClaims } from '../types/express.js';

interface ConsentRow {
  consent_id: string;
  consent_status: string;
  expires_at: Date | null;
  account_ids: string[];
  scopes: string[];
  customer_id: string;
  client_row_id: string;
  client_status: string;
}

/**
 * The gateway's trust check. On every partner call it answers three questions:
 *   1. Is this a valid token from a registered, active client?
 *   2. Did a real customer approve this (does the consent exist)?
 *   3. Is that approval still valid right now (not revoked / expired)?
 *
 * Tokens are stateless JWTs, but revocation is enforced on every call by
 * re-reading the consent — so revoking a consent or deactivating a client
 * takes effect on the very next request.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw ApiError.unauthorized('invalid_token', 'Missing or malformed Authorization header');
    }

    let claims: AccessTokenClaims;
    try {
      claims = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as AccessTokenClaims;
    } catch (err) {
      const expired = err instanceof jwt.TokenExpiredError;
      throw ApiError.unauthorized(
        expired ? 'token_expired' : 'invalid_token',
        expired ? 'Access token has expired' : 'Access token is invalid',
      );
    }

    // A client_credentials token has no consent behind it and must never reach customer data.
    if (!claims.consent_id) throw ApiError.unauthorized('invalid_token', 'This token is not bound to a customer consent');

    const { rows } = await pool.query<ConsentRow>(
      `SELECT c.id AS consent_id, c.status AS consent_status, c.expires_at, c.account_ids, c.scopes,
              c.customer_id, cl.id AS client_row_id, cl.status AS client_status
         FROM consents c
         JOIN clients cl ON cl.id = c.client_id
        WHERE c.id = $1 AND cl.client_id = $2`,
      [claims.consent_id, claims.client_id],
    );
    const row = rows[0];
    if (!row) throw ApiError.unauthorized('invalid_token', 'Token does not match a known consent');

    // Attribute the call for the audit log BEFORE the status checks below. A
    // rejection for a revoked consent or a deactivated client must still land on
    // the client that made it, or the dashboard cannot show that a partner's
    // calls started failing after revocation.
    req.audit = { clientRowId: row.client_row_id, consentId: row.consent_id, customerId: row.customer_id };

    if (row.client_status !== 'active') {
      throw ApiError.forbidden('client_deactivated', 'This client application has been deactivated');
    }
    if (row.consent_status === 'revoked') {
      throw ApiError.forbidden('consent_revoked', 'The customer has revoked consent for this application');
    }
    if (row.consent_status !== 'authorised') {
      throw ApiError.forbidden('consent_not_authorised', 'Consent has not been authorised');
    }
    if (row.expires_at && row.expires_at.getTime() < Date.now()) {
      // Lazily flip the row so dashboards show the right state.
      await pool.query(`UPDATE consents SET status = 'expired' WHERE id = $1 AND status = 'authorised'`, [
        row.consent_id,
      ]);
      throw ApiError.forbidden('consent_expired', 'Consent has expired');
    }

    req.auth = {
      token: claims,
      clientRowId: row.client_row_id,
      customerId: row.customer_id,
      consentId: row.consent_id,
      scopes: row.scopes,
      accountIds: row.account_ids,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * The partner on its own behalf, for the reference APIs (bank list, NUBAN).
 * Any valid token from an active client will do — a client_credentials token
 * or a customer-bound one — because reference data involves no customer. What
 * it still enforces: the signature, the client existing, and the client being
 * active, so deactivation cuts these off too. Never grants access to /api/v1/accounts.
 */
export const authenticatePartner: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw ApiError.unauthorized('invalid_token', 'Missing or malformed Authorization header');
    }

    let claims: { typ?: string; client_id?: string };
    try {
      claims = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as typeof claims;
    } catch (err) {
      const expired = err instanceof jwt.TokenExpiredError;
      throw ApiError.unauthorized(
        expired ? 'token_expired' : 'invalid_token',
        expired ? 'Access token has expired' : 'Access token is invalid',
      );
    }
    // Portal sessions carry typ 'portal' and no client_id; they are not partner tokens.
    if (!claims.client_id || (claims.typ !== undefined && claims.typ !== 'client')) {
      throw ApiError.unauthorized('invalid_token', 'Access token is invalid');
    }

    const { rows } = await pool.query<{ id: string; status: string }>(
      `SELECT id, status FROM clients WHERE client_id = $1`,
      [claims.client_id],
    );
    const client = rows[0];
    if (!client) throw ApiError.unauthorized('invalid_token', 'Token does not match a registered client');

    req.audit = { clientRowId: client.id };
    if (client.status !== 'active') {
      throw ApiError.forbidden('client_deactivated', 'This client application has been deactivated');
    }

    req.partner = { clientRowId: client.id, clientId: claims.client_id, kind: claims.typ === 'client' ? 'client' : 'consent' };
    next();
  } catch (err) {
    next(err);
  }
};

/** Require a scope on the consent (e.g. 'balances:read'). Use after `authenticate`. */
export function requireScope(scope: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (!req.auth.scopes.includes(scope)) {
      return next(ApiError.forbidden('insufficient_scope', `This token does not have the '${scope}' scope`));
    }
    next();
  };
}

/**
 * Require that the :accountId in the route is one the customer selected when
 * approving. Returns 404 rather than 403 so a partner cannot probe which
 * account ids exist.
 */
export const requireConsentedAccount: RequestHandler = (req, _res, next) => {
  const accountId = req.params.accountId;
  if (!req.auth || typeof accountId !== 'string' || !req.auth.accountIds.includes(accountId)) {
    return next(ApiError.notFound('account_not_found', 'Account not found'));
  }
  next();
};
