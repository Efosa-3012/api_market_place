import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { pool } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { issueAccessToken } from '../auth/tokens.js';
import { consentService } from '../consent/service.js';

/**
 * Stand-in for the sample fintech app's own backend.
 *
 * The demo app (BudgetBuddy) runs entirely in the browser, but the OAuth token
 * exchange needs the client secret — and a secret in browser code would make a
 * liar of everything else this platform demonstrates. So the exchange happens
 * here, on the server, exactly as it would on the fintech's own machine.
 *
 * This is NOT part of the product. In production the fintech operates this and
 * the bank never sees it — so hosting it is an explicit opt-in (DEMO_SAMPLE_APP),
 * and it will only ever act for the one seeded demo client.
 */
export const demoRouter = Router();

/** Indistinguishable from a route that was never mounted, which is the intent. */
const notEnabled = () =>
  ApiError.notFound('not_found', 'The demo endpoints are not available in this environment');

const exchangeBody = z.object({
  code: z.string().min(1),
  redirect_uri: z.string().url(),
});

// ---------------------------------------------------------------------------
// POST /demo/sample-app/token
//
// Same three steps /oauth/token performs — verify the client, consume the code,
// mint the token — reached directly rather than over HTTP to ourselves. The
// portal's sandbox tokens are minted the same way.
// ---------------------------------------------------------------------------
demoRouter.post('/sample-app/token', async (req, res, next) => {
  try {
    if (!config.DEMO_SAMPLE_APP) throw notEnabled();

    const body = parse(exchangeBody, req.body);

    const { rows } = await pool.query<{ id: string; redirect_uris: string[]; status: string }>(
      `SELECT id, redirect_uris, status FROM clients WHERE client_id = $1`,
      [config.DEMO_CLIENT_ID],
    );
    const client = rows[0];
    if (!client || client.status !== 'active') {
      throw ApiError.badRequest('demo_client_unavailable', 'The sample app client is not registered. Run `npm run seed`.');
    }
    if (!client.redirect_uris.includes(body.redirect_uri)) {
      throw ApiError.badRequest('invalid_redirect_uri', 'redirect_uri is not registered for the sample app');
    }

    const grant = await consentService.consumeAuthorizationCode(body.code, client.id, body.redirect_uri);
    if (!grant) {
      throw ApiError.badRequest(
        'invalid_grant',
        'That authorization code is invalid, expired, or already used. Start the connection again.',
      );
    }

    const token = issueAccessToken({
      clientId: config.DEMO_CLIENT_ID,
      consentId: grant.consentId,
      customerId: grant.customerId,
      scopes: grant.scopes,
    });

    res.setHeader('Cache-Control', 'no-store');
    // The customer's name is deliberately absent: a partner never receives it,
    // and the sample app should not pretend otherwise.
    res.json({ ...token, consent_id: grant.consentId });
  } catch (err) {
    next(err);
  }
});

// GET /demo/sample-app — what the sample app needs to start the flow, so the
// client_id and scopes live in one place instead of being hardcoded in the UI.
demoRouter.get('/sample-app', (_req, res, next) => {
  try {
    if (!config.DEMO_SAMPLE_APP) throw notEnabled();
    res.json({
      client_id: config.DEMO_CLIENT_ID,
      scopes: ['accounts:read', 'balances:read', 'transactions:read'],
      authorize_url: '/oauth/authorize',
    });
  } catch (err) {
    next(err);
  }
});
