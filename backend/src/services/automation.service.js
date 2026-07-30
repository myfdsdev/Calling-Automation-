import { Automation } from '../models/Automation.js';
import { Agent } from '../models/Agent.js';
import { Lead } from '../models/Lead.js';
import { Call } from '../models/Call.js';
import { User } from '../models/User.js';
import * as vapi from './vapi.service.js';
import { analyzeCall } from './gemini.service.js';
import { isDbConnected } from '../config/db.js';
import { getBillingAccount, resolveWorkspaceKeys, resolveVapiKey } from './workspace.service.js';

/** Resolve the Gemini creds for a call's workspace (for background analysis). */
async function geminiCredsForCall(call) {
  const owner = await User.findById(call.userId);
  if (!owner) return {};
  const keys = await resolveWorkspaceKeys(owner);
  return { apiKey: keys.geminiKey, model: keys.geminiModel };
}

/**
 * In-memory sequential calling engine. One lead is called at a time per automation.
 *
 * - Demo mode (no Vapi key): the whole call lifecycle is simulated locally, so the
 *   queue progresses and produces transcripts/summaries without any provider.
 * - Live mode: the call is started via Vapi and the queue advances when the
 *   `end-of-call-report` webhook is received (see finalizeCallFromReport).
 *
 * Timers live in-process; on boot we re-attach to any `running` automations.
 */

const timers = new Map(); // automationId(string) -> Timeout

function clearTimer(id) {
  const t = timers.get(String(id));
  if (t) {
    clearTimeout(t);
    timers.delete(String(id));
  }
}

function schedule(id, ms, fn) {
  clearTimer(id);
  timers.set(
    String(id),
    setTimeout(() => {
      timers.delete(String(id));
      Promise.resolve(fn()).catch((err) =>
        console.error('[automation] runner error:', err.message),
      );
    }, ms),
  );
}

/* --------------------------- Controls --------------------------- */

export async function startAutomation(automation) {
  automation.status = 'running';
  automation.startedAt = automation.startedAt || new Date();
  await automation.save();
  schedule(automation._id, 500, () => advance(automation._id));
  return automation;
}

export async function pauseAutomation(automation) {
  clearTimer(automation._id);
  automation.status = 'paused';
  await automation.save();
  return automation;
}

export async function resumeAutomation(automation) {
  automation.status = 'running';
  await automation.save();
  schedule(automation._id, 500, () => advance(automation._id));
  return automation;
}

export async function stopAutomation(automation) {
  clearTimer(automation._id);
  automation.status = 'stopped';
  automation.completedAt = new Date();
  await automation.save();
  // Reset any leads still queued/calling back to selected.
  await Lead.updateMany(
    { automationId: automation._id, callStatus: { $in: ['in_queue', 'calling'] } },
    { $set: { callStatus: 'selected' } },
  );
  return automation;
}

/** Re-attach runners for automations that were running before a restart. */
export async function resumeRunningAutomations() {
  if (!isDbConnected()) return; // nothing to resume without a database
  try {
    const running = await Automation.find({ status: 'running' }).select('_id');
    for (const a of running) schedule(a._id, 1000, () => advance(a._id));
    if (running.length) console.log(`[automation] resumed ${running.length} running automation(s)`);
  } catch (err) {
    console.warn('[automation] could not resume automations:', err.message);
  }
}

/* --------------------------- Engine ----------------------------- */

