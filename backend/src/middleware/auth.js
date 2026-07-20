import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/** Require a valid bearer token; attaches req.user (full document). */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Please sign in to continue');

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw ApiError.unauthorized('Your session has expired. Please sign in again');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('Account not found');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
