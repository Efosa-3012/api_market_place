/**
 * Put the demo database back to a clean, known state.
 *
 *   npm run reset
 *
 * Every run of `demo-flow.sh` registers a fresh partner app and leaves behind
 * consents and audit rows, so after a few rehearsals the dashboards fill with
 * half a dozen identical "Demo Partner App" entries. That is accurate — they
 * really were registered — but it reads as clutter in a presentation.
 *
 * This clears the audit trail and the throwaway apps, then re-seeds, leaving
 * only the fixtures the demo actually needs.
 *
 * Refuses to touch anything but a local development database.
 */
import { config } from '../config.js';
import { pool } from '../lib/db.js';
import { isMain } from '../lib/isMain.js';
import { logger } from '../lib/logger.js';
import { SEEDED_CLIENT_IDS, SEEDED_DEVELOPER_EMAILS, seed } from './seed.js';

/** Hosts we accept. A demo reset must never reach a deployed database. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'host.docker.internal']);

export async function reset() {
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to reset: NODE_ENV is production');
  }
  const host = new URL(config.DATABASE_URL).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to reset a database on "${host}" — local development only`);
  }

  // Audit rows and consents reference clients, so they go first.
  await pool.query('TRUNCATE api_calls RESTART IDENTITY');
  await pool.query('TRUNCATE authorization_codes, consents RESTART IDENTITY CASCADE');
  await pool.query('TRUNCATE bank_sessions RESTART IDENTITY CASCADE');

  // Keep everything the seed owns; drop what demo-flow.sh and rehearsals created along the way.
  const { rowCount: apps } = await pool.query(`DELETE FROM clients WHERE client_id <> ALL($1::text[])`, [SEEDED_CLIENT_IDS]);
  const { rowCount: developers } = await pool.query(
    `DELETE FROM developers d
      WHERE d.role <> 'admin'
        AND d.email <> ALL($1::text[])
        AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.developer_id = d.id)`,
    [SEEDED_DEVELOPER_EMAILS],
  );

  logger.info({ apps: apps ?? 0, developers: developers ?? 0 }, 'cleared demo debris');
  await seed();
  logger.info('reset complete — dashboards now show only the seeded fixtures');
}

if (isMain(import.meta.url)) {
  reset()
    .then(() => pool.end())
    .catch((err) => {
      logger.error(err, 'reset failed');
      process.exit(1);
    });
}
