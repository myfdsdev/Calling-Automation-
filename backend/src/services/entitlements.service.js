import { FEATURE_KEYS } from '../config/features.js';

/**
 * The SINGLE source of truth for what features a user can access. Every feature
 * gate — frontend nav, route guards, and backend middleware — reads from here.
 *
 * Invite-only model:
 *   - ADMIN owner (registered via /register-admin): full feature set.
 *   - non-admin owner (a plain self-signup): NO features — they have no app
 *     access until an admin invites them.
 *   - invited member (editor/viewer): exactly the features the admin granted
 *     (`assignedFeatures`).
 */
export function getUserEntitlements(user) {
  const role = user?.workspaceRole || 'owner';
  if (role === 'owner') {
    return user?.isAdmin ? [...FEATURE_KEYS] : [];
  }
  const assigned = Array.isArray(user?.assignedFeatures) ? user.assignedFeatures : [];
  return FEATURE_KEYS.filter((k) => assigned.includes(k));
}

/** Does this user have access to a specific feature? */
export function hasFeature(user, key) {
  return getUserEntitlements(user).includes(key);
}

/**
 * Whether the user may use the app at all. Admins and invited members can;
 * a plain self-signup (non-admin owner) is denied until invited.
 */
export function hasAppAccess(user) {
  const role = user?.workspaceRole || 'owner';
  if (role !== 'owner') return true; // invited member
  return Boolean(user?.isAdmin); // owners must be admins
}

/** View-only members (viewers) may read but not write; owners/editors may write. */
export function canWrite(user) {
  return (user?.workspaceRole || 'owner') !== 'viewer';
}