async function advance(automationId) {
  const auto = await Automation.findById(automationId);
  if (!auto || auto.status !== 'running') return;

  if (auto.currentIndex >= auto.queue.length) {
    return finalizeAutomation(auto);
  }

  const leadId = auto.queue[auto.currentIndex];
  const [lead, agent, owner] = await Promise.all([
    Lead.findById(leadId),
    Agent.findById(auto.agentId),
    User.findById(auto.userId),
  ]);

  if (!owner) return failAutomation(auto, null, 'Account not found');

  // Skip invalid / opted-out / already-done leads.
  if (!lead || !agent || lead.doNotCall || !lead.phone || lead.callStatus === 'completed') {
    if (lead && lead.callStatus === 'in_queue') lead.callStatus = 'selected';
    await lead?.save();
    auto.currentIndex += 1;
    await auto.save();
    return schedule(auto._id, 300, () => advance(auto._id));
  }

  // Begin the call.
  lead.callStatus = 'calling';
  lead.callAttempts += 1;
  lead.lastCalledAt = new Date();
  await lead.save();

  agent.totalCalls += 1;
  await agent.save();

  const variableValues = {
    leadBusinessName: lead.businessName,
    companyName: agent.companyName,
    service: agent.serviceName,
    callObjective: agent.callGoal,
    location: [lead.city, lead.state].filter(Boolean).join(', '),
  };

  let providerCallId = '';
  let simulated = false;
  // The workspace's Vapi key (own or platform fallback) — hoisted so the live
  // reconciliation poller can reuse it after the call is placed.
  let vapiKey = '';
  try {
    vapiKey = await resolveVapiKey(owner);
    // Heals agents created before Vapi was configured.
    const assistantId = await vapi.ensureAssistant(agent, vapiKey);
    const res = await vapi.startCall({
      assistantId,
      phoneNumberId: owner.twilio?.vapiPhoneNumberId || '',
      phone: lead.phone,
      variableValues,
      metadata: { automationId: String(auto._id), leadId: String(lead._id) },
      vapiKey,
    });
    providerCallId = res.providerCallId;
    simulated = res.simulated;
  } catch (err) {
    // A configuration problem will fail identically for every remaining lead —
    // stop the whole run instead of chewing through the queue.
    if (err.fatal) return failAutomation(auto, lead, err.message);

    // Otherwise it's specific to this lead: record the failure and move on.
    console.warn('[automation] startCall failed for lead', String(lead._id), '-', err.message);
    await Call.create({
      userId: auto.userId,
      agentId: agent._id,
      leadId: lead._id,
      automationId: auto._id,
      status: 'failed',
      result: 'pending',
      failureReason: err.message,
      startedAt: new Date(),
      endedAt: new Date(),
    });
    lead.callStatus = 'failed';
    await lead.save();

    auto.completedCalls += 1;
    auto.currentIndex += 1;
    await auto.save();

    if (auto.currentIndex >= auto.queue.length) return finalizeAutomation(auto);
    return schedule(auto._id, Math.max(1000, (auto.delayBetweenCalls || 15) * 1000), () =>
      advance(auto._id),
    );
  }

  const call = await Call.create({
    userId: auto.userId,
    agentId: agent._id,
    leadId: lead._id,
    automationId: auto._id,
    providerCallId,
    status: 'ringing',
    simulated,
    startedAt: new Date(),
  });

  if (simulated) {
    // DEMO_MODE only: resolve the call locally after a short "conversation".
    const talkMs = 4000 + Math.floor(Math.random() * 6000);
    schedule(`call-${call._id}`, talkMs, () => finishSimulatedCall(call._id));
  } else {
    // Live mode: the Vapi webhook finalizes the call — but if it can't reach us,
    // this poller reconciles the outcome so the queue still advances.
    scheduleLiveCallPoll(call._id, vapiKey, 0);
  }
}

/** Halt an automation on a configuration error and put its leads back. */
async function failAutomation(auto, currentLead, message) {
  clearTimer(auto._id);
  console.error('[automation] halted:', message);

  if (currentLead) {
    currentLead.callStatus = 'selected';
    currentLead.callAttempts = Math.max(0, currentLead.callAttempts - 1);
    await currentLead.save();
  }
  await Lead.updateMany(
    { automationId: auto._id, callStatus: { $in: ['in_queue', 'calling'] } },
    { $set: { callStatus: 'selected' } },
  );

  auto.status = 'failed';
  auto.lastError = message;
  auto.completedAt = new Date();
  await auto.save();
}

