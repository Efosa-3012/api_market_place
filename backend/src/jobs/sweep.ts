import { config } from '../config.js';
import { pool } from '../lib/db.js';
import { logger } from '../lib/logger.js';

/**
 * Housekeeping that keeps stored state truthful without waiting for a request
 * to trigger it: consents past their expiry flip to `expired` (so dashboards
 * and Connected Apps are right), abandoned consent requests expire, and dead
 * sessions / used codes are cleared out.
 *
 * `authenticate` still checks expiry on every call, so this is about accuracy
 * of what people see, not about security.
 */
export async function sweepOnce() {
  const [expired, abandoned, sessions, codes] = await Promise.all([
    pool.query(`UPDATE consents SET status = 'expired' WHERE status = 'authorised' AND expires_at < now()`),
    pool.query(
      `UPDATE consents SET status = 'expired'
        WHERE status = 'awaiting_authorisation' AND created_at < now() - ($1 || ' minutes')::interval`,
      [String(config.CONSENT_REQUEST_TTL_MINUTES)],
    ),
    pool.query(`DELETE FROM bank_sessions WHERE expires_at < now() - interval '1 day'`),
    pool.query(`DELETE FROM authorization_codes WHERE expires_at < now() - interval '1 day'`),
  ]);
  const counts = {
    consentsExpired: expired.rowCount ?? 0,
    requestsExpired: abandoned.rowCount ?? 0,
    sessionsPurged: sessions.rowCount ?? 0,
    codesPurged: codes.rowCount ?? 0,
  };
  if (Object.values(counts).some((n) => n > 0)) logger.info(counts, 'sweep');
  return counts;
}

/** Run the sweep on an interval. Returns a stop function. */
export function startSweep(intervalMs = 5 * 60 * 1000) {
  const run = () => sweepOnce().catch((err) => logger.error({ err }, 'sweep failed'));
  void run();
  const timer = setInterval(run, intervalMs);
  timer.unref(); // never keep the process alive just for housekeeping
  return () => clearInterval(timer);
}
