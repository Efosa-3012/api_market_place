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

  createApp(input: { name: string; description?: string; redirect_uris: string[] }) {
    return api<AppWithSecret>('/portal/apps', { method: 'POST', body: input, auth: 'portal' })
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
}
