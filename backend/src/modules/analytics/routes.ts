import { Router } from 'express';

/** Analytics dashboard data, derived from the api_calls and consents tables. */
export const analyticsRouter = Router();

analyticsRouter.get('/', (_req, res) => {
  res.json({ status: 'not_implemented' });
});
