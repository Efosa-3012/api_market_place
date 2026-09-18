import { api, portalSession, type Developer } from './api'

/** Typed wrappers around the developer-portal endpoints (`/portal/*`). */

export interface App {
  id: string
  client_id: string
  name: string
  description: string | null
  redirect_uris: string[]
  allowed_scopes: string[]
  status: 'active' | 'deactivated'
  website_url: string | null
  privacy_policy_url: string | null
  logo_url: string | null
  created_at: string
  deactivated_at: string | null
}

/** Returned by create + rotate. `client_secret` is shown once and never again. */
export interface AppWithSecret extends App {
  client_secret: string
  warning: string
}

interface SessionResponse {
  developer: Developer
  portal_token: string
}

/** Windows the portal may ask for. Matches the backend enum exactly. */
export type PortalWindow = '1h' | '24h' | '7d' | '30d'

export const PORTAL_WINDOW_LABELS: Record<PortalWindow, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
}

export interface AppTraffic {
  app_id: string
  client_id: string
  name: string
  status: 'active' | 'deactivated'
  calls: number
  errors: number
}

export interface PortalSummary {
  window: PortalWindow
  calls: number
  errors: number
  client_errors: number
  server_errors: number
  error_rate: number
  p99_latency_ms: number
  apps_total: number
  apps_active: number
  active_consents: number
  sandbox_consents: number
  revoked_consents: number
  by_app: AppTraffic[]
}

/** One audited call your integration made through the gateway. */
export interface RequestLog {
  id: string
  correlation_id: string
  app_id: string
  client_id: string
  app_name: string
  consent_id: string | null
  method: string
  path: string
  status_code: number
  error_code: string | null
  duration_ms: number
  created_at: string
}

export type LogStatusFilter = '2xx' | '4xx' | '5xx' | 'errors'

export interface LogPage {
  data: RequestLog[]
  meta: { pagination: { limit: number; has_more: boolean; next_cursor?: string } }
}

export const portal = {
  async login(email: string, password: string) {
    const res = await api<SessionResponse>('/portal/login', { method: 'POST', body: { email, password } })
    portalSession.save(res.portal_token, res.developer)
    return res.developer
  },

  async signup(input: { email: string; password: string; name: string; company?: string }) {
    const res = await api<SessionResponse>('/portal/signup', { method: 'POST', body: input })
    portalSession.save(res.portal_token, res.developer)
    return res.developer
  },

  logout() {
    portalSession.clear()
  },

  async listApps() {
    const res = await api<{ data: App[] }>('/portal/apps', { auth: 'portal' })
    return res.data
  },

  createApp(input: {
    name: string
    description?: string
    redirect_uris: string[]
    website_url?: string
    privacy_policy_url?: string
    logo_url?: string
  }) {
    return api<AppWithSecret>('/portal/apps', { method: 'POST', body: input, auth: 'portal' })
  },

  updateApp(appId: string, input: Partial<Pick<App, 'name' | 'description' | 'redirect_uris' | 'website_url' | 'privacy_policy_url' | 'logo_url'>>) {
    return api<App>(`/portal/apps/${appId}`, { method: 'PATCH', body: input, auth: 'portal' })
  },

  rotateSecret(appId: string) {
    return api<AppWithSecret>(`/portal/apps/${appId}/rotate-secret`, { method: 'POST', auth: 'portal' })
  },

  deactivateApp(appId: string) {
    return api<App & { consents_revoked: number }>(`/portal/apps/${appId}/deactivate`, {
      method: 'POST',
      auth: 'portal',
    })
  },

  /** Your integration activity — the gateway's audit trail, scoped to your apps. */
  summary(window: PortalWindow = '24h') {
    return api<PortalSummary>(`/portal/summary?window=${window}`, { auth: 'portal' })
  },

  logs(options: { appId?: string; status?: LogStatusFilter; limit?: number; cursor?: string } = {}) {
    const query = new URLSearchParams()
    if (options.appId) query.set('app_id', options.appId)
    if (options.status) query.set('status', options.status)
    query.set('limit', String(options.limit ?? 25))
    if (options.cursor) query.set('cursor', options.cursor)
    return api<LogPage>(`/portal/logs?${query}`, { auth: 'portal' })
  },
}
