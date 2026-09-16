/**
 * Deterministic demo data. Safe to run repeatedly (upserts). Run this before
 * every rehearsal so the database is in a known state.
 *
 *   npm run seed
 */
import bcrypt from 'bcryptjs';
import { migrate } from './migrate.js';
import { pool } from '../lib/db.js';
import { isMain } from '../lib/isMain.js';
import { logger } from '../lib/logger.js';

// Bank customers live in the core banking service (its seed creates ten, with
// password `firstname-shortname-lastname`, e.g. ada / adaeze-ada-okonkwo). The
// marketplace holds no customer credentials. Listed here only for the console hint.
export const DEMO_CUSTOMERS = [
  ['ada', 'adaeze-ada-okonkwo'],
  ['emeka', 'emeka-emeka-okafor'],
  ['fatima', 'fatima-fatima-abubakar'],
  ['seun', 'oluwaseun-seun-johnson'],
  ['chiamaka', 'chiamaka-chiamaka-eze'],
  ['ibrahim', 'ibrahim-ibrahim-danjuma'],
  ['ngozi', 'ngozi-ngozi-nwosu'],
  ['tunde', 'tunde-tunde-bakare'],
  ['amina', 'amina-amina-yusuf'],
  ['kelechi', 'kelechi-kelechi-madu'],
] as const;

// The sample fintech app used in the demo.
export const DEMO_CLIENT = {
  client_id: 'budgetbuddy',
  client_secret: 'budgetbuddy-secret-dev-only',
  name: 'BudgetBuddy',
  description: 'A simple budgeting app that shows you where your money goes.',
  redirect_uris: ['http://localhost:3000/callback', 'http://localhost:3001/callback'],
  website_url: 'https://budgetbuddy.example',
  privacy_policy_url: 'https://budgetbuddy.example/privacy',
};

export const DEMO_DEVELOPER = { email: 'dev@budgetbuddy.example', password: 'password123', name: 'Demo Developer' };

// Bank staff account for the analytics dashboard. Signs in through the same
// portal login as a developer; the 'admin' role is what opens /admin.
export const DEMO_ADMIN = {
  email: 'admin@stanbic.example',
  password: 'password123',
  name: 'Bank Administrator',
  company: 'Stanbic IBTC',
};

export async function seed() {
  await migrate();

  const dev = await pool.query<{ id: string }>(
    `INSERT INTO developers (email, password_hash, name, company)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [DEMO_DEVELOPER.email, await bcrypt.hash(DEMO_DEVELOPER.password, 10), DEMO_DEVELOPER.name, 'BudgetBuddy Ltd'],
  );

  await pool.query(
    `INSERT INTO developers (email, password_hash, name, company, role)
     VALUES ($1, $2, $3, $4, 'admin')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [DEMO_ADMIN.email, await bcrypt.hash(DEMO_ADMIN.password, 10), DEMO_ADMIN.name, DEMO_ADMIN.company],
  );

  await pool.query(
    `INSERT INTO clients (developer_id, name, description, client_id, client_secret_hash, redirect_uris,
                          website_url, privacy_policy_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (client_id) DO UPDATE SET developer_id = EXCLUDED.developer_id, name = EXCLUDED.name,
       description = EXCLUDED.description, client_secret_hash = EXCLUDED.client_secret_hash,
       redirect_uris = EXCLUDED.redirect_uris, website_url = EXCLUDED.website_url,
       privacy_policy_url = EXCLUDED.privacy_policy_url, status = 'active', deactivated_at = NULL`,
    [
      dev.rows[0]!.id,
      DEMO_CLIENT.name,
      DEMO_CLIENT.description,
      DEMO_CLIENT.client_id,
      await bcrypt.hash(DEMO_CLIENT.client_secret, 10),
      DEMO_CLIENT.redirect_uris,
      DEMO_CLIENT.website_url,
      DEMO_CLIENT.privacy_policy_url,
    ],
  );

  logger.info('seed complete');
  logger.info(`bank login:   ${DEMO_CUSTOMERS.slice(0, 3).map(([u, p]) => `${u} / ${p}`).join(', ')} … (core banking seed)`);
  logger.info(`demo client:  ${DEMO_CLIENT.client_id} / ${DEMO_CLIENT.client_secret}`);
  logger.info(`developer:    ${DEMO_DEVELOPER.email} / ${DEMO_DEVELOPER.password}`);
  logger.info(`bank admin:   ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
}

if (isMain(import.meta.url)) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      logger.error(err, 'seed failed');
      process.exit(1);
    });
}
