import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { pool } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';

/**
 * Portal sessions: the one place portal tokens are minted and verified.
 *
 * Shared by the portal routes (developer self-service) and the analytics routes
 * (the bank's dashboard), because an admin signs in through the same login as a
 * developer and is told apart by `role`.
 *
 * A portal token is deliberately NOT the partner access-token shape: it carries
 * a developer_id and a `typ` marker, so a portal token can never be presented as
 * a partner token (authenticate would find no consent for it) and a partner
 * token can never be presented here.
 */

export const PORTAL_TOKEN_TTL_SECONDS = 86_400;

export type DeveloperRole = 'developer' | 'admin';

export interface DeveloperRow {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: DeveloperRole;
  created_at: Date;
}

export function publicDeveloper(d: DeveloperRow) {
  return { id: d.id, email: d.email, name: d.name, company: d.company, role: d.role, created_at: d.created_at };
}

export function issuePortalToken(developerId: string) {
  return jwt.sign({ typ: 'portal', developer_id: developerId }, config.JWT_SECRET, {
    algorithm: 'HS256',
    subject: developerId,
    expiresIn: PORTAL_TOKEN_TTL_SECONDS,
  });
}

/**
 * Resolve `Authorization: Bearer <portal token>` to the developer it belongs to.
 *
 * The role is read from the database rather than trusted from the token, so
 * granting or removing admin takes effect on the next request instead of when
 * the token happens to expire.
 */
export async function developerFromRequest(header: string | undefined): Promise<DeveloperRow> {
  const [scheme, token] = (header ?? '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw ApiError.unauthorized('portal_token_required', 'Log in to the developer portal first');
  }

  let claims: { typ?: string; developer_id?: string };
  try {
    claims = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as typeof claims;
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    throw ApiError.unauthorized(
      expired ? 'portal_token_expired' : 'invalid_portal_token',
      expired ? 'Portal session has expired, log in again' : 'Portal token is invalid',
    );
  }
  if (claims.typ !== 'portal' || !claims.developer_id) {
    throw ApiError.unauthorized('invalid_portal_token', 'Portal token is invalid');
  }

  const { rows } = await pool.query<DeveloperRow>(
    `SELECT id, email, name, company, role::text AS role, created_at FROM developers WHERE id = $1`,
    [claims.developer_id],
  );
  const developer = rows[0];
  if (!developer) throw ApiError.unauthorized('invalid_portal_token', 'Portal token is invalid');
  return developer;
}
