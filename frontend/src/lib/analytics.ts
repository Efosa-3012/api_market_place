import { adminSession, api } from './api'

export { adminSession }

/**
 * Bank-staff analytics (`/analytics/*`). Every call needs the admin key, stored
 * by the admin login and sent as `X-Admin-Key`. Everything here is derived from
 * the `api_calls` audit table and the `consents` table.
 */

export type Window = '1h' | '6h' | '24h' | '7d'

export interface Summary {
  window: Window
  calls: number
  errors: number
  error_rate: number // 0..1
  p95_latency_ms: number
  active_consents: number
  revocations: number
  total_consents: number
}

export interface ClientCalls {
  client_id: string
  name: string
  status: 'active' | 'deactivated'
  calls: number
  errors: number
}

export interface Bucket {
  bucket: string // ISO timestamp, 5-minute bins
  calls: number
  errors: number
}

export interface RecentCall {
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
  created_at: string
}

export interface ConsentCount {
  status: 'awaiting_authorisation' | 'authorised' | 'rejected' | 'revoked' | 'expired'
  count: number
}

function headers(key?: string) {
  const k = key ?? adminSession.key() ?? ''
  return { 'X-Admin-Key': k }
}

export const analytics = {
  /** Check a key without storing it — used by the admin login. */
  async verifyKey(key: string) {
    await api<Summary>('/analytics/summary?window=1h', { headers: headers(key) })
    return true
  },
  summary(window: Window = '24h') {
    return api<Summary>(`/analytics/summary?window=${window}`, { headers: headers() })
  },
  async callsPerClient() {
    return (await api<{ data: ClientCalls[] }>('/analytics/calls-per-client', { headers: headers() })).data
  },
  async timeseries(window: Window = '24h') {
    return api<{ window: Window; bucket_seconds: number; data: Bucket[] }>(`/analytics/timeseries?window=${window}`, { headers: headers() })
  },
  async recentCalls(limit = 50) {
    return (await api<{ data: RecentCall[] }>(`/analytics/recent-calls?limit=${limit}`, { headers: headers() })).data
  },
  async consents() {
    return api<{ data: ConsentCount[]; total: number }>('/analytics/consents', { headers: headers() })
  },
}
