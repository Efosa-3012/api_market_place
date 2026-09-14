import { Router } from 'express';

/** Developer portal backend: signup, login, app registration, credentials. */
export const portalRouter = Router();

portalRouter.get('/', (_req, res) => {
  res.json({ status: 'not_implemented' });
});