/**
 * Place a single ad-hoc call for one lead (the "Call Now" action), independent of
 * any automation. Returns the created Call document.
 */
export async function startSingleCall({ user, lead, agent }) {
  lead.callStatus = 'calling';
  lead.callAttempts += 1;
  lead.lastCalledAt = new Date();
  await lead.save();

  agent.totalCalls += 1;
  await agent.save();

  const variableValues = {
    leadBusinessName: lead.businessName,
    companyName: agent.companyName,
    service: agent.serviceName,
    callObjective: agent.callGoal,
    location: [lead.city, lead.state].filter(Boolean).join(', '),
  };

  let providerCallId = '';
  let simulated = false;
  let vapiKey = '';
  try {
    vapiKey = await resolveVapiKey(user);
    // Heals agents created before Vapi was configured.
    const assistantId = await vapi.ensureAssistant(agent, vapiKey);
    const res = await vapi.startCall({
      assistantId,
      phoneNumberId: user.twilio?.vapiPhoneNumberId || '',
      phone: lead.phone,
      variableValues,
      metadata: { leadId: String(lead._id) },
      vapiKey,
    });
    providerCallId = res.providerCallId;
    simulated = res.simulated;
  } catch (err) {
    // Roll back the optimistic lead update and surface the real reason.
    lead.callStatus = 'selected';
    lead.callAttempts = Math.max(0, lead.callAttempts - 1);
    await lead.save();
    agent.totalCalls = Math.max(0, agent.totalCalls - 1);
    await agent.save();
    throw err;
  }

  const call = await Call.create({
    userId: user._id,
    agentId: agent._id,
    leadId: lead._id,
    automationId: null,
    providerCallId,
    status: 'ringing',
    simulated,
    startedAt: new Date(),
  });

  if (simulated) {
    const talkMs = 4000 + Math.floor(Math.random() * 6000);
    schedule(`call-${call._id}`, talkMs, () => finishSimulatedCall(call._id));
  } else {
    scheduleLiveCallPoll(call._id, vapiKey, 0);
  }
  return call;
}

async function finishSimulatedCall(callId) {
  const call = await Call.findById(callId);
  if (!call) return;
  const auto = call.automationId ? await Automation.findById(call.automationId) : null;
  const outcome = simulateOutcome();
  const gem = await geminiCredsForCall(call);
  const analysis = await analyzeCall(
    { transcript: outcome.transcript, endedReason: outcome.endedReason },
    gem,
  );
  await applyCallResult({
    call,
    duration: outcome.duration,
    transcript: outcome.transcript,
    recordingUrl: outcome.recordingUrl,
    endedReason: outcome.endedReason,
    analysis,
  });
  if (auto) await afterCall(auto, call);
}

/** True when a Vapi endedReason means the call never connected (config/transport error). */
export function isConnectionFailure(endedReason = '') {
  return /error|fault|failed|no-transport|get-transport/.test((endedReason || '').toLowerCase());
}

/** Turn a raw Vapi error endedReason into a short, user-facing failure reason. */
export function humanizeEndedReason(endedReason = '') {
  const r = (endedReason || '').toLowerCase();
  if (r.includes('transport'))
    return "Call couldn't connect — check your Twilio number's voice & country permissions";
  if (r.includes('twilio')) return 'Twilio rejected the call — verify the number and account status';
  if (r.includes('pipeline')) return 'The voice pipeline failed to start';
  return `Call failed to connect (${endedReason})`;
}

/**
 * Apply an analysis + provider data to a call and its lead. Shared by the
 * simulator and the live webhook path.
 */
