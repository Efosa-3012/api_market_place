import { API_URL, api } from './api'

/**
 * Developer sandbox: mint a real access token for one of your apps, bound to a
 * pre-authorised consent for the demo customer, then call the APIs with it.
 */

export interface SandboxConsent {
  consent_id: string
  status: string
  scopes: string[]
  account_ids: string[]
  customer_id: string | null
  authorised_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

export interface SandboxState {
  customer_id: string
  accounts: { account_id: string; account_type: string; currency: string; status: string }[]
  consent: SandboxConsent | null
}

export interface SandboxToken extends SandboxConsent {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  scope: string
}

export const sandbox = {
  state(appId: string) {
    return api<SandboxState>(`/portal/apps/${appId}/sandbox`, { auth: 'portal' })
  },
  mintToken(appId: string) {
    return api<SandboxToken>(`/portal/apps/${appId}/sandbox-token`, { method: 'POST', auth: 'portal' })
  },
  revoke(appId: string) {
    return api<{ consents_revoked: number }>(`/portal/apps/${appId}/sandbox/revoke`, { method: 'POST', auth: 'portal' })
  },
}

// ---------------------------------------------------------------------------
// Request builder: the partner-facing endpoints a token can call.
// ---------------------------------------------------------------------------

export interface EndpointParam {
  name: string
  kind: 'path' | 'query'
  /** 'account' renders a picker of consented accounts */
  input?: 'account' | 'text' | 'number' | 'select'
  options?: string[]
  placeholder?: string
  required?: boolean
}

export interface SandboxEndpoint {
  id: string
  api: string
  title: string
  method: 'GET'
  path: string // may contain {accountId}
  scope: string
  params: EndpointParam[]
}

export const SANDBOX_ENDPOINTS: SandboxEndpoint[] = [
  { id: 'accounts', api: 'Accounts API', title: 'List consented accounts', method: 'GET', path: '/api/v1/accounts', scope: 'accounts:read', params: [] },
  {
    id: 'account', api: 'Accounts API', title: 'Get an account', method: 'GET', path: '/api/v1/accounts/{accountId}', scope: 'accounts:read',
    params: [{ name: 'accountId', kind: 'path', input: 'account', required: true }],
  },
  {
    id: 'balances', api: 'Balances API', title: 'List balances', method: 'GET', path: '/api/v1/accounts/{accountId}/balances', scope: 'balances:read',
    params: [{ name: 'accountId', kind: 'path', input: 'account', required: true }],
  },
  {
    id: 'banks', api: 'Bank List', title: 'List banks', method: 'GET', path: '/api/v1/reference/banks', scope: 'reference:read',
    params: [
      { name: 'q', kind: 'query', input: 'text', placeholder: 'stanbic' },
      { name: 'type', kind: 'query', input: 'select', options: ['', 'commercial', 'non_interest', 'merchant'] },
    ],
  },
  {
    id: 'nuban-validate', api: 'NUBAN Validator', title: 'Validate an account number', method: 'GET', path: '/api/v1/reference/nuban/validate', scope: 'reference:read',
    params: [
      { name: 'bank_code', kind: 'query', input: 'text', placeholder: '221', required: true },
      { name: 'account_number', kind: 'query', input: 'text', placeholder: '0000000124', required: true },
    ],
  },
  {
    id: 'nuban-generate', api: 'NUBAN Validator', title: 'Generate a check digit', method: 'GET', path: '/api/v1/reference/nuban/generate', scope: 'reference:read',
    params: [
      { name: 'bank_code', kind: 'query', input: 'text', placeholder: '221', required: true },
      { name: 'serial', kind: 'query', input: 'text', placeholder: '000000012', required: true },
    ],
  },
  {
    id: 'transactions', api: 'Transactions API', title: 'List transactions', method: 'GET', path: '/api/v1/accounts/{accountId}/transactions', scope: 'transactions:read',
    params: [
      { name: 'accountId', kind: 'path', input: 'account', required: true },
      { name: 'limit', kind: 'query', input: 'number', placeholder: '20' },
      { name: 'type', kind: 'query', input: 'select', options: ['', 'credit', 'debit'] },
      { name: 'sort', kind: 'query', input: 'select', options: ['', 'booked_at_desc', 'booked_at_asc'] },
      { name: 'from', kind: 'query', input: 'text', placeholder: 'YYYY-MM-DD' },
      { name: 'to', kind: 'query', input: 'text', placeholder: 'YYYY-MM-DD' },
      { name: 'cursor', kind: 'query', input: 'text', placeholder: 'from meta.pagination.next_cursor' },
    ],
  },
]

export function buildUrl(endpoint: SandboxEndpoint, values: Record<string, string>) {
  let path = endpoint.path.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(values[k] ?? ''))
  const qs = new URLSearchParams()
  for (const p of endpoint.params) {
    if (p.kind === 'query' && values[p.name]) qs.set(p.name, values[p.name])
  }
  const q = qs.toString()
  if (q) path += `?${q}`
  return { path, url: `${API_URL}${path}` }
}

export function curlFor(url: string, token: string) {
  return `curl "${url}" \\\n  -H "Authorization: Bearer ${token}"`
}

export interface SandboxResponse {
  status: number
  statusText: string
  ms: number
  headers: Record<string, string>
  body: unknown
  bodyText: string
}

/** Raw fetch — we want the real status, headers and body, not the api() envelope handling. */
export async function send(url: string, token: string): Promise<SandboxResponse> {
  const started = performance.now()
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  const ms = Math.round(performance.now() - started)
  const bodyText = await res.text()
  let body: unknown = bodyText
  try {
    body = JSON.parse(bodyText)
  } catch {
    /* not json */
  }
  const headers: Record<string, string> = {}
  res.headers.forEach((v, k) => {
    headers[k] = v
  })
  return { status: res.status, statusText: res.statusText, ms, headers, body, bodyText }
}
