import { Router } from 'express';
import { coreBanking, type Account } from '../../core-banking/index.js';
import { ApiError } from '../../lib/errors.js';
import { authenticate, requireConsentedAccount, requireScope } from '../../middleware/authenticate.js';

/**
 * Partner-facing resource APIs. Every route runs through:
 *   authenticate  -> valid token, active client, consent authorised & unexpired
 *   requireScope  -> the consent actually covers this resource type
 *   consented acct-> the account is one the customer chose to share
 *
 * Responses expose a deliberately narrower shape than the core banking model:
 * internal fields (BVN, account manager, ledger internals) never leave the bank.
 */
export const resourcesRouter = Router();

resourcesRouter.use(authenticate);

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
