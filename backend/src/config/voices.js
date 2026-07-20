/**
 * Voice ids accepted by Vapi's built-in `vapi` voice provider.
 * Sending anything outside this list makes assistant creation fail with a 400,
 * so we validate against it before hitting the API.
 */
export const VAPI_VOICES = [
  'Elliot', 'Kai', 'Nico', 'Cole', 'Harry', 'Spencer', 'Leo', 'Dan', 'Zac',
  'Sid', 'Neil', 'Godfrey', 'Gustavo', 'Rohan', 'Sagar',
  'Emma', 'Clara', 'Savannah', 'Layla', 'Kylie', 'Lily', 'Hana', 'Neha',
  'Paige', 'Naina', 'Leah', 'Tara', 'Jess', 'Mia', 'Zoe',
];

export const DEFAULT_VOICE = 'Elliot';

export const isValidVoice = (id) => VAPI_VOICES.includes(id);
