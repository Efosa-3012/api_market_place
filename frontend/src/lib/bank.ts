import { api, bankSession, type BankCustomer } from './api'

/**
 * Typed wrappers for the bank's own customer-facing endpoints (`/bank/*`):
 * mock internet-banking login, the consent screen, and Connected Apps.
 * These are never called by partner apps.
 */

export type ConsentStatus = 'awaiting_authorisation' | 'authorised' | 'rejected' | 'revoked' | 'expired'

export interface Consent {
  id: string
  status: ConsentStatus
  scopes: string[]
  account_ids: string[]
  created_at: string
  authorised_at: string | null
  expires_at: string | null
  revoked_at: string | null
  client: { client_id: string; name: string; description: string | null }
}

/** The account shape the consent screen gets — enough to choose, not the full core record. */
export interface ConsentAccount {
  account_id: string
  account_number: string
  account_type: string
  currency: string
  status: string
  account_balance: string
}

/** Human wording for each scope, shown on the consent screen. */
export const SCOPE_LABELS: Record<string, { title: string; detail: string }> = {
  'accounts:read': {
    title: 'Account details',
    detail: 'Account type, currency, status and a masked account number.',
  },
  'balances:read': {
    title: 'Balances',
    detail: 'Your current available and ledger balances.',
  },
  'transactions:read': {
    title: 'Transaction history',
    detail: 'Amounts, dates, references and counterparties of your transactions.',
  },
}

export const bank = {
  async login(username: string, password: string) {
    const res = await api<{ session_token: string; expires_at: string; customer: BankCustomer }>('/bank/login', {
      method: 'POST',
      body: { username, password },
    })
    bankSession.save(res.session_token, res.customer)
    return res.customer
  },

  logout() {
    bankSession.clear()
  },

  me() {
    return api<{ customer: BankCustomer }>('/bank/me', { auth: 'bank' })
  },

  /** Opening a pending consent binds it to the logged-in customer. 404 = not yours, 410 = expired. */
  getConsent(consentId: string) {
    return api<{ consent: Consent; accounts: ConsentAccount[] }>(`/bank/consents/${consentId}`, { auth: 'bank' })
  },

  authorise(consentId: string, accountIds: string[]) {
    return api<{ consent_id: string; status: ConsentStatus; expires_at: string; redirect_to: string }>(
      `/bank/consents/${consentId}/authorise`,
      { method: 'POST', body: { account_ids: accountIds }, auth: 'bank' },
    )
  },

  reject(consentId: string) {
    return api<{ consent_id: string; status: ConsentStatus; redirect_to: string }>(
      `/bank/consents/${consentId}/reject`,
      { method: 'POST', auth: 'bank' },
    )
  },

  async connectedApps() {
    const res = await api<{ data: Consent[] }>('/bank/connected-apps', { auth: 'bank' })
    return res.data
  },

  revoke(consentId: string) {
    return api<{ consent_id: string; status: ConsentStatus; revoked_at: string }>(
      `/bank/connected-apps/${consentId}/revoke`,
      { method: 'POST', auth: 'bank' },
    )
  },
}
