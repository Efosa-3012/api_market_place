import { Router } from 'express';
import { z } from 'zod';
import { coreBanking, type Account, type Balance, type Transaction } from '../../core-banking/index.js';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { authenticate, requireConsentedAccount, requireScope } from '../../middleware/authenticate.js';
import { partnerRateLimit } from '../../middleware/rateLimit.js';

/**
 * Partner-facing resource APIs. Every route runs through:
 *   authenticate  -> valid token, active client, consent authorised & unexpired
 *   rate limit    -> per-client quota, keyed on client_id (never on IP)
 *   requireScope  -> the consent actually covers this resource type
 *   consented acct-> the account is one the customer chose to share
 *
 * Responses expose a deliberately narrower shape than the core banking model:
 * internal fields (BVN, account manager, ledger internals) never leave the bank.
 */
export const resourcesRouter = Router();

resourcesRouter.use(authenticate);
resourcesRouter.use(partnerRateLimit); // per-client quota, keyed on the token's client_id

function publicAccount(a: Account) {
  return {
    account_id: a.account_id,
    account_number_masked: `****${a.account_number.slice(-4)}`,
    account_type: a.account_type,
    currency: a.currency,
    status: a.status,
    opened_at: a.account_opening_date,
  };
}

/** `available_balance` is a ledger internal — partners get the stated amount only. */
function publicBalance(b: Balance) {
  return {
    account_id: b.account_id,
    type: b.type,
    amount: b.amount,
    currency: b.currency,
    credit_limit: b.credit_limit,
    as_of: b.as_of,
  };
}

/** `running_balance` reveals the ledger position between entries — stays inside the bank. */
function publicTransaction(t: Transaction) {
  return {
    transaction_id: t.transaction_id,
    account_id: t.account_id,
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    reference: t.reference,
    narration: t.narration,
    counterparty: t.counterparty,
    booked_at: t.booked_at,
    value_date: t.value_date,
  };
}

// GET /api/v1/accounts — only the accounts the customer approved
resourcesRouter.get('/accounts', requireScope('accounts:read'), async (req, res, next) => {
  try {
    const { customerId, accountIds, consentId } = req.auth!;
    const all = await coreBanking.listCustomerAccounts(customerId);
    const data = all.filter((a) => accountIds.includes(a.account_id)).map(publicAccount);
    res.json({ data, meta: { consent_id: consentId } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/accounts/:accountId
resourcesRouter.get(
  '/accounts/:accountId',
  requireScope('accounts:read'),
  requireConsentedAccount,
  async (req, res, next) => {
    try {
      const account = await coreBanking.getAccount(String(req.params.accountId));
      if (!account) throw ApiError.notFound('account_not_found', 'Account not found');
      res.json({ data: publicAccount(account) });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/accounts/:accountId/balances
resourcesRouter.get(
  '/accounts/:accountId/balances',
  requireScope('balances:read'),
  requireConsentedAccount,
  async (req, res, next) => {
    try {
      const balances = await coreBanking.listBalances(String(req.params.accountId));
      res.json({ data: balances.map(publicBalance) });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/accounts/:accountId/transactions
// Query params are validated here and handed to the adapter unchanged; the
// adapter owns the cursor, so we pass its pagination object straight back.
const isoDateLike = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Must be an ISO 8601 date or date-time');

const transactionQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
  from: isoDateLike.optional(),
  to: isoDateLike.optional(),
  type: z.enum(['credit', 'debit']).optional(),
  sort: z.enum(['booked_at_desc', 'booked_at_asc']).optional(),
});

resourcesRouter.get(
  '/accounts/:accountId/transactions',
  requireScope('transactions:read'),
  requireConsentedAccount,
  async (req, res, next) => {
    try {
      const query = parse(transactionQuery, req.query);
      const page = await coreBanking.listTransactions(String(req.params.accountId), query);
      res.json({ data: page.items.map(publicTransaction), meta: { pagination: page.pagination } });
    } catch (err) {
      next(err);
    }
  },
);
