import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/lib/db.js';

/**
 * Isolation boundaries around the two dashboards.
 *
 * The portal and the analytics routes both read the same `api_calls` audit
 * trail. Everything here checks that they hand out only the slice the caller is
 * entitled to: a developer sees their own apps and nobody else's, and the bank's
 * dashboard opens for bank staff and not for a developer who asks nicely.
 */

const app = createApp();

const ADMIN_KEY = 'test-admin-key-at-least-16-chars'; // matches vitest.config.ts

const ACME = { email: 'acme@portal.test', password: 'acme-password', name: 'Acme Developer' };
const RIVAL = { email: 'rival@portal.test', password: 'rival-password', name: 'Rival Developer' };
const STAFF = { email: 'staff@portal.test', password: 'staff-password', name: 'Bank Staff' };

const ACME_CLIENT = 'portal-test-acme';
const RIVAL_CLIENT = 'portal-test-rival';
const CLIENT_SECRET = 'portal-test-secret';
const REDIRECT_URI = 'http://localhost:3000/callback';

const CUSTOMER_ID = 'customer-demo-001';
const USERNAME = 'portal-test-customer';
const PASSWORD = 'portal-test-password';
const ACCOUNT = 'acct-demo-001';
const ALL_SCOPES = 'accounts:read balances:read transactions:read';

interface Registered {
  developerId: string;
  portalToken: string;
  appId: string;
}

async function registerDeveloper(
  who: { email: string; password: string; name: string },
  role: 'developer' | 'admin',
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO developers (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
     RETURNING id`,
    [who.email, await bcrypt.hash(who.password, 4), who.name, role],
  );
  return rows[0]!.id;
}

async function registerClient(developerId: string, clientId: string, name: string) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO clients (developer_id, name, client_id, client_secret_hash, redirect_uris)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (client_id) DO UPDATE SET developer_id = EXCLUDED.developer_id,
       client_secret_hash = EXCLUDED.client_secret_hash, redirect_uris = EXCLUDED.redirect_uris,
       status = 'active'
     RETURNING id`,
    [developerId, name, clientId, await bcrypt.hash(CLIENT_SECRET, 4), [REDIRECT_URI]],
  );
  return rows[0]!.id;
}

async function portalLogin(who: { email: string; password: string }) {
  const res = await request(app)
    .post('/portal/login')
    .send({ email: who.email, password: who.password })
    .expect(200);
  return res.body.portal_token as string;
}

/** Walks the real consent journey for a client and returns a usable access token. */
async function accessTokenFor(clientId: string) {
  const login = await request(app).post('/bank/login').send({ username: USERNAME, password: PASSWORD }).expect(200);
  const session = login.body.session_token as string;

  const authorize = await request(app)
    .get('/oauth/authorize')
    .query({ response_type: 'code', client_id: clientId, redirect_uri: REDIRECT_URI, scope: ALL_SCOPES, format: 'json' })
    .expect(201);

  const approved = await request(app)
    .post(`/bank/consents/${authorize.body.consent_id}/authorise`)
    .set('authorization', `Bearer ${session}`)
    .send({ account_ids: [ACCOUNT] })
    .expect(200);

  const code = new URL(approved.body.redirect_to).searchParams.get('code')!;
  const token = await request(app)
    .post('/oauth/token')
    .auth(clientId, CLIENT_SECRET)
    .type('form')
    .send({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI })
    .expect(200);

  return token.body.access_token as string;
}

/**
 * The audit middleware inserts on response finish, after the response has been
 * sent, so a log row can land a tick after the call returns. Poll rather than
 * sleep a fixed amount, which would either flake or waste time.
 */
async function logsFor(portalToken: string, atLeast: number, query: Record<string, string> = {}) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const res = await request(app)
      .get('/portal/logs')
      .query({ limit: '100', ...query })
      .set('authorization', `Bearer ${portalToken}`)
      .expect(200);
    if (res.body.data.length >= atLeast) return res.body.data as { path: string; app_name: string; status_code: number }[];
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`log rows did not reach ${atLeast} in time`);
}

let acme: Registered;
let rival: Registered;
let staffToken: string;

