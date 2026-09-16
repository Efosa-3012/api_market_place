export type Environment = 'Sandbox' | 'Production'
export type PortalTab =
  'overview' | 'explorer' | 'keys' | 'documentation' | 'webhooks' | 'logs'
export type Json = Record<string, unknown>
export interface ApiKey {
  id: string
  name: string
  environment: Environment
  secret: string
  status: 'Active' | 'Revoked' | 'Pending'
  created: string
  lastUsed: string | null
}
export interface Endpoint {
  id: string
  api: string
  title: string
  method: 'GET' | 'POST'
  path: string
  defaults: Json
}
export interface RequestLog {
  id: string
  environment: Environment
  endpointId: string
  api: string
  method: string
  path: string
  status: number
  latency: number
  time: string
  request: Json
  response: Json
  headers: Json
  query: Json
  keyId: string | null
  added?: boolean
}
export interface Delivery {
  id: string
  event: string
  time: string
  status: number
  url: string
}
export interface WebhookConfig {
  url: string
  events: string[]
}
export const eventOptions = [
  'consent.authorised',
  'consent.revoked',
  'consent.expired',
  'client.deactivated',
]
export const endpoints: Endpoint[] = [
  {
    id: 'accounts',
    api: 'Accounts API',
    title: 'List consented accounts',
    method: 'GET',
    path: '/api/v1/accounts',
    defaults: {},
  },
  {
    id: 'account',
    api: 'Accounts API',
    title: 'Get an account',
    method: 'GET',
    path: '/api/v1/accounts/{accountId}',
    defaults: { accountId: 'acct-demo-001' },
  },
  {
    id: 'balances',
    api: 'Balances API',
    title: 'List balances',
    method: 'GET',
    path: '/api/v1/accounts/{accountId}/balances',
    defaults: { accountId: 'acct-demo-001' },
  },
  {
    id: 'transactions',
    api: 'Transactions API',
    title: 'List transactions',
    method: 'GET',
    path: '/api/v1/accounts/{accountId}/transactions',
    defaults: { accountId: 'acct-demo-001', limit: 20 },
  },
  {
    id: 'token',
    api: 'Consent & Authorization',
    title: 'Exchange code for token',
    method: 'POST',
    path: '/oauth/token',
    defaults: {
      grant_type: 'authorization_code',
      code: 'paste-the-code-from-the-redirect',
      redirect_uri: 'http://localhost:3000/callback',
    },
  },
]
export const tabs: { id: PortalTab; title: string; description: string }[] = [
  {
    id: 'overview',
    title: 'Overview',
    description:
      'Integration activity across your sandbox and production keys.',
  },
  {
    id: 'explorer',
    title: 'API Explorer',
    description: 'Explore endpoints and test requests in the sandbox.',
  },
  {
    id: 'keys',
    title: 'Credentials',
    description:
      'Your apps, client IDs and secrets live on the My Apps page.',
  },
  {
    id: 'documentation',
    title: 'Documentation',
    description: 'Everything you need to start building your integration.',
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    description: 'Configure event notifications for your integration.',
  },
  {
    id: 'logs',
    title: 'Logs',
    description: 'Inspect requests, responses, and integration activity.',
  },
]
export function uid() {
  return crypto.randomUUID()
}
export function secret(environment: Environment) {
  return `demo_${environment === 'Sandbox' ? 'test' : 'live'}_${uid().replace(/-/g, '')}`
}
export function createInitialKeys(): ApiKey[] {
  return [
    'Default Sandbox Key',
    'Mobile App Test',
    'Webhook Testing',
    'Production Key',
  ].map((name, i) => ({
    id: `key-${i}`,
    name,
    environment: i === 3 ? 'Production' : 'Sandbox',
    secret: `demo_${i === 3 ? 'live' : 'test'}_fictional_${i}_8f2c42ae`,
    status: i === 3 ? 'Pending' : 'Active',
    created: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    lastUsed:
      i === 3 ? null : new Date(Date.now() - (i + 1) * 120000).toISOString(),
  }))
}
export function parseObject(text: string): Json {
  const value: unknown = JSON.parse(text)
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new Error('Enter a JSON object, such as {"name":"value"}.')
  return value as Json
}
export function requestPath(endpoint: Endpoint, values: Json) {
  return endpoint.path.replace(/\{(\w+)\}/g, (_, key: string) =>
    encodeURIComponent(String(values[key] ?? '')),
  )
}
export function simulate(
  endpoint: Endpoint,
  values: Json,
  environment: Environment,
  headers: Json = {},
  query: Json = {},
  keyId: string | null = null,
  statusOverride?: number,
): RequestLog {
  let status = endpoint.method === 'POST' ? 201 : 200
  let message = 'Request completed successfully'
  if (
    Object.keys(endpoint.defaults).some(
      (key) => key !== 'narration' && !String(values[key] ?? '').trim(),
    )
  ) {
    status = 422
    message = 'Required fields are missing'
  }
  if (
    endpoint.id === 'transfer' &&
    (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0)
  ) {
    status = 422
    message = 'Amount must be greater than zero'
  }
  if (
    'beneficiaryAccount' in endpoint.defaults &&
    !/^\d{10}$/.test(String(values.beneficiaryAccount ?? ''))
  ) {
    status = 422
    message = 'Beneficiary account must contain 10 digits'
  }
  if (statusOverride) {
    status = statusOverride
    message =
      status === 429
        ? 'Rate limit reached'
        : status >= 400
          ? 'Request failed'
          : message
  }
  const time = new Date().toISOString()
  const id = `req_${uid().slice(0, 12)}`
  const account = {
    account_id: String(values.accountId ?? 'acct-demo-001'),
    account_number_masked: '****0001',
    account_type: 'current',
    currency: 'NGN',
    status: 'active',
    opened_at: '2025-06-01T00:00:00Z',
  }
  const details =
    endpoint.id === 'accounts'
      ? { data: [account], meta: { consent_id: 'sandbox-consent' } }
      : endpoint.id === 'account'
        ? { data: account }
        : endpoint.id === 'balances'
          ? {
              data: [
                { account_id: account.account_id, type: 'available', amount: '1250500.50', currency: 'NGN', credit_limit: '0.00', as_of: time },
                { account_id: account.account_id, type: 'ledger', amount: '1250500.50', currency: 'NGN', credit_limit: '0.00', as_of: time },
              ],
            }
          : endpoint.id === 'transactions'
            ? {
                data: [
                  { transaction_id: 'txn-001-010', account_id: account.account_id, type: 'credit', amount: '5500.50', currency: 'NGN', reference: 'INT-202601-001', narration: 'Interest earned', counterparty: 'Stanbic IBTC', booked_at: time, value_date: time },
                ],
                meta: { pagination: { limit: Number(values.limit ?? 20), has_more: true, next_cursor: 'eyJhIjoi...' } },
              }
            : { access_token: 'eyJhbGciOiJIUzI1NiJ9.sandbox', token_type: 'Bearer', expires_in: 86400, scope: 'accounts:read balances:read transactions:read' }
  return {
    id,
    environment,
    endpointId: endpoint.id,
    api: endpoint.api,
    method: endpoint.method,
    path: requestPath(endpoint, values),
    status,
    latency: 184,
    time,
    request: { ...values },
    response: {
      status: status < 400 ? 'success' : 'error',
      message,
      ...(status < 400 ? { data: details } : {}),
    },
    headers: {
      ...Object.fromEntries(
        Object.entries(headers).map(([name, value]) => [
          name,
          /authorization|api[-_]?key|cookie|secret|token/i.test(name)
            ? '[REDACTED]'
            : value,
        ]),
      ),
      Authorization: '[REDACTED]',
    },
    query: { ...query },
    keyId,
    added: true,
  }
}
export function createInitialLogs(): RequestLog[] {
  return Array.from({ length: 26 }, (_, i) => {
    const endpoint = endpoints[i % endpoints.length]
    const log = simulate(
      endpoint,
      endpoint.defaults,
      i % 3 ? 'Sandbox' : 'Production',
      {},
      {},
      i % 3 ? 'key-0' : null,
      i % 7 === 2 ? 422 : i % 7 === 4 ? 429 : undefined,
    )
    return {
      ...log,
      id: `req_sample_${String(i + 1).padStart(3, '0')}`,
      time: new Date(
        Date.now() - (i < 14 ? i * 360000 : (i - 13) * 86400000),
      ).toISOString(),
      latency: 77 + i * 7,
      added: false,
    }
  })
}
export function dateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
export function codeExample(
  language: string,
  endpoint: Endpoint,
  values: Json,
  environment: Environment,
  headers: Json = {},
  query: Json = {},
) {
  const params = {
    ...query,
    ...(endpoint.method === 'GET'
      ? Object.fromEntries(
          Object.entries(values).filter(([key]) => key !== 'id'),
        )
      : {}),
  }
  const search = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString()
  const url = `https://${environment.toLowerCase()}.api.example.invalid${requestPath(endpoint, values)}${search ? `?${search}` : ''}`
  const requestHeaders = {
    ...Object.fromEntries(
      Object.entries(headers).map(([name, value]) => [
        name,
        /authorization|api[-_]?key|cookie|secret|token/i.test(name)
          ? 'YOUR_ACCESS_TOKEN'
          : value,
      ]),
    ),
    'Content-Type': 'application/json',
    Authorization: 'Bearer YOUR_ACCESS_TOKEN',
  }
  const body = JSON.stringify(values)
  const quote = (text: string) => `'${text.replace(/'/g, `'\\''`)}'`
  if (language === 'JavaScript')
    return `const response = await fetch(${JSON.stringify(url)}, {\n  method: "${endpoint.method}",\n  headers: ${JSON.stringify(requestHeaders, null, 2)},${endpoint.method === 'POST' ? `\n  body: JSON.stringify(${JSON.stringify(values, null, 2)}),` : ''}\n});\nconsole.log(await response.json());`
  if (language === 'Python')
    return `import json\nimport requests\n\nresponse = requests.${endpoint.method.toLowerCase()}(\n    ${JSON.stringify(url)},\n    headers=json.loads(${JSON.stringify(JSON.stringify(requestHeaders))}),${endpoint.method === 'POST' ? `\n    json=json.loads(${JSON.stringify(body)}),` : ''}\n    timeout=30,\n)\nprint(response.json())`
  if (language === 'Java')
    return `import java.net.URI;\nimport java.net.http.*;\n\nclass Example {\n  public static void main(String[] args) throws Exception {\n    var request = HttpRequest.newBuilder(URI.create(${JSON.stringify(url)}))\n${Object.entries(
      requestHeaders,
    )
      .map(
        ([k, v]) =>
          `      .header(${JSON.stringify(k)}, ${JSON.stringify(String(v))})`,
      )
      .join(
        '\n',
      )}\n      .${endpoint.method === 'GET' ? 'GET()' : `POST(HttpRequest.BodyPublishers.ofString(${JSON.stringify(body)}))`}\n      .build();\n    var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\n    System.out.println(response.body());\n  }\n}`
  if (language === 'PHP') {
    const phpString = (value: string) =>
      "'" + value.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'"
    const phpHeaders = Object.entries(requestHeaders).map(
      ([name, value]) => `${name}: ${value}`,
    )
    return `<?php\n$ch = curl_init(${phpString(url)});\ncurl_setopt_array($ch, [\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_CUSTOMREQUEST => '${endpoint.method}',\n  CURLOPT_HTTPHEADER => json_decode(${phpString(JSON.stringify(phpHeaders))}, true),${endpoint.method === 'POST' ? `\n  CURLOPT_POSTFIELDS => ${phpString(body)},` : ''}\n]);\necho curl_exec($ch);\ncurl_close($ch);`
  }
  return `curl -X ${endpoint.method} ${quote(url)} \\\n${Object.entries(
    requestHeaders,
  )
    .map(([k, v]) => `  -H ${quote(`${k}: ${v}`)}`)
    .join(
      ' \\\n',
    )}${endpoint.method === 'POST' ? ` \\\n  --data ${quote(JSON.stringify(values, null, 2))}` : ''}`
}
