import { API_URL } from './api'

/**
 * BudgetBuddy — the sample fintech app.
 *
 * This is the *partner* side of the platform: it holds an access token granted
 * by a customer and calls `/api/v1/*` like any third-party integration would.
 * It is deliberately not part of the marketplace UI — the customer is meant to
 * feel they left this app, went to their bank, and came back.
 *
 * The one thing it cannot do in the browser is exchange the authorization code,
 * because that needs the client secret. `/demo/sample-app/token` does it
 * server-side, standing in for BudgetBuddy's own backend.
 */

const TOKEN_KEY = 'budgetbuddy.token'
const STATE_KEY = 'budgetbuddy.oauth_state'

export interface Session {
  access_token: string
  scope: string
  consent_id: string
  connected_at: string
}

export interface Account {
  account_id: string
  account_number_masked: string
  account_type: string
  currency: string
  status: string
  opened_at: string
}

export interface Balance {
  account_id: string
  type: string
  amount: string
  currency: string
  as_of: string
}

export interface Transaction {
  transaction_id: string
  account_id: string
  type: 'credit' | 'debit'
  amount: string
  currency: string
  reference: string
  narration: string
  counterparty: string
  booked_at: string
  value_date: string
}

/** Raised when the bank refuses a call because the customer took access back. */
export class AccessRevoked extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'AccessRevoked'
    this.code = code
  }
}

const REVOCATION_CODES = new Set(['consent_revoked', 'consent_expired', 'client_deactivated', 'consent_not_authorised'])

export const session = {
  read(): Session | null {
    try {
      const raw = localStorage.getItem(TOKEN_KEY)
      return raw ? (JSON.parse(raw) as Session) : null
    } catch {
      return null
    }
  },
  save(value: Session) {
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(value))
    } catch {
      /* private window — the app still works for this page view */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

/**
 * Step 1: send the customer to their bank.
 *
 * `state` is generated here and checked on the way back — it is what stops a
 * third party from feeding this app someone else's authorization code.
 */
export function startConnect(): void {
  const state = crypto.randomUUID()
  try {
    sessionStorage.setItem(STATE_KEY, state)
  } catch {
    /* ignore — the check below degrades to a warning */
  }

  const url = new URL('/oauth/authorize', API_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', 'budgetbuddy')
  url.searchParams.set('redirect_uri', `${window.location.origin}/callback`)
  url.searchParams.set('scope', 'accounts:read balances:read transactions:read')
  url.searchParams.set('state', state)
  window.location.assign(url.toString())
}

export function consumeExpectedState(): string | null {
  try {
    const value = sessionStorage.getItem(STATE_KEY)
    sessionStorage.removeItem(STATE_KEY)
    return value
  } catch {
    return null
  }
}

/** Step 2: hand the code to our backend, which holds the secret. */
export async function exchange(code: string): Promise<Session> {
  const res = await fetch(`${API_URL}/demo/sample-app/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/callback` }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Could not complete the connection. Please try again.')
  }
  const next: Session = {
    access_token: body.access_token,
    scope: body.scope,
    consent_id: body.consent_id,
    connected_at: new Date().toISOString(),
  }
  session.save(next)
  return next
}

/** Every call the app makes to the bank goes through here. */
async function call<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const code = body?.error?.code ?? 'request_failed'
    if (REVOCATION_CODES.has(code)) throw new AccessRevoked(code)
    throw new Error(body?.error?.message ?? `The bank refused that request (${res.status}).`)
  }
  return (await res.json()) as T
}

export interface AccountView {
  account: Account
  balance: Balance | null
  transactions: Transaction[]
}

export interface Overview {
  accounts: AccountView[]
  /** Every transaction across every shared account, newest first. */
  activity: Transaction[]
}

/**
 * Pull everything the customer agreed to share.
 *
 * Accounts first, then balances and recent transactions for each — the same
 * shape of traffic a real aggregation app produces, which is also what makes
 * the bank's audit trail interesting to look at afterwards.
 */
export async function loadOverview(token: string): Promise<Overview> {
  const { data: accounts } = await call<{ data: Account[] }>('/api/v1/accounts', token)

  const views = await Promise.all(
    accounts.map(async (account) => {
      const [balances, transactions] = await Promise.all([
        call<{ data: Balance[] }>(`/api/v1/accounts/${account.account_id}/balances`, token).catch(rethrowRevoked),
        call<{ data: Transaction[] }>(
          `/api/v1/accounts/${account.account_id}/transactions?limit=25`,
          token,
        ).catch(rethrowRevoked),
      ])
      return {
        account,
        // 'available' is what a person means by "my balance"; ledger is the bank's view.
        balance:
          (balances as { data: Balance[] }).data.find((b) => b.type === 'available') ??
          (balances as { data: Balance[] }).data[0] ??
          null,
        transactions: (transactions as { data: Transaction[] }).data,
      }
    }),
  )

  const activity = views
    .flatMap((v) => v.transactions)
    .sort((a, b) => Date.parse(b.booked_at) - Date.parse(a.booked_at))

  return { accounts: views, activity }
}

/** Keep a revocation typed as it passes through Promise.all. */
function rethrowRevoked(err: unknown): never {
  throw err
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

export function money(amount: string, currency: string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

export const ACCOUNT_LABEL: Record<string, string> = {
  current: 'Current account',
  savings: 'Savings account',
  domiciliary: 'Domiciliary account',
  fixed_deposit: 'Fixed deposit',
}

/**
 * Money in and out over the last 30 days, per currency.
 *
 * Deliberately not summed across currencies — adding naira to dollars would be
 * the kind of quiet lie this whole platform exists to avoid.
 */
export interface Flow {
  currency: string
  inflow: number
  outflow: number
  count: number
}

export function flowByCurrency(activity: Transaction[], days = 30): Flow[] {
  const since = Date.now() - days * 24 * 60 * 60 * 1000
  const byCurrency = new Map<string, Flow>()

  for (const t of activity) {
    if (Date.parse(t.booked_at) < since) continue
    const flow = byCurrency.get(t.currency) ?? { currency: t.currency, inflow: 0, outflow: 0, count: 0 }
    if (t.type === 'credit') flow.inflow += Number(t.amount)
    else flow.outflow += Number(t.amount)
    flow.count += 1
    byCurrency.set(t.currency, flow)
  }

  return [...byCurrency.values()].sort((a, b) => b.outflow - a.outflow)
}

/**
 * Where the money went, biggest first — the question a budgeting app exists to
 * answer.
 *
 * Moving money between your own accounts is not spending, so transfers whose
 * counterparty is another shared account are left out. Counting them would put
 * "your own savings" at the top of your expenses, which is the sort of thing
 * that makes people stop trusting the numbers.
 */
export function topOutgoings(activity: Transaction[], currency: string, ownAccounts: Account[] = [], limit = 5) {
  const ownSuffixes = ownAccounts
    .map((a) => a.account_number_masked.replace(/\D/g, ''))
    .filter((digits) => digits.length >= 3)

  const totals = new Map<string, number>()
  for (const t of activity) {
    if (t.type !== 'debit' || t.currency !== currency) continue
    if (ownSuffixes.some((suffix) => t.counterparty.includes(suffix))) continue
    totals.set(t.counterparty, (totals.get(t.counterparty) ?? 0) + Number(t.amount))
  }
  return [...totals.entries()]
    .map(([counterparty, total]) => ({ counterparty, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' })
}
