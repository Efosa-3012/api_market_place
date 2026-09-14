import bcrypt from 'bcryptjs';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
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
 * Login here is a mock. In production this is the bank's real identity
 * provider and none of this code exists.
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
    const { rows } = await pool.query<BankCustomer>(
      `SELECT bc.customer_id, bc.full_name
         FROM bank_sessions s JOIN bank_customers bc ON bc.customer_id = s.customer_id
        WHERE s.id::text = $1 AND s.expires_at > now()`,
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
    client: { client_id: c.client_public_id, name: c.client_name, description: c.client_description },
  };
}

function redirectWith(redirectUri: string, params: Record<string, string | undefined>) {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

// POST /bank/login — mock internet-banking login
const loginBody = z.object({ username: z.string().min(1), password: z.string().min(1) });

bankRouter.post('/login', async (req, res, next) => {
  try {
    const { username, password } = parse(loginBody, req.body);
    const { rows } = await pool.query<{ customer_id: string; full_name: string; password_hash: string }>(
      `SELECT customer_id, full_name, password_hash FROM bank_customers WHERE username = $1`,
      [username.toLowerCase()],
    );
    const customer = rows[0];
    if (!customer || !(await bcrypt.compare(password, customer.password_hash))) {
      throw ApiError.unauthorized('invalid_credentials', 'Incorrect username or password');
    }
    const session = await pool.query<{ id: string; expires_at: Date }>(
      `INSERT INTO bank_sessions (customer_id, expires_at)
       VALUES ($1, now() + ($2 || ' minutes')::interval) RETURNING id, expires_at`,
      [customer.customer_id, String(SESSION_TTL_MINUTES)],
    );
    res.json({
      session_token: session.rows[0]!.id,
      expires_at: session.rows[0]!.expires_at,
      customer: { customer_id: customer.customer_id, full_name: customer.full_name },
    });
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
    const consent = await consentService.get(String(req.params.id));
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