export async function applyCallResult({
  call,
  duration,
  transcript,
  recordingUrl,
  endedReason,
  analysis,
}) {
  // A provider/transport error means the call never actually connected to the
  // customer — record it as a failure, not a misleading "completed / not interested".
  if (isConnectionFailure(endedReason)) {
    call.status = 'failed';
    call.result = 'no_answer';
    call.duration = 0;
    call.transcript = '';
    call.recordingUrl = '';
    call.summary = '';
    call.failureReason = humanizeEndedReason(endedReason);
    call.endedReason = endedReason || '';
    call.endedAt = new Date();
    await call.save();

    const lead = await Lead.findById(call.leadId);
    if (lead) {
      lead.callResult = 'no_answer';
      lead.callStatus = 'failed';
      lead.lastCalledAt = new Date();
      await lead.save();
    }
    return; // nothing connected → don't consume calling minutes
  }

  const contactStatus = ['no_answer', 'busy', 'voicemail'].includes(analysis.result)
    ? analysis.result === 'voicemail'
      ? 'completed'
      : analysis.result
    : 'completed';

  call.status = ['no_answer', 'busy'].includes(contactStatus) ? contactStatus : 'completed';
  call.result = analysis.result;
  call.duration = duration || 0;
  call.transcript = transcript || '';
  call.recordingUrl = recordingUrl || '';
  call.summary = analysis.summary || '';
  call.interestLevel = analysis.interestLevel ?? null;
  call.objections = analysis.objections || [];
  call.followUpRequested = Boolean(analysis.followUpRequested);
  call.endedReason = endedReason || '';
  call.endedAt = new Date();
  await call.save();

  const lead = await Lead.findById(call.leadId);
  if (lead) {
    lead.callResult = analysis.result;
    lead.interestLevel = analysis.interestLevel ?? null;
    lead.lastCalledAt = new Date();
    if (analysis.doNotCall) {
      lead.doNotCall = true;
      lead.callStatus = 'do_not_call';
    } else if (['no_answer', 'busy'].includes(analysis.result)) {
      lead.callStatus = 'failed';
    } else {
      lead.callStatus = 'completed';
    }
    await lead.save();
  }

  // Consume calling minutes from the workspace owner (members spend the owner's pool).
  if (duration > 0) {
    const minutes = Math.max(1, Math.ceil(duration / 60));
    const caller = await User.findById(call.userId);
    const billing = caller ? await getBillingAccount(caller) : null;
    if (billing) {
      await User.findByIdAndUpdate(billing._id, { $inc: { callingMinutes: -minutes } });
    }
  }
}

/** Advance the automation after a call ends (retry logic + counters + next call). */
async function afterCall(auto, call) {
  const fresh = await Automation.findById(auto._id);
  if (!fresh) return;

  fresh.completedCalls += 1;
  if (call.result === 'interested') fresh.interestedLeads += 1;

  // Retry only for transient outcomes, within maxRetries.
  const retryable = ['no_answer', 'busy'].includes(call.result);
  const lead = await Lead.findById(call.leadId);
  if (retryable && lead && lead.callAttempts <= fresh.maxRetries) {
    fresh.queue.push(lead._id);
    lead.callStatus = 'in_queue';
    await lead.save();
  }

  fresh.currentIndex += 1;
  await fresh.save();

  if (fresh.status !== 'running') return;
  if (fresh.currentIndex >= fresh.queue.length) return finalizeAutomation(fresh);

  const delayMs = Math.max(1000, (fresh.delayBetweenCalls || 15) * 1000);
  schedule(fresh._id, delayMs, () => advance(fresh._id));
}

async function finalizeAutomation(auto) {
  clearTimer(auto._id);
  auto.status = 'completed';
  auto.completedAt = new Date();
  await auto.save();
  console.log(`[automation] ${auto._id} completed (${auto.completedCalls} calls)`);
}

/* ----------------- Live webhook entry point --------------------- */

/**
 * Called by the Vapi webhook on end-of-call-report. Finalizes the matching call
 * and advances its automation (if any).
 */
