export type Lifecycle =
  'Draft' | 'Published' | 'Maintenance' | 'Deprecated' | 'Archived'
export type CatalogTab =
  | 'overview'
  | 'endpoints'
  | 'pricing'
  | 'documentation'
  | 'developers'
  | 'settings'
export type Environment = 'Sandbox' | 'Production'
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export interface Endpoint {
  id: string
  path: string
  method: Method
  description: string
  status: 'Live' | 'Disabled'
  updated: string
  request: string
  response: string
}
export interface Pricing {
  model: 'Free' | 'Pay-as-you-use' | 'Subscription'
  base: number
  perCall: number
  freeSandbox: number
  currency: 'NGN' | 'USD'
  tax: number
  taxHandling: 'Added to invoice' | 'Included in price'
}
export interface Developer {
  id: string
  company: string
  status: 'Active' | 'Pending' | 'Suspended' | 'Rejected'
  joined: string
  calls: number
  previousCalls: number
  apiCount: number
}
export interface DocPage {
  id: string
  title: string
  body: string
}
export interface ApiInfo {
  name: string
  category: string
  tagline: string
  description: string
  owner: string
  version: string
}
export interface CatalogApi extends ApiInfo {
  id: string
  status: Lifecycle
  created: string
  updated: string
  icon: string
  environments: Record<Environment, { enabled: boolean; url: string }>
  authentication: 'OAuth 2.0' | 'API Key'
  defaultEnvironment: Environment
  visible: boolean
  tags: string[]
  supportEmail: string
  supportSlack: string
  notifications: { errors: boolean; usage: boolean; changes: boolean }
  rateLimit: number
  requireApproval: boolean
  deprecationDate: string
  deprecationMessage: string
  endpoints: Endpoint[]
  pricing: Pricing
  docs: DocPage[]
  developers: Developer[]
  successRate: number
  latency: number
}
export const tabs: { id: CatalogTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'developers', label: 'Developers' },
  { id: 'settings', label: 'Settings' },
]
export const lifecycle: Lifecycle[] = [
  'Draft',
  'Published',
  'Maintenance',
  'Deprecated',
  'Archived',
]
export const methods: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
export const categories = [
  'Payments',
  'Accounts',
  'Identity & KYC',
  'Transfers',
  'Cards',
  'Loans',
]
export const newInfo: ApiInfo = {
  name: '',
  category: 'Payments',
  tagline: '',
  description: '',
  owner: 'Platform Team',
  version: 'v1.0.0',
}
export function validUrl(text: string, httpsOnly = false) {
  try {
    const u = new URL(text)
    return (httpsOnly
      ? u.protocol === 'https:'
      : ['http:', 'https:'].includes(u.protocol)) &&
      !u.username &&
      !u.password
      ? u.toString()
      : null
  } catch {
    return null
  }
}
export function parseJson(text: string) {
  try {
    return { ok: true as const, value: JSON.parse(text) as unknown }
  } catch {
    return { ok: false as const }
  }
}
export function validateEndpoint(endpoint: Endpoint, existing: Endpoint[]) {
  if (!/^\/[\w{}./:-]*$/.test(endpoint.path) || endpoint.path.includes('..'))
    return 'Use a relative endpoint path starting with /, without spaces or query strings.'
  if (!endpoint.description.trim()) return 'Add an endpoint description.'
  if (
    existing.some(
      (item) =>
        item.id !== endpoint.id &&
        item.path === endpoint.path &&
        item.method === endpoint.method,
    )
  )
    return 'This method and path already exist.'
  if (!parseJson(endpoint.request).ok || !parseJson(endpoint.response).ok)
    return 'Request and response examples must be valid JSON.'
  return ''
}
export function validatePricing(value: Pricing) {
  if (
    ![value.base, value.perCall, value.tax, value.freeSandbox].every(
      Number.isFinite,
    )
  )
    return 'Enter valid numbers.'
  if (
    value.base < 0 ||
    value.perCall < 0 ||
    value.tax < 0 ||
    value.tax > 100 ||
    value.freeSandbox < 0 ||
    !Number.isInteger(value.freeSandbox)
  )
    return 'Fees must be non-negative, tax must be 0–100%, and sandbox calls a whole number.'
  return ''
}
export function estimate(pricing: Pricing, calls: number) {
  const net =
    pricing.model === 'Free'
      ? 0
      : pricing.base +
        (pricing.model === 'Pay-as-you-use' ? calls * pricing.perCall : 0)
  const total =
    pricing.taxHandling === 'Added to invoice'
      ? net * (1 + pricing.tax / 100)
      : net
  return {
    subtotal: Math.round(net * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}
export function money(value: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}
export const number = (value: number) =>
  new Intl.NumberFormat('en-NG').format(value)
export const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
export const dateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
export function transition(
  api: CatalogApi,
  status: Lifecycle,
  time: string,
): CatalogApi {
  return {
    ...api,
    status,
    visible: status === 'Draft' || status === 'Archived' ? false : api.visible,
    updated: time,
  }
}
export function publicVisible(api: CatalogApi) {
  return (
    api.visible &&
    ['Published', 'Maintenance', 'Deprecated'].includes(api.status)
  )
}
export function metrics(api: CatalogApi) {
  return {
    calls: api.developers.reduce((sum, d) => sum + d.calls, 0),
    previousCalls: api.developers.reduce((sum, d) => sum + d.previousCalls, 0),
    active: api.developers.filter((d) => d.status === 'Active').length,
    pending: api.developers.filter((d) => d.status === 'Pending').length,
    total: api.developers.filter((d) => d.status !== 'Rejected').length,
  }
}
export function createApi(info: ApiInfo, id: string, time: string): CatalogApi {
  return {
    ...info,
    id,
    status: 'Draft',
    created: time,
    updated: time,
    icon: '',
    environments: {
      Sandbox: { enabled: true, url: 'https://sandbox.api.example.invalid' },
      Production: { enabled: false, url: 'https://api.example.invalid' },
    },
    authentication: 'OAuth 2.0',
    defaultEnvironment: 'Sandbox',
    visible: false,
    tags: [],
    supportEmail: 'api-support@example.com',
    supportSlack: '',
    notifications: { errors: true, usage: true, changes: false },
    rateLimit: 1000,
    requireApproval: true,
    deprecationDate: '',
    deprecationMessage: '',
    endpoints: [],
    pricing: {
      model: 'Free',
      base: 0,
      perCall: 0,
      freeSandbox: 10000,
      currency: 'NGN',
      tax: 0,
      taxHandling: 'Added to invoice',
    },
    docs: [
      { id: 'introduction', title: 'Introduction', body: info.description },
      {
        id: 'authentication',
        title: 'Authentication',
        body: 'Use the authentication method specified in Settings and follow its credential requirements.',
      },
      {
        id: 'quick-start',
        title: 'Quick start',
        body: '1. Request access to this API.\n2. Obtain sandbox credentials.\n3. Select an endpoint.\n4. Send test data using the Developer Portal.',
      },
      {
        id: 'errors',
        title: 'Errors',
        body: '200: Success\n201: Created\n401: Authentication required\n403: Access denied\n422: Validation failed\n429: Rate limit reached\n500: Server error',
      },
      {
        id: 'rate-limits',
        title: 'Rate limits',
        body: 'The configured request rate limit is shown in Security settings.',
      },
      {
        id: 'webhooks',
        title: 'Webhooks',
        body: 'Follow the documented webhook event names and signature verification requirements.',
      },
      {
        id: 'changelog',
        title: 'Changelog',
        body: `${info.version}: Initial API configuration.`,
      },
    ],
    developers: [],
    successRate: 0,
    latency: 0,
  }
}
export function initialCatalog(): CatalogApi[] {
  const names = [
    'Transfer API',
    'Accounts API',
    'Identity Verification API',
    'Account Transfers API',
    'Cards API',
    'Loans API',
  ]
  const taglines = [
    'Move money securely between bank accounts and digital wallets.',
    'Connect to account information',
    'Verify with confidence',
    'Enable account-to-account transfers',
    'Build card-powered experiences',
    'Create smarter lending experiences',
  ]
  const descriptions = [
    'Build reliable payment experiences with the Stanbic IBTC Transfer API. Initiate, manage, and track transfers between bank accounts and digital wallets through secure, consent-driven integrations.',
    'Access approved account details, balances, and transaction information.',
    'Build customer onboarding and verification experiences with identity services.',
    'Create seamless transfer experiences through secure banking connections.',
    'Access card-related capabilities for innovative financial products and services.',
    'Build lending products and services using connected banking capabilities.',
  ]
  const definitions: [string, Method, string][] = [
    ['/transfers/initiate', 'POST', 'Initiate a fund transfer.'],
    ['/transfers/{id}', 'GET', 'Retrieve transfer details.'],
    ['/transfers/validate', 'POST', 'Validate recipient details.'],
    ['/transfers/cancel', 'POST', 'Cancel a pending transfer.'],
    ['/transfers/status', 'GET', 'Check transfer status.'],
    ['/beneficiaries', 'GET', 'List saved beneficiaries.'],
    ['/beneficiaries', 'POST', 'Add a new beneficiary.'],
    ['/beneficiaries', 'DELETE', 'Remove a beneficiary.'],
  ]
  return names.map((name, i) => {
    const time = new Date(Date.now() - i * 86400000).toISOString()
    const api = createApi(
      {
        name,
        category: categories[i],
        tagline: taglines[i],
        description: descriptions[i],
        owner: 'Platform Team',
        version: 'v1.2.0',
      },
      [
        'transfer-api',
        'account-information',
        'identity-verification',
        'account-transfers',
        'card-services',
        'lending-services',
      ][i],
      time,
    )
    return {
      ...api,
      status: 'Published',
      visible: true,
      environments: {
        ...api.environments,
        Production: { ...api.environments.Production, enabled: true },
      },
      tags: [categories[i], 'Banking'],
      pricing: {
        ...api.pricing,
        model: i < 2 ? 'Pay-as-you-use' : 'Free',
        perCall: i < 2 ? 10 : 0,
        tax: 7.5,
      },
      successRate: 99.2,
      latency: 84 + i * 10,
      endpoints: (i === 0
        ? definitions
        : ([
            [
              i === 1
                ? '/accounts/balance'
                : i === 2
                  ? '/identity/verify'
                  : `/${api.id}`,
              i === 1 ? 'GET' : 'POST',
              'API operation.',
            ],
          ] as [string, Method, string][])
      ).map(([path, method, description], index) => ({
        id: `${api.id}-ep-${index}`,
        path,
        method,
        description,
        status: 'Live',
        updated: time,
        request: JSON.stringify(
          method === 'GET'
            ? {}
            : { amount: 25000, currency: 'NGN', reference: 'PAY-102394' },
          null,
          2,
        ),
        response: JSON.stringify({ status: 'success', data: {} }, null, 2),
      })),
      developers: [
        'Meridian Payments',
        'Kobo Wallet',
        'Verda Logistics',
        'Bright Path Savings',
        'PaySwift',
        'FinLink Digital',
      ].map((company, j) => ({
        id: `${api.id}-dev-${j}`,
        company,
        status: j === 5 ? 'Pending' : 'Active',
        joined: new Date(Date.now() - (j * 9 + 2) * 86400000).toISOString(),
        calls:
          j === 5
            ? 0
            : Math.round([412580, 388120, 301480, 190820, 168430][j] / (i + 1)),
        previousCalls:
          j === 5
            ? 0
            : Math.round(
                [412580, 388120, 301480, 190820, 168430][j] / (i + 1) / 1.12,
              ),
        apiCount: [3, 2, 2, 1, 1, 1][j],
      })),
    }
  })
}
export function csv(rows: unknown[][]) {
  const quote = (v: unknown) =>
    `"${String(v)
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`
  return '\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n')
}
export function download(
  text: string,
  name: string,
  type = 'text/csv;charset=utf-8',
) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
