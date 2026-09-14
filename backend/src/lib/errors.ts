/**
 * Every error the platform returns to a caller goes through ApiError so the
 * shape is consistent and internal details never leak:
 *
 *   { "error": { "code": "consent_revoked", "message": "...", "correlation_id": "..." } }
 *
 * The OAuth token endpoint is the one exception — RFC 6749 mandates
 * { "error": "...", "error_description": "..." } and partner SDKs expect it.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(code = 'unauthorized', message = 'Authentication required') {
    return new ApiError(401, code, message);
  }
  static forbidden(code = 'forbidden', message = 'You do not have access to this resource') {
    return new ApiError(403, code, message);
  }
  static notFound(code = 'not_found', message = 'Resource not found') {
    return new ApiError(404, code, message);
  }
  static conflict(code: string, message: string) {
    return new ApiError(409, code, message);
  }
  static upstream(message = 'Core banking service is unavailable') {
    return new ApiError(502, 'upstream_unavailable', message);
  }
}

/** RFC 6749 §5.2 error for /oauth/token */
export class OAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: string,
    public readonly description: string,
  ) {
    super(description);
    this.name = 'OAuthError';
  }
}
