/**
 * Lightweight phone helpers. We keep this dependency-free: normalise to E.164-ish
 * and do a basic sanity validation. Not a full libphonenumber, deliberately.
 */

export function normalizePhone(raw, defaultCountryCode = '1') {
  if (!raw) return '';
  let s = String(raw).trim();
  const hasPlus = s.startsWith('+');
  s = s.replace(/[^\d]/g, '');
  if (!s) return '';
  if (hasPlus) return `+${s}`;
  // Heuristic: 10 digits => assume default country code.
  if (s.length === 10) return `+${defaultCountryCode}${s}`;
  return `+${s}`;
}

export function isValidPhone(raw) {
  const p = normalizePhone(raw);
  // E.164: + followed by 8–15 digits.
  return /^\+\d{8,15}$/.test(p);
}
