import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/lib/db.js';
import { checkDigit, generate, validate } from '../src/modules/reference/nuban.js';

/**
 * Reference APIs and the client_credentials grant behind them.
 *
 * Two boundaries matter: a client token must open the reference data and
 * nothing else, and a deactivated client must lose the reference data too.
 */

const app = createApp();

const CLIENT_ID = 'reference-test-client';
const CLIENT_SECRET = 'reference-test-secret';
let clientRowId: string;

async function clientToken() {
  const res = await request(app)
    .post('/oauth/token')
    .auth(CLIENT_ID, CLIENT_SECRET)
    .type('form')
    .send({ grant_type: 'client_credentials' });
  expect(res.status).toBe(200);
  return res.body.access_token as string;
}

beforeAll(async () => {
  const dev = await pool.query<{ id: string }>(
    `INSERT INTO developers (email, password_hash, name) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    ['reference@portal.test', await bcrypt.hash('x', 4), 'Reference Developer'],
  );
  const client = await pool.query<{ id: string }>(
    `INSERT INTO clients (developer_id, name, client_id, client_secret_hash, redirect_uris)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (client_id) DO UPDATE SET client_secret_hash = EXCLUDED.client_secret_hash, status = 'active'
     RETURNING id`,
    [dev.rows[0]!.id, 'Reference Test App', CLIENT_ID, await bcrypt.hash(CLIENT_SECRET, 4), ['http://localhost:3000/callback']],
  );
  clientRowId = client.rows[0]!.id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM api_calls WHERE client_id = $1`, [clientRowId]);
  await pool.query(`DELETE FROM clients WHERE id = $1`, [clientRowId]);
  await pool.query(`DELETE FROM developers WHERE email = 'reference@portal.test'`);
  await pool.end();
});

describe('NUBAN check digit', () => {
  it('matches the CBN worked example', () => {
    // bank 221, serial 000000012 → weights 3,7,3 → sum 36 → check 4
    expect(checkDigit('221', '000000012')).toBe(4);
    expect(generate('221', '000000012')).toBe('0000000124');
  });

  it('accepts the right check digit and rejects every other', () => {
    expect(validate('221', '0000000124')).toBe(true);
    for (const wrong of ['0', '1', '2', '3', '5', '6', '7', '8', '9']) {
      expect(validate('221', `000000012${wrong}`)).toBe(false);
    }
  });

  it('is bank-specific: the same serial has a different digit at another bank', () => {
    expect(validate('058', '0000000124')).toBe(false);
  });

  it('refuses malformed input rather than guessing', () => {
    expect(() => checkDigit('22', '000000012')).toThrow();
    expect(() => checkDigit('221', '12')).toThrow();
    expect(validate('221', '12345')).toBe(false);
  });
});

describe('client_credentials grant', () => {
  it('issues a token with only the reference scope', async () => {
    const res = await request(app)
      .post('/oauth/token')
      .auth(CLIENT_ID, CLIENT_SECRET)
      .type('form')
      .send({ grant_type: 'client_credentials' });
    expect(res.status).toBe(200);
    expect(res.body.token_type).toBe('Bearer');
    expect(res.body.scope).toBe('reference:read');
    expect(res.body.consent_id).toBeUndefined();
  });

  it('refuses without client authentication', async () => {
    const res = await request(app).post('/oauth/token').type('form').send({ grant_type: 'client_credentials' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_client');
  });
});

describe('reference APIs', () => {
  it('lists banks and filters by name or code', async () => {
    const token = await clientToken();
    const all = await request(app).get('/api/v1/reference/banks').set('Authorization', `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(all.body.data.length).toBeGreaterThan(20);
    expect(all.body.data.find((b: { code: string }) => b.code === '221').name).toBe('Stanbic IBTC Bank');

    const byName = await request(app).get('/api/v1/reference/banks?q=zenith').set('Authorization', `Bearer ${token}`);
    expect(byName.body.data).toHaveLength(1);
    expect(byName.body.data[0].code).toBe('057');

    const one = await request(app).get('/api/v1/reference/banks/058').set('Authorization', `Bearer ${token}`);
    expect(one.body.data.slug).toBe('gtbank');

    const missing = await request(app).get('/api/v1/reference/banks/999').set('Authorization', `Bearer ${token}`);
    expect(missing.status).toBe(404);
  });

  it('generates and validates a NUBAN over HTTP', async () => {
    const token = await clientToken();
    const gen = await request(app)
      .get('/api/v1/reference/nuban/generate?bank_code=221&serial=000000012')
      .set('Authorization', `Bearer ${token}`);
    expect(gen.status).toBe(200);
    expect(gen.body.data.account_number).toBe('0000000124');
    expect(gen.body.data.bank_name).toBe('Stanbic IBTC Bank');

    const ok = await request(app)
      .get('/api/v1/reference/nuban/validate?bank_code=221&account_number=0000000124')
      .set('Authorization', `Bearer ${token}`);
    expect(ok.body.data.valid).toBe(true);

    const bad = await request(app)
      .get('/api/v1/reference/nuban/validate?bank_code=221&account_number=0000000125')
      .set('Authorization', `Bearer ${token}`);
    expect(bad.body.data.valid).toBe(false);
    expect(bad.body.data.expected_check_digit).toBe(4);

    const malformed = await request(app)
      .get('/api/v1/reference/nuban/validate?bank_code=22&account_number=0000000124')
      .set('Authorization', `Bearer ${token}`);
    expect(malformed.status).toBe(400);
  });

  it('refuses a client token on the customer-data APIs', async () => {
    const token = await clientToken();
    const res = await request(app).get('/api/v1/accounts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('invalid_token');
  });

  it('refuses a call with no token, and a portal session', async () => {
    const none = await request(app).get('/api/v1/reference/banks');
    expect(none.status).toBe(401);
  });

  it('cuts off a deactivated client on the very next call', async () => {
    const token = await clientToken();
    await pool.query(`UPDATE clients SET status = 'deactivated' WHERE id = $1`, [clientRowId]);
    try {
      const res = await request(app).get('/api/v1/reference/banks').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('client_deactivated');
    } finally {
      await pool.query(`UPDATE clients SET status = 'active' WHERE id = $1`, [clientRowId]);
    }
  });
});
