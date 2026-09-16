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
    id: 'transfer-api',
    name: 'Transfer API',
    category: 'Payments',
    summary: 'Move money securely between bank accounts and digital wallets.',
    overview:
      'Whether you’re building a fintech app, payroll platform, or e-commerce solution, the Transfer API provides a way to initiate and manage fund transfers from your application.',
    useCases: [
      {
        title: 'Peer-to-Peer Payments',
        description: 'Send money between users.',
      },
      {
        title: 'Business Disbursements',
        description: 'Pay vendors, suppliers, and contractors.',
      },
      {
        title: 'Payroll Systems',
        description: 'Process employee salary payments.',
      },
      {
        title: 'E-commerce Platforms',
        description: 'Settle merchants and process payouts.',
      },
    ],
    features: [
      'Initiate single and bulk transfers',
      'Validate beneficiary details',
      'Track transaction status',
      'Receive transaction notifications',
      'Available in Sandbox and Production',
      'Support for NGN transactions',
    ],
    method: 'POST',
    path: '/v1/transfers',
    request: {
      amount: 25000,
      currency: 'NGN',
      beneficiaryAccount: '0123456789',
      bankCode: '221',
      reference: 'PAY-102394',
      narration: 'Test transfer from sandbox',
    },
    paid: true,
  },
  {
    id: 'account-information',
    name: 'Accounts API',
    category: 'Accounts',
    summary: 'Connect to account information.',
    overview:
      'Build account views using approved account details, balances, and transaction information.',
    useCases: [
      {
        title: 'Account Dashboards',
        description: 'Display account information.',
      },
      { title: 'Budgeting Apps', description: 'Organize transaction history.' },
      {
        title: 'Reconciliation',
        description: 'Compare balances and transactions.',
      },
      { title: 'Finance Tools', description: 'Support account reporting.' },
    ],
    features: [
      'Retrieve account details',
      'Check account balances',
      'Read transaction history',
      'Use approved customer access',
    ],
    method: 'GET',
    path: '/v1/accounts/balance?accountId=YOUR_ACCOUNT_ID',
    request: null,
    paid: true,
  },
  {
    id: 'identity-verification',
    name: 'Identity Verification API',
    category: 'Identity & KYC',
    summary: 'Verify with confidence.',
    overview:
      'Support customer onboarding and verification workflows with identity services.',
    useCases: [
      { title: 'Onboarding', description: 'Collect verification results.' },
      {
        title: 'Customer Profiles',
        description: 'Check identity information.',
      },
      {
        title: 'Verification Workflows',
        description: 'Track verification status.',
      },
      { title: 'Service Access', description: 'Support identity checks.' },
    ],
    features: [
      'Submit identity details',
      'Retrieve verification results',
      'Track verification status',
      'Test with sandbox data',
    ],
    method: 'POST',
    path: '/v1/identity/verify',
    request: {
      customerReference: 'CUSTOMER-001',
      identityType: 'BVN',
      identityNumber: 'SANDBOX_TEST_VALUE',
    },
    paid: false,
  },
  {
    id: 'account-transfers',
    name: 'Account Transfers API',
    category: 'Transfers',
    summary: 'Enable account-to-account transfers.',
    overview: 'Create transfer experiences between connected bank accounts.',
    useCases: [
      { title: 'Wallet Funding', description: 'Move funds between accounts.' },
      { title: 'Business Payments', description: 'Support account payouts.' },
      {
        title: 'Scheduled Transfers',
        description: 'Build recurring payment flows.',
      },
      { title: 'Transfer Tracking', description: 'Show transaction progress.' },
    ],
    features: [
      'Initiate transfers',
      'Check transfer status',
      'Validate recipients',
      'Use sandbox test data',
    ],
    method: 'POST',
    path: '/v1/transfers/initiate',
    request: { amount: 25000, currency: 'NGN', reference: 'PAY-102394' },
    paid: false,
  },
  {
    id: 'card-services',
    name: 'Cards API',
    category: 'Cards',
    summary: 'Build card-powered experiences.',
    overview:
      'Integrate card-related capabilities into financial products and services.',
    useCases: [
      { title: 'Card Management', description: 'Display card information.' },
      { title: 'Customer Apps', description: 'Show card status.' },
      { title: 'Support Tools', description: 'Assist with card enquiries.' },
      { title: 'Card Workflows', description: 'Build card-related journeys.' },
    ],
    features: [
      'Retrieve card status',
      'Display card information',
      'Build card service workflows',
      'Explore sandbox responses',
    ],
    method: 'GET',
    path: '/v1/cards/status?cardId=YOUR_CARD_ID',
    request: null,
    paid: false,
  },
  {
    id: 'lending-services',
    name: 'Loans API',
    category: 'Loans',
    summary: 'Create smarter lending experiences.',
    overview:
      'Build lending products and services using connected banking capabilities.',
    useCases: [
      {
        title: 'Loan Applications',
        description: 'Support application journeys.',
      },
      {
        title: 'Status Tracking',
        description: 'Display application progress.',
      },
      { title: 'Customer Portals', description: 'Show lending information.' },
      { title: 'Lending Workflows', description: 'Connect application steps.' },
    ],
    features: [
      'Submit loan applications',
      'Retrieve application status',
      'Display lending information',
      'Test workflows in sandbox',
    ],
    method: 'POST',
    path: '/v1/loans/applications',
    request: {
      customerReference: 'CUSTOMER-001',
      amount: 100000,
      currency: 'NGN',
    },
    paid: false,
  },
]
export function findApiDetails(id?: string) {
  return apiDetails.find((api) => api.id === id)
}
