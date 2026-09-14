import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/lib/db.js';

/**
 * The security-critical paths of the consent system. If any of these regress,
 * the platform is giving a partner access it was not granted — so these are the
 * five a reviewer will ask about.
 */

const CLIENT_ID = 'test-client';
const CLIENT_SECRET = 'test-client-secret';
const REDIRECT_URI = 'http://localhost:3000/callback';
const USERNAME = 'test-customer';
const PASSWORD = 'test-password';
const OTHER_USERNAME = 'other-customer';
const OTHER_CUSTOMER_ID = 'customer-demo-002';

// Ids that exist in the in-memory core banking adapter.
const CUSTOMER_ID = 'customer-demo-001';
const CONSENTED_ACCOUNT = 'acct-demo-001';
const UNCONSENTED_ACCOUNT = 'acct-demo-002';

const ALL_SCOPES = 'accounts:read balances:read transactions:read';

const app = createApp();

interface Grant {
  session: string;
  consentId: string;
  code: string;
  accessToken: string;
}

/** Walks the real consent journey and returns everything it produced. */
async function grant(scope: string, accountIds: string[]): Promise<Grant> {
  const login = await request(app).post('/bank/login').send({ username: USERNAME, password: PASSWORD }).expect(200);
  const session = login.body.session_token as string;

  const authorize = await request(app)
    .get('/oauth/authorize')
    .query({ response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, scope, format: 'json' })
    .expect(201);
  const consentId = authorize.body.consent_id as string;

  const approved = await request(app)
    .post(`/bank/consents/${consentId}/authorise`)
    .set('authorization', `Bearer ${session}`)
    .send({ account_ids: accountIds })
    .expect(200);
  const code = new URL(approved.body.redirect_to).searchParams.get('code');
  expect(code).toBeTruthy();

  const token = await request(app)
    .post('/oauth/token')
    .auth(CLIENT_ID, CLIENT_SECRET)
    .type('form')
    .send({ grant_type: 'authorization_code', code: code!, redirect_uri: REDIRECT_URI })
    .expect(200);

  return { session, consentId, code: code!, accessToken: token.body.access_token as string };
}

