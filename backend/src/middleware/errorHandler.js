import { ApiError } from '../utils/ApiError.js';
import { isDbConnected } from '../config/db.js';

export function notFound(_req, _res, next) {
  next(ApiError.notFound('Route not found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let error = err;

  // Mongoose / Mongo specific mapping to user-safe messages.
  if (err?.name === 'ValidationError') {
    error = ApiError.badRequest('Please check the highlighted fields');
  } else if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || { value: 1 })[0];
    error = ApiError.conflict(
      field === 'email' ? 'An account with this email already exists' : 'Duplicate value',
    );
  } else if (err?.name === 'CastError') {
    error = ApiError.badRequest('Invalid identifier');
  } else if (err?.name === 'MongooseError' || err?.name === 'MongoServerSelectionError') {
    error = ApiError.serviceUnavailable('Database is temporarily unavailable');
  }

  if (!(error instanceof ApiError)) {
    if (!isDbConnected() && /buffering timed out|Client must be connected/i.test(err?.message || '')) {
      error = ApiError.serviceUnavailable('Database is temporarily unavailable');
    } else {
      console.error('[error]', err);
      error = new ApiError(500, 'Something went wrong on our side');
    }
  }

  // Log the full error server-side; never ship stack traces to clients. They leak
  // filesystem paths and dependency internals, and NODE_ENV is easy to forget in
  // a deploy — so this must not depend on it.
  if ((error.statusCode || 500) >= 500) {
    console.error('[error]', err?.stack || err);
  }

  const body = { error: { message: error.message } };
  if (error.details) body.error.details = error.details;

  res.status(error.statusCode || 500).json(body);
}