beforeAll(async () => {
  await pool.query('TRUNCATE api_calls, authorization_codes, consents RESTART IDENTITY CASCADE');

  await pool.query(
    `INSERT INTO bank_customers (customer_id, username, password_hash, full_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (customer_id) DO UPDATE SET username = EXCLUDED.username,
       password_hash = EXCLUDED.password_hash`,
    [CUSTOMER_ID, USERNAME, await bcrypt.hash(PASSWORD, 4), 'Portal Test Customer'],
  );

  const acmeId = await registerDeveloper(ACME, 'developer');
  const rivalId = await registerDeveloper(RIVAL, 'developer');
  await registerDeveloper(STAFF, 'admin');

  acme = {
    developerId: acmeId,
    portalToken: await portalLogin(ACME),
    appId: await registerClient(acmeId, ACME_CLIENT, 'Acme App'),
  };
  rival = {
    developerId: rivalId,
    portalToken: await portalLogin(RIVAL),
    appId: await registerClient(rivalId, RIVAL_CLIENT, 'Rival App'),
  };
  staffToken = await portalLogin(STAFF);

  // Traffic from both developers, so "scoped to me" has something to exclude.
  const acmeToken = await accessTokenFor(ACME_CLIENT);
  const rivalToken = await accessTokenFor(RIVAL_CLIENT);

  await request(app).get('/api/v1/accounts').set('authorization', `Bearer ${acmeToken}`).expect(200);
  await request(app).get(`/api/v1/accounts/${ACCOUNT}/balances`).set('authorization', `Bearer ${acmeToken}`).expect(200);
  // An account the customer did not share — a 4xx that must still show up in the log.
  await request(app).get('/api/v1/accounts/acct-demo-002').set('authorization', `Bearer ${acmeToken}`).expect(404);
  await request(app).get('/api/v1/accounts').set('authorization', `Bearer ${rivalToken}`).expect(200);
});

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await pool.end();
});

describe('developer request log', () => {
  it('shows only the calling developer’s own traffic', async () => {
    const rows = await logsFor(acme.portalToken, 3);

    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.every((row) => row.app_name === 'Acme App')).toBe(true);
    expect(rows.some((row) => row.path === '/api/v1/accounts')).toBe(true);
  });

  it('records rejected calls, not just successful ones', async () => {
    const rows = await logsFor(acme.portalToken, 1, { status: 'errors' });

    expect(rows.every((row) => row.status_code >= 400)).toBe(true);
    expect(rows.some((row) => row.status_code === 404)).toBe(true);
  });

  it('returns nothing for another developer’s app id', async () => {
    // Filtering by an app you do not own is not an error — it simply matches none
    // of your rows, so the id leaks nothing about whether it exists.
    const res = await request(app)
      .get('/portal/logs')
      .query({ app_id: rival.appId })
      .set('authorization', `Bearer ${acme.portalToken}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
  });

  it('counts only the calling developer’s traffic in the summary', async () => {
    await logsFor(acme.portalToken, 3);
    const mine = await request(app)
      .get('/portal/summary')
      .set('authorization', `Bearer ${acme.portalToken}`)
      .expect(200);
    const theirs = await request(app)
      .get('/portal/summary')
      .set('authorization', `Bearer ${rival.portalToken}`)
      .expect(200);

    expect(mine.body.calls).toBeGreaterThanOrEqual(3);
    expect(mine.body.by_app).toHaveLength(1);
    expect(mine.body.by_app[0].client_id).toBe(ACME_CLIENT);
    expect(theirs.body.by_app[0].client_id).toBe(RIVAL_CLIENT);
    expect(theirs.body.calls).toBeLessThan(mine.body.calls);
  });

  it('rejects a request with no portal token', async () => {
    const res = await request(app).get('/portal/logs').expect(401);
    expect(res.body.error.code).toBe('portal_token_required');
  });
});

describe('analytics access', () => {
  it('opens for a bank staff account signed in through the portal', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('authorization', `Bearer ${staffToken}`)
      .expect(200);

    expect(res.body.calls).toBeGreaterThan(0);
  });

  it('refuses a developer who is signed in but not staff', async () => {
    const res = await request(app)
      .get('/analytics/summary')
      .set('authorization', `Bearer ${acme.portalToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('admin_required');
  });

  it('still accepts the shared admin key, for scripts', async () => {
    await request(app).get('/analytics/summary').set('x-admin-key', ADMIN_KEY).expect(200);
  });

  it('refuses a wrong admin key and a missing credential alike', async () => {
    const wrong = await request(app).get('/analytics/summary').set('x-admin-key', 'not-the-key-but-same-len').expect(401);
    expect(wrong.body.error.code).toBe('invalid_admin_key');

    const missing = await request(app).get('/analytics/summary').expect(401);
    expect(missing.body.error.code).toBe('admin_key_required');
  });
});
