import { api } from './api'

/**
 * The bank's control room: `/analytics/*`, read from the audit trail every
 * gateway request writes.
 *
 * Authenticated with the signed-in staff member's portal token — the same
 * session a developer gets, from an account whose role is 'admin'. The shared
 * X-Admin-Key the backend also accepts is deliberately NOT used here: a Vite env
 * var ships to the browser in clear text, so putting the key in the frontend
 * would publish it to anyone who opens devtools.
 */

export type AnalyticsWindow = '1h' | '6h' | '24h' | '7d' | '30d'

export const WINDOW_LABELS: Record<AnalyticsWindow, string> = {
  '1h': 'Last hour',
  '6h': 'Last 6 hours',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
}

export interface AnalyticsSummary {
  window: AnalyticsWindow
  calls: number
  errors: number
  client_errors: number
  server_errors: number
  error_rate: number
  p95_latency_ms: number
  avg_latency_ms: number
  active_consents: number
  new_consents: number
  revocations: number
  total_consents: number
  developers: number
  clients_total: number
  clients_active: number
  clients_calling: number
}

export interface ClientTraffic {
  client_id: string
  name: string
  status: 'active' | 'deactivated'
  developer_name: string
  developer_company: string | null
  calls: number
  errors: number
  last_call_at: string | null
  active_consents: number
}

export interface EndpointTraffic {
  path: string
  method: string
  calls: number
  errors: number
  p95_latency_ms: number
}

export interface TimeseriesPoint {
  bucket: string
  calls: number
  errors: number
}

/** One audited request, as the bank sees it — including who it was on behalf of. */
export interface AuditCall {
  id: string
  correlation_id: string
  client_id: string | null
  client_name: string | null
  consent_id: string | null
  customer_id: string | null
  method: string
  path: string
  status_code: number
  error_code: string | null
  duration_ms: number
  ip: string | null
  created_at: string
}

export type ConsentStatus = 'awaiting_authorisation' | 'authorised' | 'rejected' | 'revoked' | 'expired'

export interface ConsentRecord {
  id: string
  status: ConsentStatus
  customer_id: string | null
  scopes: string[]
  account_count: number | null
  sandbox: boolean
  authorised_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  created_at: string
  client_id: string
  client_name: string
}

export interface ConsentBreakdown {
  data: { status: ConsentStatus; count: number }[]
  total: number
  recent: ConsentRecord[]
}

/** One registered app, as listed under its developer on the partner register. */
export interface DeveloperApp {
  id: string
  client_id: string
  name: string
  status: 'active' | 'deactivated'
  created_at: string
  deactivated_at: string | null
  calls: number
  active_consents: number
  last_call_at: string | null
}

/** A developer account and everything registered under it. */
export interface DeveloperAccount {
  id: string
  email: string
  name: string
  company: string | null
  created_at: string
  apps_total: number
  apps_active: number
  calls: number
  errors: number
  active_consents: number
  last_call_at: string | null
  apps: DeveloperApp[]
}

export const admin = {
  developers() {
    return api<{ data: DeveloperAccount[] }>('/analytics/developers', { auth: 'portal' })
  },
  summary(window: AnalyticsWindow) {
    return api<AnalyticsSummary>(`/analytics/summary?window=${window}`, { auth: 'portal' })
  },
  timeseries(window: AnalyticsWindow) {
    return api<{ window: AnalyticsWindow; bucket_seconds: number; data: TimeseriesPoint[] }>(
      `/analytics/timeseries?window=${window}`,
      { auth: 'portal' },
    )
  },
  callsPerClient() {
    return api<{ data: ClientTraffic[] }>('/analytics/calls-per-client', { auth: 'portal' })
  },
  topEndpoints(window: AnalyticsWindow) {
    return api<{ window: AnalyticsWindow; data: EndpointTraffic[] }>(`/analytics/top-endpoints?window=${window}`, {
      auth: 'portal',
    })
  },
  recentCalls(options: { limit?: number; errorsOnly?: boolean } = {}) {
    const query = new URLSearchParams({ limit: String(options.limit ?? 50) })
    if (options.errorsOnly) query.set('errors_only', 'true')
    return api<{ data: AuditCall[] }>(`/analytics/recent-calls?${query}`, { auth: 'portal' })
  },
  consents() {
    return api<ConsentBreakdown>('/analytics/consents', { auth: 'portal' })
  },
}

// ---------------------------------------------------------------------------
// Shared presentation helpers. Used by both dashboards so a status code or a
// duration is described the same way everywhere.
// ---------------------------------------------------------------------------

/** Compact counts for tiles: 1_732_646 -> 1.7M. Exact below 10k, where precision matters. */
export function compactNumber(value: number) {
  if (value < 10_000) return value.toLocaleString()
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 100_000 ? 1 : 0)}K`
  return `${(value / 1_000_000).toFixed(1)}M`
}

export function percent(ratio: number, digits = 1) {
  return `${(ratio * 100).toFixed(digits)}%`
}

export function duration(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`
}

export type Severity = 'ok' | 'warn' | 'bad'

/** 2xx is fine, 4xx is the caller's problem, 5xx is ours. */
export function severityOf(statusCode: number): Severity {
  if (statusCode >= 500) return 'bad'
  if (statusCode >= 400) return 'warn'
  return 'ok'
}

/**
 * Plain-language readings of the gateway's error codes. These are the ones a
 * dashboard viewer actually needs to recognise on sight.
 */
export const ERROR_CODE_LABELS: Record<string, string> = {
  consent_revoked: 'Customer revoked consent',
  consent_expired: 'Consent expired',
  consent_not_authorised: 'Consent not authorised',
  client_deactivated: 'Partner app deactivated',
  account_not_found: 'Account not shared',
  insufficient_scope: 'Scope not granted',
  invalid_token: 'Invalid token',
  token_expired: 'Token expired',
  rate_limited: 'Rate limit exceeded',
  validation_error: 'Invalid request',
  admin_key_required: 'Admin credentials required',
  invalid_admin_key: 'Invalid admin key',
  admin_required: 'Not an administrator',
  upstream_unavailable: 'Core banking unavailable',
}

export function describeError(code: string | null) {
  if (!code) return null
  return ERROR_CODE_LABELS[code] ?? code.replace(/_/g, ' ')
}

export function relativeTime(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86_400)}d ago`
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
