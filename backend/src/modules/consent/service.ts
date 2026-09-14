import { randomBytes } from 'node:crypto';
import { config } from '../../config.js';
import { pool, withTransaction } from '../../lib/db.js';
import { ApiError } from '../../lib/errors.js';

export const SCOPES = ['accounts:read', 'balances:read', 'transactions:read'] as const;
export type Scope = (typeof SCOPES)[number];

export type ConsentStatus = 'awaiting_authorisation' | 'authorised' | 'rejected' | 'revoked' | 'expired';

export interface Consent {
  id: string;
  client_id: string; // clients.id uuid
  customer_id: string | null;
  scopes: string[];
  account_ids: string[];
  status: ConsentStatus;
  redirect_uri: string;
  state: string | null;
  created_at: Date;
  authorised_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
  revoked_by: string | null;
}

export interface ConsentWithClient extends Consent {
  client_name: string;
  client_description: string | null;
  client_public_id: string;
}

const withClientSql = `
  SELECT c.*, cl.name AS client_name, cl.description AS client_description, cl.client_id AS client_public_id
    FROM consents c JOIN clients cl ON cl.id = c.client_id`;

/**
 * Consent lifecycle:
 *   awaiting_authorisation --> authorised --> revoked | expired
 *                         \--> rejected
 */
export const consentService = {
  async create(input: { clientRowId: string; scopes: string[]; redirectUri: string; state?: string }) {
    const { rows } = await pool.query<Consent>(
      `INSERT INTO consents (client_id, scopes, redirect_uri, state)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.clientRowId, input.scopes, input.redirectUri, input.state ?? null],
    );
    return rows[0]!;
  },

  async get(id: string): Promise<ConsentWithClient> {
    const { rows } = await pool.query<ConsentWithClient>(`${withClientSql} WHERE c.id = $1`, [id]);
    const consent = rows[0];
    if (!consent) throw ApiError.notFound('consent_not_found', 'Consent not found');
    return consent;
  },

  /**
   * Customer approves: bind the consent to them, record chosen accounts, set
   * expiry, and mint a single-use authorization code for the client.
   */
  async authorise(id: string, customerId: string, accountIds: string[]) {
    return withTransaction(async (tx) => {
      const { rows } = await tx.query<Consent>(`SELECT * FROM consents WHERE id = $1 FOR UPDATE`, [id]);
      const consent = rows[0];
      if (!consent) throw ApiError.notFound('consent_not_found', 'Consent not found');
      if (consent.status !== 'awaiting_authorisation') {
        throw ApiError.conflict('consent_not_pending', `Consent is already ${consent.status}`);
      }
      if (accountIds.length === 0) {
        throw ApiError.badRequest('no_accounts_selected', 'Select at least one account to share');
      }

      const expiresAt = new Date(Date.now() + config.CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000);
      const updated = await tx.query<Consent>(
        `UPDATE consents
            SET status = 'authorised', customer_id = $2, account_ids = $3,
                authorised_at = now(), expires_at = $4
          WHERE id = $1 RETURNING *`,
        [id, customerId, accountIds, expiresAt],
      );

      const code = randomBytes(32).toString('base64url');
      await tx.query(
        `INSERT INTO authorization_codes (code, consent_id, expires_at)
         VALUES ($1, $2, now() + ($3 || ' seconds')::interval)`,
        [code, id, String(config.AUTH_CODE_TTL_SECONDS)],
      );

      return { consent: updated.rows[0]!, code };
    });
  },

  async reject(id: string, customerId: string) {
    const { rows } = await pool.query<Consent>(
      `UPDATE consents SET status = 'rejected', customer_id = $2
        WHERE id = $1 AND status = 'awaiting_authorisation' RETURNING *`,
      [id, customerId],
    );
    const consent = rows[0];
    if (!consent) throw ApiError.conflict('consent_not_pending', 'Consent is not awaiting authorisation');
    return consent;
  },

  /** Customer (or bank) switches a consent off. Takes effect on the next API call. */
  async revoke(id: string, by: 'customer' | 'bank', customerId?: string) {
    const { rows } = await pool.query<Consent>(
      `UPDATE consents SET status = 'revoked', revoked_at = now(), revoked_by = $2
        WHERE id = $1 AND status = 'authorised' AND ($3::text IS NULL OR customer_id = $3)
        RETURNING *`,
      [id, by, customerId ?? null],
    );
    const consent = rows[0];
    if (!consent) throw ApiError.notFound('consent_not_found', 'No active consent found');
    return consent;
  },

  /** Blast-radius switch: deactivating a client kills every consent under it. */
  async revokeAllForClient(clientRowId: string) {
    const { rowCount } = await pool.query(
      `UPDATE consents SET status = 'revoked', revoked_at = now(), revoked_by = 'client_deactivated'
        WHERE client_id = $1 AND status IN ('authorised', 'awaiting_authorisation')`,
      [clientRowId],
    );
    return rowCount ?? 0;
  },

  /** "Connected Apps" — what the customer has granted, newest first. */
  async listForCustomer(customerId: string) {
    const { rows } = await pool.query<ConsentWithClient>(
      `${withClientSql} WHERE c.customer_id = $1 AND c.status IN ('authorised', 'revoked', 'expired')
        ORDER BY c.authorised_at DESC NULLS LAST, c.created_at DESC`,
      [customerId],
    );
    return rows;
  },

  /**
   * Exchange an authorization code. Single use, time-limited, and the caller
   * must be the client the consent was issued to with the same redirect_uri.
   */
  async consumeAuthorizationCode(code: string, clientRowId: string, redirectUri: string) {
    return withTransaction(async (tx) => {
      const { rows } = await tx.query<{
        consent_id: string;
        expires_at: Date;
        used_at: Date | null;
        client_id: string;
        redirect_uri: string;
        status: ConsentStatus;
        customer_id: string;
        scopes: string[];
      }>(
        `SELECT ac.consent_id, ac.expires_at, ac.used_at, c.client_id, c.redirect_uri, c.status, c.customer_id, c.scopes
           FROM authorization_codes ac JOIN consents c ON c.id = ac.consent_id
          WHERE ac.code = $1 FOR UPDATE OF ac`,
        [code],
      );
      const row = rows[0];
      if (!row || row.client_id !== clientRowId || row.redirect_uri !== redirectUri) return null;
      if (row.used_at || row.expires_at.getTime() < Date.now() || row.status !== 'authorised') return null;
      await tx.query(`UPDATE authorization_codes SET used_at = now() WHERE code = $1`, [code]);
      return { consentId: row.consent_id, customerId: row.customer_id, scopes: row.scopes };
    });
  },
};
