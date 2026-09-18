/** Fields the gateway middleware attaches to every request. */
export interface AccessTokenClaims {
  /** customer_id the consent was granted by */
  sub: string;
  client_id: string; // public client_id string (not the row uuid)
  consent_id: string;
  scope: string; // space-separated
  jti: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  token: AccessTokenClaims;
  clientRowId: string; // clients.id uuid
  customerId: string;
  consentId: string;
  scopes: string[];
  accountIds: string[]; // accounts the customer approved
}

/**
 * Light attribution stamped by `authenticate` as soon as the consent row is
 * read, *before* its status checks run. Without it, a call rejected because the
 * consent was revoked would have no client attached and the dashboard could not
 * show that a partner's calls started failing after revocation.
 */
export interface AuditContext {
  clientRowId?: string;
  consentId?: string;
  customerId?: string;
}

/**
 * The partner itself, for the reference APIs: any valid token from an active
 * client, whether it was issued through a customer's consent or through the
 * client_credentials grant. No customer, no consent, no account list.
 */
export interface PartnerContext {
  clientRowId: string;
  clientId: string;
  /** 'client' for a client_credentials token, 'consent' for a customer-bound one. */
  kind: 'client' | 'consent';
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      auth?: AuthContext;
      /** set by `authenticatePartner` on the reference APIs */
      partner?: PartnerContext;
      /** fallback attribution for calls that never reach a successful auth */
      audit?: AuditContext;
      /** machine-readable error code, set by the error handler */
      errorCode?: string;
    }
  }
}
