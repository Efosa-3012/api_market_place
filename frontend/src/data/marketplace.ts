/**
 * The catalogue. Every entry here is a real, callable product on the gateway —
 * see backend/openapi/openapi.yaml. Add an entry only when the endpoint exists.
 */
export interface MarketplaceApi {
    id: string
    category: string
    title: string
    description: string
    pricing: 'Free' | 'Paid'
    authentication: 'OAuth 2.0'
    popularity: 'Most used' | 'Trending' | 'New'
    /** Only 'live' products have a working backend. */
    availability: 'live' | 'coming-soon'
    /** OAuth scope a consent must include to call it. */
    scope: string
    /** Gateway routes that make up the product; how the admin catalogue attributes usage. */
    endpoints: { method: string; path: string }[]
}

export const marketplaceApis: MarketplaceApi[] = [
    {
        id: 'accounts-api',
        category: 'Accounts',
        title: 'Accounts API',
        description:
            "List the accounts a customer has chosen to share, with type, currency, status and a masked account number. The entry point for every account-information integration.",
        pricing: 'Free',
        authentication: 'OAuth 2.0',
        popularity: 'Most used',
        availability: 'live',
        scope: 'accounts:read',
        endpoints: [
            { method: 'GET', path: '/api/v1/accounts' },
            { method: 'GET', path: '/api/v1/accounts/{accountId}' },
        ],
    },
    {
        id: 'balances-api',
        category: 'Accounts',
        title: 'Balances API',
        description:
            'Current available and ledger balances for a consented account. Power balance widgets, affordability checks and cash-flow views.',
        pricing: 'Free',
        authentication: 'OAuth 2.0',
        popularity: 'Most used',
        availability: 'live',
        scope: 'balances:read',
        endpoints: [{ method: 'GET', path: '/api/v1/accounts/{accountId}/balances' }],
    },
    {
        id: 'transactions-api',
        category: 'Accounts',
        title: 'Transactions API',
        description:
            'Paginated transaction history for a consented account, filterable by date range and direction. Built for budgeting, reconciliation and lending decisions.',
        pricing: 'Free',
        authentication: 'OAuth 2.0',
        popularity: 'Trending',
        availability: 'live',
        scope: 'transactions:read',
        endpoints: [{ method: 'GET', path: '/api/v1/accounts/{accountId}/transactions' }],
    },
    {
        id: 'consent-api',
        category: 'Consent',
        title: 'Consent & Authorization',
        description:
            "The OAuth 2.0 authorization-code flow every partner uses to obtain a customer's permission: scoped, time-limited, and revocable by the customer at any moment.",
        pricing: 'Free',
        authentication: 'OAuth 2.0',
        popularity: 'New',
        availability: 'live',
        scope: '—',
        endpoints: [
            { method: 'GET', path: '/oauth/authorize' },
            { method: 'POST', path: '/oauth/token' },
        ],
    },

    // ------------------------------------------------------------------
    // Roadmap. Listed so partners can see where the platform is going, but
    // not callable: each needs a capability the core does not expose yet
    // (name lookup by account number, credit decisioning, a transfer rail).
    // Flip to 'live' only when the gateway route exists.
    // ------------------------------------------------------------------
    {
        id: 'confirmation-of-payee-api',
        category: 'Payments',
        title: 'Confirmation of Payee',
        description:
            'Check that the name a customer typed matches the account they are about to pay, before any money moves. Built to stop authorised push-payment fraud on NIP transfers.',
        pricing: 'Free',
        authentication: 'OAuth 2.0',
        popularity: 'New',
        availability: 'coming-soon',
        scope: 'payee:confirm',
        endpoints: [],
    },
    {
        id: 'loan-eligibility-api',
        category: 'Lending',
        title: 'Loan Eligibility',
        description:
            'A yes/no pre-approval and an indicative limit for a consenting customer, so a marketplace can offer finance at checkout. Returns a decision, never the score behind it.',
        pricing: 'Paid',
        authentication: 'OAuth 2.0',
        popularity: 'New',
        availability: 'coming-soon',
        scope: 'loans:eligibility',
        endpoints: [],
    },
    {
        id: 'payment-initiation-api',
        category: 'Payments',
        title: 'Payment Initiation',
        description:
            'Pay-by-bank: push an account-to-account transfer from a consenting customer, with a one-time code on every payment, amount limits and idempotency keys. The first write scope on the platform.',
        pricing: 'Paid',
        authentication: 'OAuth 2.0',
        popularity: 'New',
        availability: 'coming-soon',
        scope: 'payments:initiate',
        endpoints: [],
    },
]
