export const VOICES = [
  { id: 'jennifer', label: 'Jennifer (Female, US)' },
  { id: 'mark', label: 'Mark (Male, US)' },
  { id: 'sarah', label: 'Sarah (Female, UK)' },
  { id: 'ryan', label: 'Ryan (Male, US)' },
  { id: 'paula', label: 'Paula (Female, AU)' },
];

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
