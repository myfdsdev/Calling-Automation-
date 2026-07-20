// Voice ids accepted by Vapi's built-in voice provider.
// Must stay in sync with backend/src/config/voices.js — anything else is
// rejected by the provider when the agent is synced.
export const VOICES = [
  'Elliot', 'Kai', 'Nico', 'Cole', 'Harry', 'Spencer', 'Leo', 'Dan', 'Zac',
  'Sid', 'Neil', 'Godfrey', 'Gustavo', 'Rohan', 'Sagar',
  'Emma', 'Clara', 'Savannah', 'Layla', 'Kylie', 'Lily', 'Hana', 'Neha',
  'Paige', 'Naina', 'Leah', 'Tara', 'Jess', 'Mia', 'Zoe',
].map((id) => ({ id, label: id }));

export const DEFAULT_VOICE = 'Elliot';

export const LANGUAGES = [
  { id: 'en-US', label: 'English (US)' },
  { id: 'en-GB', label: 'English (UK)' },
  { id: 'en-AU', label: 'English (AU)' },
  { id: 'es-ES', label: 'Spanish' },
  { id: 'fr-FR', label: 'French' },
];

// Lead / call status → badge variant mapping.
export const CALL_STATUS_META = {
  new: { label: 'New', variant: 'neutral' },
  selected: { label: 'Selected', variant: 'info' },
  in_queue: { label: 'In Queue', variant: 'warning' },
  calling: { label: 'Calling', variant: 'primary' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  do_not_call: { label: 'Do Not Call', variant: 'destructive' },
};

export const CALL_RESULT_META = {
  pending: { label: 'Pending', variant: 'neutral' },
  interested: { label: 'Interested', variant: 'success' },
  not_interested: { label: 'Not Interested', variant: 'destructive' },
  follow_up: { label: 'Follow-up', variant: 'info' },
  no_answer: { label: 'No Answer', variant: 'warning' },
  busy: { label: 'Busy', variant: 'warning' },
  wrong_number: { label: 'Wrong Number', variant: 'neutral' },
  voicemail: { label: 'Voicemail', variant: 'info' },
};

export const AUTOMATION_STATUS_META = {
  draft: { label: 'Draft', variant: 'neutral' },
  running: { label: 'Running', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  completed: { label: 'Completed', variant: 'info' },
  stopped: { label: 'Stopped', variant: 'destructive' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export const AGENT_STATUS_META = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'neutral' },
};

export const LEAD_STATUS_OPTIONS = Object.entries(CALL_STATUS_META).map(([value, m]) => ({
  value,
  label: m.label,
}));

export const CALL_RESULT_OPTIONS = Object.entries(CALL_RESULT_META).map(([value, m]) => ({
  value,
  label: m.label,
}));
