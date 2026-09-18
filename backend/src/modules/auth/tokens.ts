import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

/**
 * The one place access tokens are minted. Used by /oauth/token (real consent
 * flow) and by the portal sandbox (pre-authorised consent for a test customer),
 * so both produce byte-for-byte the same kind of token and go through the same
 * `authenticate` checks.
 */
export function issueAccessToken(input: { clientId: string; consentId: string; customerId: string; scopes: string[] }) {
  const scope = input.scopes.join(' ');
  const accessToken = jwt.sign(
    { client_id: input.clientId, consent_id: input.consentId, scope },
    config.JWT_SECRET,
    { algorithm: 'HS256', subject: input.customerId, expiresIn: config.ACCESS_TOKEN_TTL_SECONDS, jwtid: randomUUID() },
  );
  return { access_token: accessToken, token_type: 'Bearer' as const, expires_in: config.ACCESS_TOKEN_TTL_SECONDS, scope };
}

/** The scope a client-credentials token carries: reference data, no customer involved. */
export const CLIENT_SCOPE = 'reference:read';

/**
 * A token for the partner acting on its own behalf (OAuth 2.0 client_credentials).
 * No customer, no consent: it can reach only the reference APIs. The `typ`
 * claim keeps the two token kinds apart — `authenticate` will not accept this
 * one for /api/v1/accounts, and `authenticateClient` will not mistake a
 * consent token for it.
 */
export function issueClientToken(input: { clientId: string }) {
  const accessToken = jwt.sign(
    { typ: 'client', client_id: input.clientId, scope: CLIENT_SCOPE },
    config.JWT_SECRET,
    { algorithm: 'HS256', subject: input.clientId, expiresIn: config.ACCESS_TOKEN_TTL_SECONDS, jwtid: randomUUID() },
  );
  return { access_token: accessToken, token_type: 'Bearer' as const, expires_in: config.ACCESS_TOKEN_TTL_SECONDS, scope: CLIENT_SCOPE };
}
