import { ApiError } from '../utils/ApiError.js';

/**
 * Validate a request part against a Zod schema. On success replaces the parsed
 * value back onto req so downstream handlers get coerced/defaulted data.
 */
export const validate = (schema, part = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return next(ApiError.badRequest('Please check the highlighted fields', details));
  }
  req[part] = result.data;
  next();
};
