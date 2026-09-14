import { Router } from 'express';

/**
 * Analytics dashboard data — OWNER: backend dev 2 (after portal).
 *
 * Everything comes from the api_calls table written by middleware/auditLog.ts
 * plus the consents table. Planned endpoints:
 *   GET /analytics/summary                  totals: calls (24h), error rate, active consents, revocations, p95 latency
 *   GET /analytics/calls-per-client         [{ client_id, name, calls, errors }]
 *   GET /analytics/timeseries?window=24h    calls per 5-minute bucket for a line chart
 *   GET /analytics/recent-calls?limit=50    live audit feed for the demo
 *   GET /analytics/consents                 counts by status
 *
 * Protect with a simple bank-admin token (e.g. header X-Admin-Key = env ADMIN_KEY) for the MVP.
 */
export const analyticsRouter = Router();

analyticsRouter.get('/', (_req, res) => {
  res.json({ status: 'not_implemented', message: 'Analytics endpoints coming soon' });
});
