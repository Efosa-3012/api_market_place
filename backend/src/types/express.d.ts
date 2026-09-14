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

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      auth?: AuthContext;
      /** machine-readable error code, set by the error handler */
      errorCode?: string;
    }
  }
}
