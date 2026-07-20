import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Authenticated encryption for third-party credentials we must store (Twilio
 * auth tokens). AES-256-GCM so tampering is detectable, not just unreadable.
 *
 * Format: v1:<iv>:<authTag>:<ciphertext>  (all base64url)
 */

const ALGO = 'aes-256-gcm';
const SALT = 'leadcall.credentials.v1';

let cachedKey = null;

function key() {
  if (cachedKey) return cachedKey;
  const secret = env.credentialsSecret;
  if (!secret || secret.length < 16) {
    throw new Error(
      'CREDENTIALS_SECRET is missing or too short. Set a long random value before storing credentials.',
    );
  }
  cachedKey = crypto.scryptSync(secret, SALT, 32);
  return cachedKey;
}

export function encryptSecret(plain) {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    enc.toString('base64url'),
  ].join(':');
}

export function decryptSecret(payload) {
  if (!payload) return '';
  const [version, iv, tag, data] = String(payload).split(':');
  if (version !== 'v1' || !iv || !tag || !data) {
    throw new Error('Stored credential is malformed');
  }
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** Show only the last 4 characters of a secret/number. */
export function mask(value, keep = 4) {
  const s = String(value || '');
  if (!s) return '';
  if (s.length <= keep) return s;
  return `${'•'.repeat(Math.min(12, s.length - keep))}${s.slice(-keep)}`;
}

export const credentialsEncryptionReady = () => {
  try {
    key();
    return true;
  } catch {
    return false;
  }
};
