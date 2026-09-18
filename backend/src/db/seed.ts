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

/**
 * Other partners on the platform, so the register and the ecosystem tile show
 * a marketplace people have joined rather than a single tenant. Fictional
 * companies; each can log in with `password123`. Joined dates are staggered so
 * the register reads like it grew over the summer. No traffic or consents are
 * seeded for them — every figure on the dashboards stays a real gateway row.
 */
export const DEMO_PARTNERS = [
  {
    email: 'ade@tallyfinance.example',
    name: 'Adebayo Ogunlesi',
    company: 'Tally Finance',
    joinedDaysAgo: 92,
    apps: [
      { client_id: 'tallybooks', name: 'TallyBooks', description: 'Bookkeeping for small businesses, reconciled against bank transactions.', website_url: 'https://tallyfinance.example' },
    ],
  },
  {
    email: 'ngozi@sprout.example',
    name: 'Ngozi Adeyemi',
    company: 'Sprout Savings',
    joinedDaysAgo: 61,
    apps: [
      { client_id: 'sprout', name: 'Sprout', description: 'Round-up savings: spare change from every transaction goes into a goal.', website_url: 'https://sprout.example' },
    ],
  },
  {
    email: 'tunde@lendly.example',
    name: 'Tunde Bakare',
    company: 'Lendly',
    joinedDaysAgo: 34,
    apps: [
      { client_id: 'lendly-score', name: 'Lendly Score', description: 'Affordability checks from real income and spending, with the customer’s consent.', website_url: 'https://lendly.example' },
      { client_id: 'lendly-merchant', name: 'Lendly Merchant (legacy)', description: 'Retired pilot integration.', website_url: 'https://lendly.example', deactivated: true },
    ],
  },
  {
    email: 'chiamaka@nairaledger.example',
    name: 'Chiamaka Eze',
    company: 'NairaLedger',
    joinedDaysAgo: 6,
    apps: [
      { client_id: 'nairaledger', name: 'NairaLedger', description: 'Multi-bank balance and cash-flow view for freelancers.', website_url: 'https://nairaledger.example' },
    ],
  },
] as const;

export const DEMO_PARTNER_PASSWORD = 'password123';

/** Every client_id the seed owns; reset keeps these and removes the rest. */
export const SEEDED_CLIENT_IDS = [DEMO_CLIENT.client_id, ...DEMO_PARTNERS.flatMap((p) => p.apps.map((a) => a.client_id))];
/** Every developer email the seed owns. */
export const SEEDED_DEVELOPER_EMAILS = [DEMO_DEVELOPER.email, DEMO_ADMIN.email, ...DEMO_PARTNERS.map((p) => p.email)];

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

  // The other partners. One bcrypt hash shared across them keeps the seed quick.
  const partnerHash = await bcrypt.hash(DEMO_PARTNER_PASSWORD, 10);
  for (const partner of DEMO_PARTNERS) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO developers (email, password_hash, name, company, created_at)
       VALUES ($1, $2, $3, $4, now() - ($5 || ' days')::interval)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, company = EXCLUDED.company
       RETURNING id`,
      [partner.email, partnerHash, partner.name, partner.company, String(partner.joinedDaysAgo)],
    );
    const developerId = rows[0]!.id;
    for (const app of partner.apps) {
      const deactivated = 'deactivated' in app && app.deactivated;
      await pool.query(
        `INSERT INTO clients (developer_id, name, description, client_id, client_secret_hash, redirect_uris,
                              website_url, status, created_at, deactivated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::client_status, now() - ($9 || ' days')::interval,
                 CASE WHEN $8::text = 'deactivated' THEN now() - interval '12 days' END)
         ON CONFLICT (client_id) DO UPDATE SET developer_id = EXCLUDED.developer_id, name = EXCLUDED.name,
           description = EXCLUDED.description, website_url = EXCLUDED.website_url,
           status = EXCLUDED.status, deactivated_at = EXCLUDED.deactivated_at`,
        [
          developerId,
          app.name,
          app.description,
          app.client_id,
          partnerHash, // secret is never shown; partners re-issue one from the portal if they need it
          [`https://${app.client_id}.example/callback`],
          app.website_url,
          deactivated ? 'deactivated' : 'active',
          String(Math.max(partner.joinedDaysAgo - 1, 0)),
        ],
      );
    }
  }

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
