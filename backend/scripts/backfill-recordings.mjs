/**
 * Backfill recording URLs onto already-completed calls that don't have one yet
 * (e.g. calls finalized before the recording-URL extraction was fixed). For each
 * such call it re-fetches the call from Vapi and stores whatever recording URL
 * the provider now exposes.
 *
 * Safe: only touches calls that have NO recordingUrl; never deletes anything and
 * can be re-run. Uses the workspace's own Vapi key, falling back to the platform
 * VAPI_PRIVATE_KEY (older calls may live in that account).
 *
 *   Run from the backend/ folder:
 *     node scripts/backfill-recordings.mjs
 */
import 'dotenv/config';

const mongoose = (await import('mongoose')).default;

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Run this from the backend/ folder with a real .env.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to DB:', mongoose.connection.name, '\n');

const { Call } = await import('../src/models/Call.js');
const { User } = await import('../src/models/User.js');
const vapi = await import('../src/services/vapi.service.js');
const { resolveVapiKey } = await import('../src/services/workspace.service.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isReal = (id) => id && !/^(demo|local)-/.test(id);

// Candidates: real, completed calls that connected but have no recording stored.
const calls = await Call.find({
  simulated: { $ne: true },
  status: 'completed',
  recordingUrl: '',
  providerCallId: { $nin: ['', null] },
}).select('_id userId providerCallId duration');

console.log(`Found ${calls.length} completed call(s) with no recording URL.\n`);

const platformKey = process.env.VAPI_PRIVATE_KEY || '';
let checked = 0;
let filled = 0;
let noRecording = 0;
let noKey = 0;

for (const call of calls) {
  if (!isReal(call.providerCallId)) continue;

  const owner = await User.findById(call.userId);
  const wsKey = owner ? await resolveVapiKey(owner) : '';
  const keys = [...new Set([wsKey, platformKey].filter(Boolean))];
  if (!keys.length) {
    noKey += 1;
    continue;
  }

  checked += 1;
  let url = '';
  for (const key of keys) {
    const remote = await vapi.getCall(call.providerCallId, key);
    url = vapi.pickRecordingUrl(remote?.artifact, remote || {});
    if (url) break;
  }

  if (url) {
    call.recordingUrl = url;
    await call.save();
    filled += 1;
    console.log(`  ✓ ${String(call.providerCallId).slice(0, 14)} — recording found & saved`);
  } else {
    noRecording += 1;
  }

  await sleep(300); // be gentle on the Vapi API
}

console.log(
  `\nDone. checked=${checked}, recordings filled=${filled}, none-available=${noRecording}, no-key=${noKey}`,
);
await mongoose.disconnect();
process.exit(0);
