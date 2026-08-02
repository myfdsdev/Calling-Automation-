import { FEATURE_KEYS } from '../config/features.js';

/**
 * The SINGLE source of truth for what features a user can access. Every feature
 * gate — frontend nav, route guards, and backend middleware — reads from here.
 *
 * Additive merge (union):
 *   - base entitlements: what the user has on their own standing. A workspace
 *     OWNER runs their own workspace and holds the full feature set; a member
 *     (editor/viewer) has no base features.
 *   - granted entitlements: the features the workspace owner assigned to this
 *     member (`assignedFeatures`).
 * If the owner grants a member a feature their base lacks, the member gets it
 * while they're inside that workspace.
 */
export function getUserEntitlements(user) {
  const role = user?.workspaceRole || 'owner';
  const base = role === 'owner' ? [...FEATURE_KEYS] : [];
  const assigned = Array.isArray(user?.assignedFeatures) ? user.assignedFeatures : [];
  const merged = new Set([...base, ...assigned].filter((k) => FEATURE_KEYS.includes(k)));
  return [...merged];
}

/** Does this user have access to a specific feature? Owners always do. */
export function hasFeature(user, key) {
  if ((user?.workspaceRole || 'owner') === 'owner') return true;
  return getUserEntitlements(user).includes(key);
}

/** View-only members (viewers) may read but not write; owners/editors may write. */
export function canWrite(user) {
  return (user?.workspaceRole || 'owner') !== 'viewer';
}
