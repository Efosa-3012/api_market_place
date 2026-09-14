export interface MarketplaceApi {
    id: string
    category: string
    title: string
    description: string
    pricing: 'Free' | 'Paid'
    authentication: 'OAuth 2.0' | 'API Key'
    popularity: 'Most used' | 'Trending' | 'New'
}

export const marketplaceApis: MarketplaceApi[] = [
    {
        id: 'transfer-api',
        category: 'Payments',
        title: 'Transfer API',
        description:
            'Build reliable payment experiences with the Stanbic IBTC Transfer API. Initiate, manage, and track transfers between bank accounts and digital wallets through secure, consent-driven integrations.',
        pricing: 'Paid',
        authentication: 'OAuth 2.0',
        popularity: 'Most used',
    },
    {
        id: 'account-information',
        category: 'Accounts',
        title: 'Connect to account information',
        description:
            'Access approved account details, balances, and transaction information.',
        pricing: 'Paid',
        authentication: 'OAuth 2.0',
        popularity: 'Most used',
    },
    {
        id: 'identity-verification',
        category: 'Identity',
        title: 'Verify with confidence',
        description:
            'Build customer onboarding and verification experiences with identity services.',
        pricing: 'Free',
        authentication: 'API Key',
        popularity: 'Trending',
    },
    {
        id: 'account-transfers',
        category: 'Transfers',
        title: 'Enable account-to-account transfers',
        description:
            'Create seamless transfer experiences through secure banking connections.',
        pricing: 'Free',
        authentication: 'OAuth 2.0',
        popularity: 'Trending',
    },
    {
        id: 'card-services',
        category: 'Cards',
        title: 'Build card-powered experiences',
        description:
            'Explore card-related capabilities for your financial products and services.',
        pricing: 'Free',
        authentication: 'API Key',
        popularity: 'New',
    },
    {
        id: 'lending-services',
        category: 'Loans',
        title: 'Create smarter lending experiences',
        description:
            'Build lending products and services using connected banking capabilities.',
        pricing: 'Free',
        authentication: 'OAuth 2.0',
        popularity: 'New',
    },
    {
        id: 'exchange-rates',
        category: 'Forex',
        title: 'Explore foreign exchange rates',
        description:
            'Use sample exchange-rate data to prototype international payment experiences.',
        pricing: 'Paid',
        authentication: 'API Key',
        popularity: 'Trending',
    },
    {
        id: 'bank-directory',
        category: 'Others',
        title: 'Discover bank information',
        description:
            'Explore a sample bank directory to support your payment forms and integrations.',
        pricing: 'Free',
        authentication: 'API Key',
        popularity: 'New',
    },
]