export async function finalizeCallFromReport({ providerCallId, duration, transcript, recordingUrl, endedReason }) {
  if (!providerCallId) return null;
  // Atomically claim this call so the webhook and the polling fallback can't both
  // finalize it — that would double-count and double-advance the queue.
  const call = await Call.findOneAndUpdate(
    { providerCallId, endedAt: null },
    { $set: { endedAt: new Date() } },
    { new: true },
  );
  if (!call) return null; // unknown call, or already finalized by the other path
  clearTimer(`poll-${call._id}`); // stop any pending reconciliation poll

  const gem = await geminiCredsForCall(call);
  const analysis = await analyzeCall({ transcript, endedReason }, gem);
  await applyCallResult({ call, duration, transcript, recordingUrl, endedReason, analysis });
  if (call.automationId) {
    const auto = await Automation.findById(call.automationId);
    if (auto) await afterCall(auto, call);
  }
  return call;
}

/* -------------- Live-call reconciliation (webhook fallback) -------------- */

const LIVE_POLL_INTERVAL_MS = 12_000; // re-check the provider roughly every 12s
const LIVE_POLL_MAX_MS = 12 * 60 * 1000; // stop waiting after 12 minutes

const VAPI_STATUS = {
  queued: 'queued',
  ringing: 'ringing',
  'in-progress': 'in_progress',
  forwarding: 'in_progress',
  ended: 'completed',
};

function scheduleLiveCallPoll(callId, vapiKey, elapsed = 0) {
  schedule(`poll-${callId}`, LIVE_POLL_INTERVAL_MS, () =>
    reconcileLiveCall(String(callId), vapiKey, elapsed + LIVE_POLL_INTERVAL_MS),
  );
}

/**
 * After a call ends, its recording URL can take a few seconds to appear in Vapi.
 * Poll a handful of times to backfill it onto the finalized call.
 */
function scheduleRecordingFetch(callId, vapiKey, tries = 0) {
  schedule(`rec-${callId}`, 15_000, async () => {
    const call = await Call.findById(callId);
    if (!call || call.recordingUrl) return; // gone or already captured
    const remote = await vapi.getCall(call.providerCallId, vapiKey);
    const url = vapi.pickRecordingUrl(remote?.artifact, remote || {});
    if (url) {
      call.recordingUrl = url;
      await call.save();
    } else if (tries < 5) {
      scheduleRecordingFetch(callId, vapiKey, tries + 1);
    }
  });
}

/**
 * Poll Vapi for a live call's outcome and finalize it when the provider reports
 * the call ended. This is the fallback that lets calls complete even when the
 * end-of-call webhook can't reach us (no public VAPI_SERVER_URL, or a missed
 * delivery). Finalization goes through the same claim-guarded path as the webhook.
 */
async function reconcileLiveCall(callId, vapiKey, elapsed) {
  const call = await Call.findById(callId);
  if (!call || call.endedAt) return; // gone or already finalized (webhook won the race)

  const remote = await vapi.getCall(call.providerCallId, vapiKey);

  if (remote?.status === 'ended') {
    const startedMs = remote.startedAt ? Date.parse(remote.startedAt) : 0;
    const endedMs = remote.endedAt ? Date.parse(remote.endedAt) : 0;
    const duration = startedMs && endedMs ? Math.max(0, Math.round((endedMs - startedMs) / 1000)) : 0;
    const recordingUrl = vapi.pickRecordingUrl(remote.artifact, remote);
    await finalizeCallFromReport({
      providerCallId: call.providerCallId,
      duration,
      transcript: remote.artifact?.transcript || remote.transcript || '',
      recordingUrl,
      endedReason: remote.endedReason || '',
    });
    // The recording can lag a few seconds behind the call ending — chase it.
    if (!recordingUrl) scheduleRecordingFetch(call._id, vapiKey);
    return;
  }

  // Keep the interim status fresh for the live UI while we wait.
  const mapped = remote?.status ? VAPI_STATUS[remote.status] : null;
  if (mapped && mapped !== 'completed' && mapped !== call.status) {
    call.status = mapped;
    await call.save();
  }

  if (elapsed >= LIVE_POLL_MAX_MS) {
    // Never reported ending — don't wedge the automation forever.
    console.warn('[automation] live call', callId, 'timed out without an end-of-call report');
    call.status = 'failed';
    call.failureReason = 'No end-of-call report received from the calling provider';
    call.endedAt = new Date();
    await call.save();
    const lead = await Lead.findById(call.leadId);
    if (lead && lead.callStatus === 'calling') {
      lead.callStatus = 'failed';
      await lead.save();
    }
    if (call.automationId) {
      const auto = await Automation.findById(call.automationId);
      if (auto) await afterCall(auto, call);
    }
    return;
  }

  scheduleLiveCallPoll(callId, vapiKey, elapsed);
}

