import { randomBytes } from 'node:crypto';
import { config } from '../../config.js';
import { pool, withTransaction, type Queryable } from '../../lib/db.js';
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
  sandbox: boolean;
}

export interface ConsentWithClient extends Consent {
  client_name: string;
  client_description: string | null;
  client_public_id: string;
  client_website_url: string | null;
  client_privacy_policy_url: string | null;
  client_logo_url: string | null;
  client_created_at: Date;
}

const withClientSql = `
  SELECT c.*, cl.name AS client_name, cl.description AS client_description, cl.client_id AS client_public_id,
         cl.website_url AS client_website_url, cl.privacy_policy_url AS client_privacy_policy_url,
         cl.logo_url AS client_logo_url, cl.created_at AS client_created_at
    FROM consents c JOIN clients cl ON cl.id = c.client_id`;

/**
 * A pending request the customer never acted on is expired after
 * CONSENT_REQUEST_TTL_MINUTES so abandoned rows cannot pile up or be approved
 * days later. Returns true if the row was (or already is) expired.
 *
 * Callers inside a transaction must COMMIT before throwing, or the status
 * change is rolled back with the error — see `requestExpired` below.
 */
async function expireIfStale(tx: Queryable, consent: Consent): Promise<boolean> {
  if (consent.status === 'expired') return true;
  if (consent.status !== 'awaiting_authorisation') return false;
  const ageMs = Date.now() - new Date(consent.created_at).getTime();
  if (ageMs < config.CONSENT_REQUEST_TTL_MINUTES * 60 * 1000) return false;
  await tx.query(`UPDATE consents SET status = 'expired' WHERE id = $1 AND status = 'awaiting_authorisation'`, [
    consent.id,
  ]);
  consent.status = 'expired';
  return true;
}

const EXPIRED = Symbol('consent request expired');

function requestExpired(): never {
  throw ApiError.gone('consent_request_expired', 'This connection request has expired, start again from the app');
}

/**
 * Consent lifecycle:
 *   awaiting_authorisation --> authorised --> revoked | expired
 *                         \--> rejected
 *                         \--> expired   (not acted on within CONSENT_REQUEST_TTL_MINUTES)
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
   * Load a consent on behalf of the logged-in customer, for the consent screen.
   *
   * The first customer to open a pending request is bound to it, so nobody
   * else can view or approve it afterwards: a consent belongs to exactly one
   * customer from the moment they see it. Any other customer gets 404, not
   * 403, so the id leaks nothing. Pending requests that are older than
   * CONSENT_REQUEST_TTL_MINUTES are expired on the way through.
   */
  async openForCustomer(id: string, customerId: string): Promise<ConsentWithClient> {
    const result = await withTransaction(async (tx) => {
      const { rows } = await tx.query<ConsentWithClient>(`${withClientSql} WHERE c.id = $1 FOR UPDATE OF c`, [id]);
      const consent = rows[0];
      if (!consent || (consent.customer_id && consent.customer_id !== customerId)) {
        throw ApiError.notFound('consent_not_found', 'Consent not found');
      }
      if (await expireIfStale(tx, consent)) return EXPIRED;
      if (!consent.customer_id && consent.status === 'awaiting_authorisation') {
        await tx.query(`UPDATE consents SET customer_id = $2 WHERE id = $1`, [id, customerId]);
        consent.customer_id = customerId;
      }
      return consent;
    });
    if (result === EXPIRED) requestExpired();
    return result;
  },

  /**
   * Customer approves: bind the consent to them, record chosen accounts, set
   * expiry, and mint a single-use authorization code for the client.
   */
  async authorise(id: string, customerId: string, accountIds: string[]) {
    const result = await withTransaction(async (tx) => {
      const { rows } = await tx.query<Consent>(`SELECT * FROM consents WHERE id = $1 FOR UPDATE`, [id]);
      const consent = rows[0];
      if (!consent || (consent.customer_id && consent.customer_id !== customerId)) {
        throw ApiError.notFound('consent_not_found', 'Consent not found');
      }
      if (await expireIfStale(tx, consent)) return EXPIRED;
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
    if (result === EXPIRED) requestExpired();
    return result;
  },

  async reject(id: string, customerId: string) {
    const { rows } = await pool.query<Consent>(
      `UPDATE consents SET status = 'rejected', customer_id = $2
        WHERE id = $1 AND status = 'awaiting_authorisation'
          AND (customer_id IS NULL OR customer_id = $2)
        RETURNING *`,
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
      `${withClientSql} WHERE c.customer_id = $1 AND NOT c.sandbox
          AND c.status IN ('authorised', 'revoked', 'expired')
        ORDER BY c.authorised_at DESC NULLS LAST, c.created_at DESC`,
      [customerId],
    );
    return rows;
  },

  // ---------------------------------------------------------------------------
  // Sandbox: pre-authorised consents for the portal's try-it console.
  // ---------------------------------------------------------------------------

  /** The active sandbox consent for a client, if any. */
  async activeSandboxForClient(clientRowId: string) {
    const { rows } = await pool.query<Consent>(
      `SELECT * FROM consents WHERE client_id = $1 AND sandbox AND status = 'authorised'
        ORDER BY created_at DESC LIMIT 1`,
      [clientRowId],
    );
    return rows[0] ?? null;
  },

  /**
   * Create an already-authorised sandbox consent. No customer interaction: this
   * stands in for the demo customer approving every account and every scope the
   * app is allowed, so a developer can call the APIs immediately.
   */
  async createSandbox(input: { clientRowId: string; customerId: string; scopes: string[]; accountIds: string[] }) {
    const expiresAt = new Date(Date.now() + config.CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000);
    const { rows } = await pool.query<Consent>(
      `INSERT INTO consents (client_id, customer_id, scopes, account_ids, status, redirect_uri, sandbox, authorised_at, expires_at)
       VALUES ($1, $2, $3, $4, 'authorised', 'sandbox://portal', true, now(), $5) RETURNING *`,
      [input.clientRowId, input.customerId, input.scopes, input.accountIds, expiresAt],
    );
    return rows[0]!;
  },

  /** Revoke a client's sandbox consents so the developer can see what a revoked token looks like. */
  async revokeSandboxForClient(clientRowId: string) {
    const { rowCount } = await pool.query(
      `UPDATE consents SET status = 'revoked', revoked_at = now(), revoked_by = 'developer'
        WHERE client_id = $1 AND sandbox AND status = 'authorised'`,
      [clientRowId],
    );
    return rowCount ?? 0;
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
