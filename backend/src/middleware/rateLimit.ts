import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { config } from '../config.js';
import { ApiError } from '../lib/errors.js';

/**
 * Per-client quota on the partner APIs.
 *
 * Keyed on the client_id from the access token, never on IP: several partners
 * behind one NAT must not throttle each other, and a partner must not be able
 * to dodge its quota by spreading calls across hosts. The IP fallback only
 * applies to requests that never reached a valid token.
 *
 * Mount AFTER `authenticate` so req.auth is populated.
 *
 * Gateway concerns are Express middleware for the MVP; in production this is
 * Kong or Apigee with per-plan quotas shared across instances. The in-process
 * counter here resets on restart and is per instance.
 */
export const partnerRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7', // RateLimit: limit=..., remaining=..., reset=...
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.token.client_id ?? ipKeyGenerator(req.ip ?? ''),
  // Route through ApiError so the 429 comes out in the standard envelope and
  // the error handler stamps req.errorCode for the audit log.
  handler: (_req, _res, next) =>
    next(
      ApiError.tooManyRequests(
        `Rate limit of ${config.RATE_LIMIT_MAX} requests per ${Math.round(
          config.RATE_LIMIT_WINDOW_MS / 1000,
        )}s exceeded for this client`,
      ),
    ),
});