beforeAll(async () => {
  await pool.query('TRUNCATE api_calls, authorization_codes, consents RESTART IDENTITY CASCADE');

  const developer = await pool.query<{ id: string }>(
    `INSERT INTO developers (email, password_hash, name) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    ['tests@example.test', 'not-used', 'Test Developer'],
  );

  await pool.query(
    `INSERT INTO clients (developer_id, name, client_id, client_secret_hash, redirect_uris)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (client_id) DO UPDATE SET client_secret_hash = EXCLUDED.client_secret_hash,
       redirect_uris = EXCLUDED.redirect_uris, status = 'active'`,
    [developer.rows[0]!.id, 'Test Client', CLIENT_ID, await bcrypt.hash(CLIENT_SECRET, 4), [REDIRECT_URI]],
  );

  await pool.query(
    `INSERT INTO bank_customers (customer_id, username, password_hash, full_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (customer_id) DO UPDATE SET username = EXCLUDED.username,
       password_hash = EXCLUDED.password_hash`,
    [CUSTOMER_ID, USERNAME, await bcrypt.hash(PASSWORD, 4), 'Test Customer'],
  );
  await pool.query(
    `INSERT INTO bank_customers (customer_id, username, password_hash, full_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (customer_id) DO UPDATE SET username = EXCLUDED.username,
       password_hash = EXCLUDED.password_hash`,
    [OTHER_CUSTOMER_ID, OTHER_USERNAME, await bcrypt.hash(PASSWORD, 4), 'Other Customer'],
  );
});

async function login(username: string) {
  const res = await request(app).post('/bank/login').send({ username, password: PASSWORD }).expect(200);
  return res.body.session_token as string;
}

async function startConsent() {
  const res = await request(app)
    .get('/oauth/authorize')
    .query({ response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, scope: ALL_SCOPES, format: 'json' })
    .expect(201);
  return res.body.consent_id as string;
}

afterAll(async () => {
  // The audit middleware writes fire-and-forget; give those inserts a tick to
  // land before the pool closes, so they do not log errors after the run.
  await new Promise((resolve) => setTimeout(resolve, 100));
  await pool.end();
});

describe('consent enforcement', () => {
  it('serves account data for an authorised consent', async () => {
    const { accessToken, consentId } = await grant(ALL_SCOPES, [CONSENTED_ACCOUNT]);

    const res = await request(app)
      .get('/api/v1/accounts')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.meta.consent_id).toBe(consentId);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].account_id).toBe(CONSENTED_ACCOUNT);
    // The narrowed public shape, not the core banking object.
    expect(res.body.data[0]).not.toHaveProperty('account_number');
    expect(res.body.data[0].account_number_masked).toBe('****0001');
  });

  it('rejects the same call once the customer revokes', async () => {
    const { accessToken, consentId, session } = await grant(ALL_SCOPES, [CONSENTED_ACCOUNT]);
    await request(app).get('/api/v1/accounts').set('authorization', `Bearer ${accessToken}`).expect(200);

    await request(app)
      .post(`/bank/connected-apps/${consentId}/revoke`)
      .set('authorization', `Bearer ${session}`)
      .expect(200);

    // Same unexpired token, next call: revocation is enforced per request.
    const res = await request(app)
      .get('/api/v1/accounts')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('consent_revoked');
  });

  it('rejects a token whose consent lacks the required scope', async () => {
    const { accessToken } = await grant('accounts:read', [CONSENTED_ACCOUNT]);

    // Granted for accounts, so accounts still work...
    await request(app)
      .get(`/api/v1/accounts/${CONSENTED_ACCOUNT}`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);

    // ...but transactions were never consented to.
    const res = await request(app)
      .get(`/api/v1/accounts/${CONSENTED_ACCOUNT}/transactions`)
      .set('authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('insufficient_scope');
  });

  it('returns 404, not 403, for an account outside the consent', async () => {
    const { accessToken } = await grant(ALL_SCOPES, [CONSENTED_ACCOUNT]);

    const res = await request(app)
      .get(`/api/v1/accounts/${UNCONSENTED_ACCOUNT}`)
      .set('authorization', `Bearer ${accessToken}`);

    // 404 rather than 403 so a partner cannot probe which account ids exist.
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('account_not_found');
  });

  it('refuses to exchange an authorization code twice', async () => {
    const { code } = await grant(ALL_SCOPES, [CONSENTED_ACCOUNT]);

    const res = await request(app)
      .post('/oauth/token')
      .auth(CLIENT_ID, CLIENT_SECRET)
      .type('form')
      .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI })
      .expect(400);

    // RFC 6749 §5.2 shape, not our standard envelope.
    expect(res.body.error).toBe('invalid_grant');
  });
});

describe('consent request ownership', () => {
  it('binds a pending consent to the first customer who opens it', async () => {
    const consentId = await startConsent();
    const ada = await login(USERNAME);
    const other = await login(OTHER_USERNAME);

    await request(app).get(`/bank/consents/${consentId}`).set('authorization', `Bearer ${ada}`).expect(200);

    // A different customer can neither see it nor approve it with their own accounts.
    const view = await request(app).get(`/bank/consents/${consentId}`).set('authorization', `Bearer ${other}`);
    expect(view.status).toBe(404);

    const approve = await request(app)
      .post(`/bank/consents/${consentId}/authorise`)
      .set('authorization', `Bearer ${other}`)
      .send({ account_ids: [UNCONSENTED_ACCOUNT] });
    expect(approve.status).toBe(404);

    // The customer it belongs to can still complete it.
    await request(app)
      .post(`/bank/consents/${consentId}/authorise`)
      .set('authorization', `Bearer ${ada}`)
      .send({ account_ids: [CONSENTED_ACCOUNT] })
      .expect(200);
  });

  it('expires a pending consent the customer never acted on', async () => {
    const consentId = await startConsent();
    const ada = await login(USERNAME);

    // Age the request past CONSENT_REQUEST_TTL_MINUTES.
    await pool.query(`UPDATE consents SET created_at = now() - interval '1 day' WHERE id = $1`, [consentId]);

    const view = await request(app).get(`/bank/consents/${consentId}`).set('authorization', `Bearer ${ada}`);
    expect(view.status).toBe(410);
    expect(view.body.error.code).toBe('consent_request_expired');

    const approve = await request(app)
      .post(`/bank/consents/${consentId}/authorise`)
      .set('authorization', `Bearer ${ada}`)
      .send({ account_ids: [CONSENTED_ACCOUNT] });
    expect(approve.status).toBe(410);

    const { rows } = await pool.query(`SELECT status FROM consents WHERE id = $1`, [consentId]);
    expect(rows[0].status).toBe('expired');
  });
});
