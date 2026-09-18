/**
 * Detail pages for the catalogue. Paths and shapes mirror backend/openapi/openapi.yaml.
 */
export type ApiDetails = {
  id: string
  name: string
  category: string
  summary: string
  overview: string
  useCases: { title: string; description: string }[]
  features: string[]
  method: 'GET' | 'POST'
  path: string
  request: Record<string, unknown> | null
  /** What the gateway actually returns — same fields as backend/src/modules/resources/routes.ts. */
  exampleResponse: Record<string, unknown>
  paid: boolean
}

/**
 * What the gateway enforces on every product. Mirrors the backend defaults
 * (RATE_LIMIT_MAX, ACCESS_TOKEN_TTL_SECONDS, CONSENT_TTL_DAYS) and the figures
 * the Documentation tab quotes, so the two never disagree.
 */
export const INTEGRATION_FACTS = {
  auth: 'OAuth 2.0',
  rateLimit: '60 / min',
  tokenLife: '24 h',
  consentLife: '90 days',
  pricing: 'Free in sandbox',
} as const

export const apiDetails: ApiDetails[] = [
  {
    id: 'accounts-api',
    name: 'Accounts API',
    category: 'Accounts',
    summary: 'List the accounts a customer has agreed to share.',
    overview:
      'Returns only the accounts the customer ticked on the consent screen — never their full portfolio. Account numbers are masked and internal fields (branch, relationship manager, ledger internals) are never exposed.',
    useCases: [
      { title: 'Account aggregation', description: 'Show a customer all their Stanbic accounts inside your app.' },
      { title: 'Onboarding', description: 'Confirm a customer holds an account before offering a product.' },
      { title: 'Account selection', description: 'Let a customer pick which account a feature should use.' },
      { title: 'Reconciliation', description: 'Match your records to the bank’s account identifiers.' },
    ],
    features: [
      'GET /api/v1/accounts — every consented account',
      'GET /api/v1/accounts/{accountId} — one account',
      'Masked account numbers; no internal bank fields',
      '404 for any account outside the consent (no probing)',
      'Per-client rate limit with RateLimit-* headers',
      'Available in the sandbox with seeded demo customers',
    ],
    method: 'GET',
    path: '/api/v1/accounts',
    request: null,
    exampleResponse: {
      data: [
        {
          account_id: 'acct-demo-001',
          account_number_masked: '****0001',
          account_type: 'current',
          currency: 'NGN',
          status: 'active',
          opened_at: '2025-06-01T00:00:00Z',
        },
      ],
      meta: { consent_id: '3f0c1d2e-8a4b-4c1f-9e2d-7b6a5c4d3e2f' },
    },
    paid: false,
  },
  {
    id: 'balances-api',
    name: 'Balances API',
    category: 'Accounts',
    summary: 'Available and ledger balances for a consented account.',
    overview:
      'Each balance carries a type (available, ledger), amount, currency, credit limit and an as-of timestamp. Amounts are decimal strings — never floats — so nothing is lost in transit. Works only on an account the customer chose to share.',
    useCases: [
      { title: 'Balance widgets', description: 'Show a live balance next to a payment or savings goal.' },
      { title: 'Affordability checks', description: 'Confirm funds before a customer commits to a purchase plan.' },
      { title: 'Cash-flow views', description: 'Roll balances across accounts into one picture.' },
      { title: 'Alerts', description: 'Notify a customer when a balance crosses a threshold.' },
    ],
    features: [
      'GET /api/v1/accounts/{accountId}/balances',
      'Available and ledger balance types',
      'Decimal-string amounts with currency code',
      'as_of timestamp on every balance',
      'Consent and scope checked on every call',
      'Multi-currency (NGN, USD, GBP demo accounts)',
    ],
    method: 'GET',
    path: '/api/v1/accounts/{accountId}/balances',
    request: null,
    exampleResponse: {
      data: [
        {
          account_id: 'acct-demo-001',
          type: 'available',
          amount: '1250500.50',
          currency: 'NGN',
          credit_limit: '0.00',
          as_of: '2026-09-17T08:42:11Z',
        },
      ],
    },
    paid: false,
  },
  {
    id: 'transactions-api',
    name: 'Transactions API',
    category: 'Accounts',
    summary: 'Paginated, filterable transaction history.',
    overview:
      'Cursor-paginated transactions with amount, direction, reference, narration, counterparty, booking and value dates. Filter by date range, direction and sort order. Pass meta.pagination.next_cursor back as cursor for the next page.',
    useCases: [
      { title: 'Budgeting apps', description: 'Categorise spending and show trends over time.' },
      { title: 'Lending decisions', description: 'Assess income and outgoings from real transaction data.' },
      { title: 'Accounting tools', description: 'Import bank transactions for bookkeeping and reconciliation.' },
      { title: 'Fraud and anomaly detection', description: 'Flag unusual patterns with the customer’s consent.' },
    ],
    features: [
      'GET /api/v1/accounts/{accountId}/transactions',
      'Query: limit (1–100), cursor, from, to, type (credit|debit), sort',
      'Opaque cursor pagination via meta.pagination.next_cursor',
      'Decimal-string amounts, ISO 8601 dates',
      'Running balance and other ledger internals withheld',
      'Consent and scope checked on every call',
    ],
    method: 'GET',
    path: '/api/v1/accounts/{accountId}/transactions?limit=20&type=debit',
    request: null,
    exampleResponse: {
      data: [
        {
          transaction_id: 'txn-001-004',
          account_id: 'acct-demo-001',
          type: 'debit',
          amount: '45000.00',
          currency: 'NGN',
          reference: 'POS-202609-001',
          narration: 'POS purchase - Shoprite Lekki',
          counterparty: 'Shoprite Nigeria',
          booked_at: '2026-09-15T14:07:22Z',
          value_date: '2026-09-15T14:07:22Z',
        },
      ],
      meta: { pagination: { limit: 20, has_more: true, next_cursor: 'eyJiIjoiMjAyNi0wOS0xNVQxNDowNzoyMloifQ' } },
    },
    paid: false,
  },
  {
    id: 'consent-api',
    name: 'Consent & Authorization',
    category: 'Consent',
    summary: 'How your app obtains — and loses — permission.',
    overview:
      'Standard OAuth 2.0 authorization-code flow. Send the customer to /oauth/authorize; they log in and approve on the bank’s own pages; you receive a single-use code and exchange it at /oauth/token for a bearer token bound to that consent. Tokens live 24 hours; consents live 90 days; the customer can revoke at any time and the next call fails with consent_revoked.',
    useCases: [
      { title: 'Connect my bank', description: 'The button every fintech needs — one redirect, no credentials handled.' },
      { title: 'Scoped access', description: 'Ask only for what you need: accounts, balances, transactions.' },
      { title: 'Customer control', description: 'Access ends when the customer says so, without changing their password.' },
      { title: 'Blast-radius containment', description: 'A compromised app is deactivated once and every consent under it dies.' },
    ],
    features: [
      'GET /oauth/authorize — start the flow (response_type=code)',
      'POST /oauth/token — exchange the code (Basic auth: client_id:client_secret)',
      'Single-use codes, 5-minute expiry',
      'JWT access tokens bound to one consent, 24-hour lifetime',
      'Consent re-checked on every API call — revocation is instant',
      'RFC 6749 error responses',
    ],
    method: 'POST',
    path: '/oauth/token',
    request: {
      grant_type: 'authorization_code',
      code: '<code from the redirect>',
      redirect_uri: 'http://localhost:3000/callback',
    },
    exampleResponse: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
      token_type: 'Bearer',
      expires_in: 86400,
      scope: 'accounts:read balances:read transactions:read',
      consent_id: '3f0c1d2e-8a4b-4c1f-9e2d-7b6a5c4d3e2f',
    },
    paid: false,
  },
]

