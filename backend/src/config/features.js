/**
 * The app's feature registry — the SINGLE source of truth for grantable features.
 *
 * A workspace owner grants a subset of these to each invited user, and the invite
 * dialog builds its checkboxes from `visibleFeatures()` (never a hardcoded list).
 * Mark a feature `hidden: true` to retire it without deleting the key: existing
 * grants keep working, but it stops being offered in new invites.
 */
export const FEATURES = [
  {
    key: 'lead_finder',
    label: 'Lead Finder',
    description: 'Search local businesses to discover new leads.',
    hidden: false,
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'View, score and manage saved leads.',
    hidden: false,
  },
  {
    key: 'agents',
    label: 'AI Agents',
    description: 'Create and manage AI calling agents.',
    hidden: false,
  },
  {
    key: 'calls',
    label: 'Calls',
    description: 'Place calls and review transcripts & recordings.',
    hidden: false,
  },
  {
    key: 'automations',
    label: 'Automations',
    description: 'Run hands-free calling campaigns.',
    hidden: false,
  },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

/** Features offered in the invite dialog — real and not hidden/disabled. */
export const visibleFeatures = () =>
  FEATURES.filter((f) => !f.hidden).map(({ key, label, description }) => ({
    key,
    label,
    description,
  }));

export const isFeatureKey = (key) => FEATURE_KEYS.includes(key);

/** Human labels for a set of feature keys (for emails / UI), preserving order. */
export const featureLabels = (keys = []) =>
  FEATURES.filter((f) => keys.includes(f.key)).map((f) => f.label);

/**
 * Keep only real, currently-visible feature keys — defends every write path
 * against stale, hidden, unknown, or duplicated keys coming from a client.
 */
export const sanitizeFeatures = (keys = []) => {
  const allowed = new Set(visibleFeatures().map((f) => f.key));
  return [...new Set((Array.isArray(keys) ? keys : []).filter((k) => allowed.has(k)))];
};
