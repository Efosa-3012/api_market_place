import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { config } from '../../config.js';
import { coreBanking } from '../../core-banking/index.js';
import { pool } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { consentService, type ConsentWithClient } from '../consent/service.js';

/**
 * Backend for the bank's own UI — the pages the customer sees on the bank's
 * domain: login, the consent screen, and Connected Apps. These are NOT
 * partner-facing; the fintech never calls them.
 *
 * Login is delegated to the core banking service's identity provider; the
 * marketplace never sees or stores a customer password. What lives here is
 * gateway policy around that login: sessions and the failed-attempt lockout.
 */
export const bankRouter = Router();

const SESSION_TTL_MINUTES = 30;

interface BankCustomer {
  customer_id: string;
  full_name: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    bankCustomer?: BankCustomer;
  }
}

/** Authorization: Bearer <session id> issued by POST /bank/login */
const requireBankSession: RequestHandler = async (req, _res, next) => {
  try {
    const [scheme, sessionId] = (req.header('authorization') ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !sessionId) {
      throw ApiError.unauthorized('bank_session_required', 'Log in to your bank account first');
    }
    const { rows } = await pool.query<{ customer_id: string; full_name: string }>(
      `SELECT customer_id, full_name FROM bank_sessions WHERE id::text = $1 AND expires_at > now()`,
      [sessionId],
    );
    if (!rows[0]) throw ApiError.unauthorized('bank_session_expired', 'Your session has expired, log in again');
    req.bankCustomer = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

function publicConsent(c: ConsentWithClient) {
  return {
    id: c.id,
    status: c.status,
    scopes: c.scopes,
    account_ids: c.account_ids,
    created_at: c.created_at,
    authorised_at: c.authorised_at,
    expires_at: c.expires_at,
    revoked_at: c.revoked_at,
    client: {
      client_id: c.client_public_id,
      name: c.client_name,
      description: c.client_description,
      website_url: c.client_website_url,
      privacy_policy_url: c.client_privacy_policy_url,
      logo_url: c.client_logo_url,
      registered_at: c.client_created_at,
    },
  };
}

function redirectWith(redirectUri: string, params: Record<string, string | undefined>) {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Failed-login lockout. Per username, so it works through proxies and NATs
// where the per-IP limit cannot tell customers apart.
// ---------------------------------------------------------------------------
async function assertNotLocked(username: string) {
  const { rows } = await pool.query<{ locked_until: Date | null }>(
    `SELECT locked_until FROM bank_login_attempts WHERE username = $1`,
    [username],
  );
  const until = rows[0]?.locked_until;
  if (until && until.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
    throw new ApiError(423, 'account_locked', `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }
}

async function recordFailure(username: string) {
  await pool.query(
    `INSERT INTO bank_login_attempts (username, failed_count, updated_at) VALUES ($1, 1, now())
     ON CONFLICT (username) DO UPDATE SET
       failed_count = CASE WHEN bank_login_attempts.locked_until IS NOT NULL AND bank_login_attempts.locked_until < now()
                           THEN 1 ELSE bank_login_attempts.failed_count + 1 END,
       locked_until = CASE WHEN (CASE WHEN bank_login_attempts.locked_until IS NOT NULL AND bank_login_attempts.locked_until < now()
                                      THEN 1 ELSE bank_login_attempts.failed_count + 1 END) >= $2
                           THEN now() + ($3 || ' minutes')::interval ELSE NULL END,
       updated_at = now()`,
    [username, config.LOGIN_MAX_FAILURES, String(config.LOGIN_LOCKOUT_MINUTES)],
  );
}

async function clearFailures(username: string) {
  await pool.query(`DELETE FROM bank_login_attempts WHERE username = $1`, [username]);
}

// POST /bank/login — internet-banking login, delegated to the core's identity provider
const loginBody = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) });

bankRouter.post('/login', async (req, res, next) => {
  try {
    const { username: rawUsername, password } = parse(loginBody, req.body);
    const username = rawUsername.trim().toLowerCase();

    await assertNotLocked(username);

    const auth = await coreBanking.authenticateCustomer(username, password);
    if (!auth) {
      await recordFailure(username);
      throw ApiError.unauthorized('invalid_credentials', 'Incorrect username or password');
    }
    await clearFailures(username);

    const profile = await coreBanking.getCustomer(auth.customer_id);
    const fullName = profile?.full_name ?? username;

    const session = await pool.query<{ id: string; expires_at: Date }>(
      `INSERT INTO bank_sessions (customer_id, full_name, expires_at)
       VALUES ($1, $2, now() + ($3 || ' minutes')::interval) RETURNING id, expires_at`,
      [auth.customer_id, fullName, String(SESSION_TTL_MINUTES)],
    );
    res.json({
      session_token: session.rows[0]!.id,
      expires_at: session.rows[0]!.expires_at,
      customer: { customer_id: auth.customer_id, full_name: fullName },
    });
  } catch (err) {
    next(err);
  }
});

// POST /bank/logout — end the session server-side, not just in the browser
bankRouter.post('/logout', requireBankSession, async (req, res, next) => {
  try {
    const [, sessionId] = (req.header('authorization') ?? '').split(' ');
    await pool.query(`DELETE FROM bank_sessions WHERE id::text = $1`, [sessionId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

bankRouter.get('/me', requireBankSession, (req, res) => {
  res.json({ customer: req.bankCustomer });
});

// GET /bank/consents/:id — everything the consent screen needs to render
bankRouter.get('/consents/:id', requireBankSession, async (req, res, next) => {
  try {
    const consent = await consentService.openForCustomer(String(req.params.id), req.bankCustomer!.customer_id);
    const accounts = await coreBanking.listCustomerAccounts(req.bankCustomer!.customer_id);
    res.json({
      consent: publicConsent(consent),
      accounts: accounts.map((a) => ({
        account_id: a.account_id,
        account_number: a.account_number,
        account_type: a.account_type,
        currency: a.currency,
        status: a.status,
        account_balance: a.account_balance,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /bank/consents/:id/authorise — the customer taps Approve
const authoriseBody = z.object({ account_ids: z.array(z.string().min(1)).min(1) });

bankRouter.post('/consents/:id/authorise', requireBankSession, async (req, res, next) => {
  try {
    const { account_ids } = parse(authoriseBody, req.body);
    const customerId = req.bankCustomer!.customer_id;

    // The customer may only share accounts they actually own.
    const owned = new Set((await coreBanking.listCustomerAccounts(customerId)).map((a) => a.account_id));
    const foreign = account_ids.filter((id) => !owned.has(id));
    if (foreign.length > 0) {
      throw ApiError.badRequest('invalid_account_selection', 'One or more selected accounts do not belong to you');
    }

    const { consent, code } = await consentService.authorise(String(req.params.id), customerId, account_ids);
    res.json({
      consent_id: consent.id,
      status: consent.status,
      expires_at: consent.expires_at,
      redirect_to: redirectWith(consent.redirect_uri, { code, state: consent.state ?? undefined }),
    });
  } catch (err) {
    next(err);
  }
});

// POST /bank/consents/:id/reject — the customer taps Deny
bankRouter.post('/consents/:id/reject', requireBankSession, async (req, res, next) => {
  try {
    const consent = await consentService.reject(String(req.params.id), req.bankCustomer!.customer_id);
    res.json({
      consent_id: consent.id,
      status: consent.status,
      redirect_to: redirectWith(consent.redirect_uri, {
        error: 'access_denied',
        error_description: 'The customer declined the request',
        state: consent.state ?? undefined,
      }),
    });
  } catch (err) {
    next(err);
  }
});

// GET /bank/connected-apps — what the customer has shared, and with whom
bankRouter.get('/connected-apps', requireBankSession, async (req, res, next) => {
  try {
    const consents = await consentService.listForCustomer(req.bankCustomer!.customer_id);
    res.json({ data: consents.map(publicConsent) });
  } catch (err) {
    next(err);
  }
});

// POST /bank/connected-apps/:consentId/revoke — the customer takes access back
bankRouter.post('/connected-apps/:consentId/revoke', requireBankSession, async (req, res, next) => {
  try {
    const consent = await consentService.revoke(String(req.params.consentId), 'customer', req.bankCustomer!.customer_id);
    res.json({ consent_id: consent.id, status: consent.status, revoked_at: consent.revoked_at });
  } catch (err) {
    next(err);
  }
});
