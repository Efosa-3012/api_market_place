import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/**
 * Every request gets a correlation id. Callers may supply their own via
 * X-Correlation-Id (useful for partners debugging against our support desk);
 * otherwise we mint one. It is echoed on the response and stamped on every
 * log line and audit row for that request.
 */
export const correlationId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-correlation-id');
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
};
