import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError, OAuthError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const notFound: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound('route_not_found', `No route for ${req.method} ${req.path}`));
};

/**
 * Single exit point for errors. Known errors are rendered with their code;
 * anything else becomes a generic 500 so internal details never leak.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof OAuthError) {
    req.errorCode = err.error;
    res.status(err.status).json({ error: err.error, error_description: err.description });
    return;
  }

  if (err instanceof ApiError) {
    req.errorCode = err.code;
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
        correlation_id: req.correlationId,
      },
    });
    return;
  }

  // Body-parser JSON syntax errors arrive as a SyntaxError with status 400.
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    req.errorCode = 'invalid_json';
    res.status(400).json({
      error: { code: 'invalid_json', message: 'Request body is not valid JSON', correlation_id: req.correlationId },
    });
    return;
  }

  logger.error({ err, correlationId: req.correlationId }, 'unhandled error');
  req.errorCode = 'internal_error';
  res.status(500).json({
    error: { code: 'internal_error', message: 'An unexpected error occurred', correlation_id: req.correlationId },
  });
};
