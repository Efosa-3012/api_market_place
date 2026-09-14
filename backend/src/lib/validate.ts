import type { ZodType } from 'zod';
import { ApiError } from './errors.js';

/** Parse `input` with `schema`, converting Zod issues into a 400 validation_error. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ApiError.badRequest(
      'validation_error',
      'Request validation failed',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}
