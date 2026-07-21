import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

let cachedKeys = [];
let cachedUntil = 0;

function cacheTtl(headers) {
  const match = /max-age=(\d+)/i.exec(headers?.['cache-control'] || '');
  const seconds = match ? Number.parseInt(match[1], 10) : 3600;
  return Number.isFinite(seconds) ? seconds * 1000 : 3600 * 1000;
}

async function loadGoogleKeys(force = false) {
  if (!force && cachedKeys.length && Date.now() < cachedUntil) return cachedKeys;

  try {
    const { data, headers } = await axios.get(GOOGLE_JWKS_URL, { timeout: 5000 });
    cachedKeys = Array.isArray(data?.keys) ? data.keys : [];
    cachedUntil = Date.now() + cacheTtl(headers);
    return cachedKeys;
  } catch {
    throw ApiError.serviceUnavailable('Could not verify Google sign-in right now');
  }
}

function jwkToPem(jwk) {
  return crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({
    type: 'spki',
    format: 'pem',
  });
}

async function getSigningKey(kid) {
  let keys = await loadGoogleKeys();
  let key = keys.find((k) => k.kid === kid);

  if (!key) {
    keys = await loadGoogleKeys(true);
    key = keys.find((k) => k.kid === kid);
  }

  if (!key) throw ApiError.unauthorized('Invalid Google sign-in token');
  return jwkToPem(key);
}

export async function verifyGoogleIdToken(idToken) {
  if (!env.google.clientId) {
    throw ApiError.serviceUnavailable('Google sign-in is not configured');
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid || decoded.header.alg !== 'RS256') {
    throw ApiError.unauthorized('Invalid Google sign-in token');
  }

  try {
    const signingKey = await getSigningKey(decoded.header.kid);
    const payload = jwt.verify(idToken, signingKey, {
      algorithms: ['RS256'],
      audience: env.google.clientId,
      issuer: GOOGLE_ISSUERS,
    });

    if (!payload.email || !payload.email_verified) {
      throw ApiError.unauthorized('Google account email must be verified');
    }

    return {
      googleId: payload.sub,
      email: String(payload.email).toLowerCase(),
      name: payload.name || String(payload.email).split('@')[0],
      picture: payload.picture || '',
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Invalid Google sign-in token');
  }
}
