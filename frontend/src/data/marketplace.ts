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
    },
]
