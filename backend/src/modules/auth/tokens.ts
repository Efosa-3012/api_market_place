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
