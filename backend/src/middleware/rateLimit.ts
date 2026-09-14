import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { config } from '../config.js';

/**
 * Per-client rate limit on partner API calls. Keyed by client_id once the
 * token has been validated, falling back to IP for unauthenticated requests.
 * In production this is a gateway product (Kong/Apigee) with per-plan quotas.
 */
export const partnerRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.token.client_id ?? ipKeyGenerator(req.ip ?? ''),
  handler: (req, res) => {
    req.errorCode = 'rate_limited';
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: `Rate limit exceeded: ${config.RATE_LIMIT_MAX} requests per ${config.RATE_LIMIT_WINDOW_MS / 1000}s`,
        correlation_id: req.correlationId,
      },
    });
  },
});
