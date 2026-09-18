import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';
import { authenticatePartner } from '../../middleware/authenticate.js';
import { partnerRateLimit } from '../../middleware/rateLimit.js';
import { BANKS, banksByCode, type Bank } from './banks.js';
import { BANK_CODE, NUBAN, SERIAL, generate, validate } from './nuban.js';

/**
 * Reference APIs: data about the banking system, not about any customer.
 * A partner calls these on its own behalf, so there is no consent to check —
 * only that the caller is a registered, active client. Same audit trail, same
 * per-client quota, same kill switch as the account APIs.
 */
export const referenceRouter = Router();

referenceRouter.use(authenticatePartner);
referenceRouter.use(partnerRateLimit);

function publicBank(b: Bank) {
  return { code: b.code, name: b.name, slug: b.slug, type: b.type };
}

// GET /api/v1/reference/banks?q=stan — every Nigerian bank with its CBN code
const banksQuery = z.object({
  q: z.string().trim().max(60).optional(),
  type: z.enum(['commercial', 'non_interest', 'merchant']).optional(),
});

referenceRouter.get('/banks', (req, res, next) => {
  try {
    const { q, type } = parse(banksQuery, req.query);
    const needle = q?.toLowerCase();
    const data = BANKS.filter(
      (b) =>
        (!type || b.type === type) &&
        (!needle || b.name.toLowerCase().includes(needle) || b.slug.includes(needle) || b.code === needle),
    ).map(publicBank);
    res.json({ data, meta: { total: data.length, source: 'CBN bank codes, maintained by the bank' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reference/banks/221
referenceRouter.get('/banks/:code', (req, res, next) => {
  try {
    const bank = banksByCode.get(String(req.params.code));
    if (!bank) throw ApiError.notFound('bank_not_found', 'No bank with that CBN code');
    res.json({ data: publicBank(bank) });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// NUBAN. Pure arithmetic over the CBN check-digit standard; GET because the
// result depends only on the inputs and nothing is stored.
// ---------------------------------------------------------------------------
const bankCodeField = z.string().regex(BANK_CODE, 'bank_code must be the 3-digit CBN bank code');

// GET /api/v1/reference/nuban/generate?bank_code=221&serial=000000012
const generateQuery = z.object({
  bank_code: bankCodeField,
  serial: z.string().regex(SERIAL, 'serial must be exactly 9 digits'),
});

referenceRouter.get('/nuban/generate', (req, res, next) => {
  try {
    const { bank_code, serial } = parse(generateQuery, req.query);
    const account_number = generate(bank_code, serial);
    res.json({
      data: {
        bank_code,
        bank_name: banksByCode.get(bank_code)?.name ?? null,
        serial,
        check_digit: Number(account_number[9]),
        account_number,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reference/nuban/validate?bank_code=221&account_number=0000000124
const validateQuery = z.object({
  bank_code: bankCodeField,
  account_number: z.string().regex(NUBAN, 'account_number must be exactly 10 digits'),
});

referenceRouter.get('/nuban/validate', (req, res, next) => {
  try {
    const { bank_code, account_number } = parse(validateQuery, req.query);
    const valid = validate(bank_code, account_number);
    res.json({
      data: {
        bank_code,
        bank_name: banksByCode.get(bank_code)?.name ?? null,
        account_number,
        valid,
        // The digit that *would* be right, so a form can say "did you mean …4?"
        expected_check_digit: Number(generate(bank_code, account_number.slice(0, 9))[9]),
      },
    });
  } catch (err) {
    next(err);
  }
});