/**
 * Re-attach reconciliation pollers for live calls that were in flight when the
 * server last stopped (their in-memory timers were lost on restart).
 */
export async function resumePendingCalls() {
  if (!isDbConnected()) return;
  try {
    const pending = await Call.find({
      simulated: false,
      endedAt: null,
      status: { $in: ['queued', 'ringing', 'in_progress'] },
      providerCallId: { $nin: ['', null] },
    }).select('_id userId providerCallId');

    for (const call of pending) {
      const owner = await User.findById(call.userId);
      if (!owner) continue;
      const vapiKey = await resolveVapiKey(owner);
      scheduleLiveCallPoll(call._id, vapiKey, 0);
    }
    if (pending.length) console.log(`[automation] resumed ${pending.length} pending call poll(s)`);
  } catch (err) {
    console.warn('[automation] could not resume pending calls:', err.message);
  }
}

/* --------------------- Simulation helpers ----------------------- */

function simulateOutcome() {
  const roll = Math.random();
  let endedReason;
  let transcript;
  if (roll < 0.18) {
    endedReason = 'customer-did-not-answer';
    transcript = '';
    return { endedReason, transcript, duration: 0, recordingUrl: '' };
  }
  if (roll < 0.26) {
    endedReason = 'customer-busy';
    return { endedReason, transcript: '', duration: 0, recordingUrl: '' };
  }
  if (roll < 0.34) {
    endedReason = 'voicemail';
    transcript = 'Agent: Hi, this is a quick call about our service. Please call us back.';
    return { endedReason, transcript, duration: 22, recordingUrl: demoRecording() };
  }

  const duration = 45 + Math.floor(Math.random() * 210);
  const recordingUrl = demoRecording();
  const scenario = Math.random();
  if (scenario < 0.35) {
    transcript = `Agent: Hi, do you have a quick moment?
Lead: Sure, what's this about?
Agent: We help local businesses get more customers. Are you currently looking for more customers?
Lead: Yes, actually we are. Tell me more.
Agent: Great — would you be open to a short consultation this week?
Lead: That sounds good, yes I'm interested. Book me in.`;
    return { endedReason: 'assistant-ended-call', transcript, duration, recordingUrl };
  }
  if (scenario < 0.55) {
    transcript = `Agent: Hi, do you have a quick moment?
Lead: A little. What is it?
Agent: We offer a service that could help you get more customers.
Lead: Can you email me the info and follow up next week?
Agent: Absolutely, I'll follow up. Thanks!`;
    return { endedReason: 'assistant-ended-call', transcript, duration, recordingUrl };
  }
  transcript = `Agent: Hi, do you have a quick moment?
Lead: Not really, and honestly we're not interested. No thanks.
Agent: Understood, thank you for your time. Have a great day.`;
  return { endedReason: 'customer-ended-call', transcript, duration, recordingUrl };
}

function demoRecording() {
  // A tiny, publicly hosted sample so the "Play recording" control works in demo mode.
  return 'https://cdn.jsdelivr.net/gh/anars/blank-audio/2-seconds-of-silence.mp3';
}
