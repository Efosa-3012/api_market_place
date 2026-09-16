/**
 * Single HTTP client for the marketplace backend.
 *
 *   const apps = await api<{ data: App[] }>('/portal/apps', { auth: 'portal' })
 *
 * Errors come back in the backend's envelope { error: { code, message } } and
 * are thrown as ApiError so callers can branch on `err.code`.
 */

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly correlationId?: string

  constructor(status: number, code: string, message: string, correlationId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.correlationId = correlationId
  }
}

type AuthKind = 'none' | 'portal' | 'bank'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Which stored token to send as a bearer. Default: none. */
  auth?: AuthKind
  headers?: Record<string, string>
}

const TOKEN_KEYS: Record<Exclude<AuthKind, 'none'>, string> = {
  portal: 'marketplace.portal_token',
  bank: 'marketplace.bank_session',
}

function readToken(kind: Exclude<AuthKind, 'none'>) {
  try {
    return localStorage.getItem(TOKEN_KEYS[kind])
  } catch {
    return null
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = 'none', headers = {} } = options

  const init: RequestInit = { method, headers: { Accept: 'application/json', ...headers } }
  if (body !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  if (auth !== 'none') {
    const token = readToken(auth)
    if (token) init.headers = { ...init.headers, Authorization: `Bearer ${token}` }
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new ApiError(0, 'network_error', `Could not reach the API at ${API_URL}. Is the backend running?`)
  }

  const text = await res.text()
  const json = text ? safeJson(text) : null

  if (!res.ok) {
    // Standard envelope: { error: { code, message, correlation_id } }
    const env = json?.error
    if (env && typeof env === 'object') {
      const error = new ApiError(res.status, env.code ?? 'error', env.message ?? res.statusText, env.correlation_id)
      if (res.status === 401) handleSessionLoss(auth, error.code)
      throw error
    }
    // OAuth token endpoint (RFC 6749): { error, error_description }
    if (typeof json?.error === 'string') {
      throw new ApiError(res.status, json.error, json.error_description ?? json.error)
    }
    throw new ApiError(res.status, 'http_error', res.statusText || `HTTP ${res.status}`)
  }

  return json as T
}

/**
 * A 401 on an authenticated call means the stored session is dead (expired, or
 * the server was reseeded). Clear it and send the user to the right login page
 * with a reason, instead of letting every page fail quietly.
 */
const SESSION_LOSS_CODES = new Set([
  'portal_token_required', 'portal_token_expired', 'invalid_portal_token',
  'bank_session_required', 'bank_session_expired',
])

function handleSessionLoss(kind: AuthKind, code: string) {
  if (kind === 'none') return
  if (!SESSION_LOSS_CODES.has(code)) return
  const here = `${window.location.pathname}${window.location.search}`
  if (kind === 'portal') {
    portalSession.clear()
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign(`/login?reason=expired&from=${encodeURIComponent(here)}`)
    }
  } else {
    bankSession.clear()
    if (!window.location.pathname.startsWith('/bank/login')) {
      window.location.assign(`/bank/login?reason=expired&next=${encodeURIComponent(here)}`)
    }
  }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Developer portal session
// ---------------------------------------------------------------------------

export interface Developer {
  id: string
  email: string
  name: string
  company: string | null
  /** 'admin' is bank staff — the only role the analytics dashboard admits. */
  role: 'developer' | 'admin'
  created_at: string
}

const DEVELOPER_KEY = 'marketplace.developer'

export const portalSession = {
  save(token: string, developer: Developer) {
    localStorage.setItem(TOKEN_KEYS.portal, token)
    localStorage.setItem(DEVELOPER_KEY, JSON.stringify(developer))
  },
  clear() {
    localStorage.removeItem(TOKEN_KEYS.portal)
    localStorage.removeItem(DEVELOPER_KEY)
  },
  token() {
    return readToken('portal')
  },
  developer(): Developer | null {
    try {
      const raw = localStorage.getItem(DEVELOPER_KEY)
      return raw ? (JSON.parse(raw) as Developer) : null
    } catch {
      return null
    }
  },
  isLoggedIn() {
    return Boolean(readToken('portal'))
  },
  isAdmin() {
    return this.developer()?.role === 'admin'
  },
}

// ---------------------------------------------------------------------------
// Bank customer session (consent pages, connected apps)
// ---------------------------------------------------------------------------

export interface BankCustomer {
  customer_id: string
  full_name: string
}

const BANK_CUSTOMER_KEY = 'marketplace.bank_customer'

export const bankSession = {
  save(token: string, customer: BankCustomer) {
    localStorage.setItem(TOKEN_KEYS.bank, token)
    localStorage.setItem(BANK_CUSTOMER_KEY, JSON.stringify(customer))
  },
  clear() {
    localStorage.removeItem(TOKEN_KEYS.bank)
    localStorage.removeItem(BANK_CUSTOMER_KEY)
  },
  token() {
    return readToken('bank')
  },
  customer(): BankCustomer | null {
    try {
      const raw = localStorage.getItem(BANK_CUSTOMER_KEY)
      return raw ? (JSON.parse(raw) as BankCustomer) : null
    } catch {
      return null
    }
  },
}
