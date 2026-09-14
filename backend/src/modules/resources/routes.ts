import { Router } from 'express';
import { z } from 'zod';
import { coreBanking, type Account, type Balance } from '../../core-banking/index.js';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { authenticate, requireConsentedAccount, requireScope } from '../../middleware/authenticate.js';
import { partnerRateLimit } from '../../middleware/rateLimit.js';

/**
 * Partner-facing resource APIs. Every route runs through:
 *   authenticate  -> valid token, active client, consent authorised & unexpired
 *   rate limit    -> per client
 *   requireScope  -> the consent actually covers this resource type
 *   consented acct-> the account is one the customer chose to share
 *
 * Responses expose a deliberately narrower shape than the core banking model:
 * internal fields (BVN, account manager, ledger internals) never leave the bank.
 */
export const resourcesRouter = Router();

resourcesRouter.use(authenticate, partnerRateLimit);

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
const transactionsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(['credit', 'debit']).optional(),
  sort: z.enum(['booked_at_desc', 'booked_at_asc']).optional(),
});

resourcesRouter.get(
  '/accounts/:accountId/transactions',
  requireScope('transactions:read'),
  requireConsentedAccount,
  async (req, res, next) => {
    try {
      const q = parse(transactionsQuery, req.query);
      const page = await coreBanking.listTransactions(String(req.params.accountId), q);
      res.json({
        data: page.items.map((t) => ({
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
        })),
        meta: { pagination: page.pagination },
      });
    } catch (err) {
      next(err);
    }
  },
);
