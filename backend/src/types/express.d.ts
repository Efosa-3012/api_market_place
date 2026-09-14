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

/** Who a request was attributed to, even when the call was ultimately rejected. */
export interface AuditContext {
  clientRowId?: string;
  consentId?: string;
  customerId?: string;
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      auth?: AuthContext;
      /** set as early as possible so rejected calls still show up against the right client */
      audit?: AuditContext;
      /** set by error handler so the audit log can record it */
      errorCode?: string;
    }
  }
}
