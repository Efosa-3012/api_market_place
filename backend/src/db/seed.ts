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

// Bank customers: ids match the Go core banking seed (customer-demo-001..010).
// All demo logins use the password below.
export const DEMO_CUSTOMER_PASSWORD = 'password123';
const customers = [
  ['customer-demo-001', 'ada', 'Adaeze Ngozi Okonkwo'],
  ['customer-demo-002', 'emeka', 'Emeka Chukwuemeka Okafor'],
  ['customer-demo-003', 'fatima', 'Fatima Zahra Abubakar'],
  ['customer-demo-004', 'seun', 'Oluwaseun Adebayo Johnson'],
  ['customer-demo-005', 'chiamaka', 'Chiamaka Blessing Eze'],
  ['customer-demo-006', 'ibrahim', 'Ibrahim Musa Danjuma'],
  ['customer-demo-007', 'ngozi', 'Ngozi Patience Nwosu'],
  ['customer-demo-008', 'tunde', 'Tunde Olumide Bakare'],
  ['customer-demo-009', 'amina', 'Amina Hauwa Yusuf'],
  ['customer-demo-010', 'kelechi', 'Kelechi Obinna Madu'],
] as const;

// The sample fintech app used in the demo.
export const DEMO_CLIENT = {
  client_id: 'budgetbuddy',
  client_secret: 'budgetbuddy-secret-dev-only',
  name: 'BudgetBuddy',
  description: 'A simple budgeting app that shows you where your money goes.',
  redirect_uris: ['http://localhost:3000/callback', 'http://localhost:3001/callback'],
};

export const DEMO_DEVELOPER = { email: 'dev@budgetbuddy.example', password: 'password123', name: 'Demo Developer' };

export async function seed() {
  await migrate();
  const passwordHash = await bcrypt.hash(DEMO_CUSTOMER_PASSWORD, 10);

  for (const [customerId, username, fullName] of customers) {
    await pool.query(
      `INSERT INTO bank_customers (customer_id, username, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (customer_id) DO UPDATE SET username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name`,
      [customerId, username, passwordHash, fullName],
    );
  }

  const dev = await pool.query<{ id: string }>(
    `INSERT INTO developers (email, password_hash, name, company)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [DEMO_DEVELOPER.email, await bcrypt.hash(DEMO_DEVELOPER.password, 10), DEMO_DEVELOPER.name, 'BudgetBuddy Ltd'],
  );

  await pool.query(
    `INSERT INTO clients (developer_id, name, description, client_id, client_secret_hash, redirect_uris)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (client_id) DO UPDATE SET developer_id = EXCLUDED.developer_id, name = EXCLUDED.name,
       description = EXCLUDED.description, client_secret_hash = EXCLUDED.client_secret_hash,
       redirect_uris = EXCLUDED.redirect_uris, status = 'active', deactivated_at = NULL`,
    [
      dev.rows[0]!.id,
      DEMO_CLIENT.name,
      DEMO_CLIENT.description,
      DEMO_CLIENT.client_id,
      await bcrypt.hash(DEMO_CLIENT.client_secret, 10),
      DEMO_CLIENT.redirect_uris,
    ],
  );

  logger.info('seed complete');
  logger.info(`bank login:   any of ${customers.map((c) => c[1]).join(', ')} / ${DEMO_CUSTOMER_PASSWORD}`);
  logger.info(`demo client:  ${DEMO_CLIENT.client_id} / ${DEMO_CLIENT.client_secret}`);
}

if (isMain(import.meta.url)) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      logger.error(err, 'seed failed');
      process.exit(1);
    });
}