/**
 * Reference products: about the banking system, not about a customer. No
 * consent screen, no account selection — any token from an active client.
 */
export const referenceApiDetails: ApiDetails[] = [
  {
    id: 'bank-list-api',
    name: 'Bank List',
    category: 'Reference',
    summary: 'Every Nigerian bank with its CBN code.',
    overview:
      'The list of deposit money banks the CBN licenses, each with the 3-digit code that transfer systems route on and that the NUBAN check digit is computed from. Maintained by the bank, so a partner never ships a stale hard-coded list. Filter by name, slug or code, or by bank type.',
    useCases: [
      { title: 'Account forms', description: 'Populate a bank picker that is always current.' },
      { title: 'Transfer routing', description: 'Resolve a bank name to the code the rails expect.' },
      { title: 'Data cleansing', description: 'Normalise bank names in imported payment files.' },
      { title: 'Reconciliation', description: 'Map the codes on your statements back to bank names.' },
    ],
    features: [
      'GET /api/v1/reference/banks — every bank, optional ?q= and ?type=',
      'GET /api/v1/reference/banks/{code} — one bank by CBN code',
      'Commercial, non-interest and merchant banks',
      'Stable slugs for your own records',
      'Works with a client_credentials token — no customer needed',
      'Same per-client quota and audit trail as every other product',
    ],
    method: 'GET',
    path: '/api/v1/reference/banks?q=stanbic',
    request: null,
    exampleResponse: {
      data: [{ code: '221', name: 'Stanbic IBTC Bank', slug: 'stanbic-ibtc', type: 'commercial' }],
      meta: { total: 1, source: 'CBN bank codes, maintained by the bank' },
    },
    paid: false,
  },
  {
    id: 'nuban-api',
    name: 'NUBAN Validator',
    category: 'Reference',
    summary: 'Generate or verify the check digit on a 10-digit account number.',
    overview:
      'A NUBAN is a 9-digit serial plus a check digit computed from the bank’s CBN code — weights 3, 7, 3 over the twelve digits, then (10 − sum mod 10) mod 10. Validate an account number a customer typed before you send money to it, or generate the check digit for a serial you hold. Pure arithmetic: nothing is stored, nothing is looked up.',
    useCases: [
      { title: 'Pre-transfer checks', description: 'Reject a mistyped account number before the transfer is attempted.' },
      { title: 'Payment file validation', description: 'Screen a batch of beneficiaries for bad numbers in one pass.' },
      { title: 'Onboarding forms', description: 'Show “did you mean …4?” as the customer types.' },
      { title: 'Core system migration', description: 'Generate compliant numbers for accounts you issue.' },
    ],
    features: [
      'GET /api/v1/reference/nuban/validate — bank_code + account_number → valid, expected_check_digit',
      'GET /api/v1/reference/nuban/generate — bank_code + serial → account_number',
      'CBN Revised Standards on NUBAN, 3-digit bank codes',
      '400 with a clear message for malformed input',
      'Works with a client_credentials token — no customer needed',
      'Deterministic and side-effect free',
    ],
    method: 'GET',
    path: '/api/v1/reference/nuban/validate?bank_code=221&account_number=0000000124',
    request: null,
    exampleResponse: {
      data: { bank_code: '221', bank_name: 'Stanbic IBTC Bank', account_number: '0000000124', valid: true, expected_check_digit: 4 },
    },
    paid: false,
  },
]

export function findApiDetails(id?: string) {
  return [...apiDetails, ...referenceApiDetails].find((api) => api.id === id)
}
