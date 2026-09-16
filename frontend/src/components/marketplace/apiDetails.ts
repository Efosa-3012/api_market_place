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
  paid: boolean
}

export const apiDetails: ApiDetails[] = [
  {
    id: 'accounts-api',
    name: 'Accounts API',
    category: 'Accounts',
    summary: 'List the accounts a customer has agreed to share.',
    overview:
      'Returns only the accounts the customer ticked on the consent screen — never their full portfolio. Account numbers are masked and internal fields (branch, relationship manager, ledger internals) are never exposed. Requires the accounts:read scope.',
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
    paid: false,
  },
  {
    id: 'balances-api',
    name: 'Balances API',
    category: 'Accounts',
    summary: 'Available and ledger balances for a consented account.',
    overview:
      'Each balance carries a type (available, ledger), amount, currency, credit limit and an as-of timestamp. Amounts are decimal strings — never floats — so nothing is lost in transit. Requires the balances:read scope and an account the customer shared.',
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
    paid: false,
  },
  {
    id: 'transactions-api',
    name: 'Transactions API',
    category: 'Accounts',
    summary: 'Paginated, filterable transaction history.',
    overview:
      'Cursor-paginated transactions with amount, direction, reference, narration, counterparty, booking and value dates. Filter by date range, direction and sort order. Pass meta.pagination.next_cursor back as cursor for the next page. Requires the transactions:read scope.',
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
    paid: false,
  },
]

export function findApiDetails(id?: string) {
  return apiDetails.find((api) => api.id === id)
}
