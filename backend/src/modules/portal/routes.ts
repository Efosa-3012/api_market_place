import { Router } from 'express';

/**
 * Developer portal backend — OWNER: backend dev 2.
 *
 * Planned endpoints (see openapi/openapi.yaml for shapes):
 *   POST /portal/signup                     create developer  -> { developer, portal_token }
 *   POST /portal/login                      -> { developer, portal_token }
 *   GET  /portal/apps                       list the developer's clients
 *   POST /portal/apps                       register an app { name, description, redirect_uris }
 *                                           -> returns client_id + client_secret (secret shown ONCE)
 *   POST /portal/apps/:id/rotate-secret     new secret, old one stops working
 *   POST /portal/apps/:id/deactivate        blast-radius switch: call consentService.revokeAllForClient(id)
 *
 * Notes:
 *   - Hash secrets with bcryptjs (see bank/routes.ts for the pattern); never store plaintext.
 *   - client_id: something readable like `cl_` + 16 random base64url chars.
 *   - Portal auth: simplest is a JWT with { developer_id } signed with JWT_SECRET, or reuse
 *     the bank_sessions pattern with a developer_sessions table.
 */
export const portalRouter = Router();

portalRouter.get('/', (_req, res) => {
  res.json({ status: 'not_implemented', message: 'Developer portal endpoints coming soon' });
});
