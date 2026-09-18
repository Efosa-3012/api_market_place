import bcrypt from 'bcryptjs';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { pool } from '../../lib/db.js';
import { ApiError, OAuthError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { consentService, SCOPES } from '../consent/service.js';
import { issueAccessToken, issueClientToken } from './tokens.js';

export const oauthRouter = Router();

interface ClientRow {
  id: string;
  client_id: string;
  client_secret_hash: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  status: 'active' | 'deactivated';
}

async function findClient(clientId: string) {
  const { rows } = await pool.query<ClientRow>(`SELECT * FROM clients WHERE client_id = $1`, [clientId]);
  return rows[0] ?? null;
}

/** Client credentials may come as HTTP Basic (preferred) or in the form body. */
function extractClientCredentials(req: Request): { clientId?: string; clientSecret?: string } {
  const header = req.header('authorization');
  if (header?.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx > 0) return { clientId: decoded.slice(0, idx), clientSecret: decoded.slice(idx + 1) };
  }
  const body = req.body as Record<string, unknown>;
  return {
    clientId: typeof body.client_id === 'string' ? body.client_id : undefined,
    clientSecret: typeof body.client_secret === 'string' ? body.client_secret : undefined,
  };
}

// ---------------------------------------------------------------------------
// GET /oauth/authorize
//
// Step 2 of the flow: the fintech sends the customer here. We validate the
// client, create a consent in 'awaiting_authorisation', and hand the customer
// to the bank's own consent UI. The fintech never sees the login page.
// ---------------------------------------------------------------------------
const authorizeQuery = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().min(1),
  state: z.string().max(512).optional(),
  format: z.enum(['json']).optional(), // ?format=json returns the consent URL instead of redirecting
});

oauthRouter.get('/authorize', async (req, res, next) => {
  try {
    const q = parse(authorizeQuery, req.query);

    const client = await findClient(q.client_id);
    // Per RFC 6749 §4.1.2.1, never redirect to an unverified redirect_uri.
    if (!client || client.status !== 'active') {
      throw ApiError.badRequest('invalid_client', 'Unknown or inactive client_id');
    }
    if (!client.redirect_uris.includes(q.redirect_uri)) {
      throw ApiError.badRequest('invalid_redirect_uri', 'redirect_uri is not registered for this client');
    }

    const scopes = [...new Set(q.scope.split(/\s+/).filter(Boolean))];
    const bad = scopes.filter((s) => !(SCOPES as readonly string[]).includes(s) || !client.allowed_scopes.includes(s));
    if (bad.length > 0) {
      const back = new URL(q.redirect_uri);
      back.searchParams.set('error', 'invalid_scope');
      back.searchParams.set('error_description', `Unsupported scope(s): ${bad.join(' ')}`);
      if (q.state) back.searchParams.set('state', q.state);
      return res.redirect(302, back.toString());
    }

    const consent = await consentService.create({
      clientRowId: client.id,
      scopes,
      redirectUri: q.redirect_uri,
      state: q.state,
    });

    const consentUrl = new URL(config.CONSENT_UI_URL);
    consentUrl.searchParams.set('consent_id', consent.id);

    if (q.format === 'json' || req.accepts(['html', 'json']) === 'json') {
      return res.status(201).json({ consent_id: consent.id, consent_url: consentUrl.toString() });
    }
    res.redirect(302, consentUrl.toString());
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /oauth/token
//
// Step 6: the fintech swaps the code for a token. Errors follow RFC 6749 §5.2.
// ---------------------------------------------------------------------------
const tokenBody = z.object({
  grant_type: z.string(),
  code: z.string().optional(),
  redirect_uri: z.string().optional(),
});

oauthRouter.post('/token', async (req, res, next) => {
  try {
    const bodyResult = tokenBody.safeParse(req.body);
    if (!bodyResult.success) throw new OAuthError(400, 'invalid_request', 'Malformed token request');
    const body = bodyResult.data;

    const { clientId, clientSecret } = extractClientCredentials(req);
    if (!clientId || !clientSecret) {
      res.setHeader('WWW-Authenticate', 'Basic realm="oauth"');
      throw new OAuthError(401, 'invalid_client', 'Client authentication required');
    }
    const client = await findClient(clientId);
    if (!client || !(await bcrypt.compare(clientSecret, client.client_secret_hash))) {
      res.setHeader('WWW-Authenticate', 'Basic realm="oauth"');
      throw new OAuthError(401, 'invalid_client', 'Invalid client credentials');
    }
    if (client.status !== 'active') throw new OAuthError(401, 'invalid_client', 'Client has been deactivated');

    // The partner acting for itself: reference data only, no customer, no consent.
    if (body.grant_type === 'client_credentials') {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(issueClientToken({ clientId: client.client_id }));
    }

    if (body.grant_type !== 'authorization_code') {
      throw new OAuthError(400, 'unsupported_grant_type', 'Only authorization_code and client_credentials are supported');
    }
    if (!body.code || !body.redirect_uri) {
      throw new OAuthError(400, 'invalid_request', 'code and redirect_uri are required');
    }

    const grant = await consentService.consumeAuthorizationCode(body.code, client.id, body.redirect_uri);
    if (!grant) throw new OAuthError(400, 'invalid_grant', 'Authorization code is invalid, expired, or already used');

    const token = issueAccessToken({
      clientId: client.client_id,
      consentId: grant.consentId,
      customerId: grant.customerId,
      scopes: grant.scopes,
    });

    res.setHeader('Cache-Control', 'no-store');
    res.json({ ...token, consent_id: grant.consentId });
  } catch (err) {
    next(err);
  }
});
