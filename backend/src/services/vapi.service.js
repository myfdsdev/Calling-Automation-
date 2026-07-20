import axios from 'axios';
import { env, features } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidVoice, DEFAULT_VOICE } from '../config/voices.js';

const VAPI_BASE = 'https://api.vapi.ai';

function client() {
  return axios.create({
    baseURL: VAPI_BASE,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${env.vapi.privateKey}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Mark an error as fatal to a whole automation (a configuration problem that
 * will fail identically for every remaining lead), as opposed to a per-lead issue.
 */
function fatal(err) {
  err.fatal = true;
  return err;
}

/** Pull a readable message out of a Vapi error response. */
function vapiError(err, fallback) {
  const data = err.response?.data;
  const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
  return msg || err.message || fallback;
}

/* ------------------------------------------------------------------ */
/* Assistants                                                          */
/* ------------------------------------------------------------------ */

export function buildSystemPrompt(agent) {
  const q = (agent.qualificationQuestions || []).map((x, i) => `${i + 1}. ${x}`).join('\n');
  return `You are ${agent.name}, a polite, professional AI phone agent for ${
    agent.companyName || 'the company'
  }.
Service: ${agent.serviceName || 'N/A'}
Goal of the call: ${agent.callGoal || 'qualify the lead and book a short consultation'}
Target customer: ${agent.targetCustomer || 'local business owners'}
Company intro: ${agent.introduction || ''}
Offer: ${agent.offerDescription || ''}

Opening: ${agent.openingMessage || ''}
Ask these qualification questions naturally:
${q || '(none)'}
Objection handling: ${agent.objectionInstructions || 'Be understanding and never pressure.'}
Closing: ${agent.closingMessage || 'Thank them for their time.'}

RULES: Introduce yourself clearly. Never make false promises or guarantees. If the person
says they are not interested, thank them and end the call. Always respect opt-out / do-not-call
requests. Keep it concise and courteous.`;
}

function buildAssistant(agent) {
  const payload = {
    name: agent.name,
    firstMessage: agent.openingMessage || `Hi, this is ${agent.name}.`,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: buildSystemPrompt(agent) }],
    },
    voice: {
      provider: 'vapi',
      // Guard against agents saved before the voice list was corrected.
      voiceId: isValidVoice(agent.voiceId) ? agent.voiceId : DEFAULT_VOICE,
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      // "en-US" -> "en"; Deepgram wants the base language code.
      language: (agent.language || 'en-US').split('-')[0],
    },
  };

  // Route call events back to our webhook when a public URL is configured.
  if (env.vapi.serverUrl) {
    payload.server = {
      url: `${env.vapi.serverUrl.replace(/\/$/, '')}/api/webhooks/vapi`,
      ...(env.vapi.webhookSecret ? { secret: env.vapi.webhookSecret } : {}),
    };
  }
  return payload;
}

/** True when an id is a local placeholder rather than a real Vapi assistant. */
export const isPlaceholderAssistant = (id) => !id || /^(demo|local)-/.test(id);

/**
 * Push an agent to Vapi and return its assistant id. Throws on failure.
 * Use `upsertAssistant` when a failure shouldn't block the caller.
 */
export async function syncAssistant(agent) {
  if (!env.vapi.privateKey) {
    throw ApiError.serviceUnavailable('Calling is unavailable right now. Please contact support.');
  }
  const payload = buildAssistant(agent);
  try {
    if (!isPlaceholderAssistant(agent.vapiAssistantId)) {
      await client().patch(`/assistant/${agent.vapiAssistantId}`, payload);
      return agent.vapiAssistantId;
    }
    const { data } = await client().post('/assistant', payload);
    return data.id;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest(vapiError(err, 'Could not sync this agent to the calling service'));
  }
}

/**
 * Create or update the Vapi assistant for an agent, tolerating failure.
 * Without a Vapi key (or on a provider hiccup) we return a local placeholder id
 * so agents can still be designed and saved — calling heals it later via
 * `ensureAssistant`.
 */
export async function upsertAssistant(agent) {
  if (!env.vapi.privateKey) return agent.vapiAssistantId || `local-assistant-${agent._id}`;
  try {
    return await syncAssistant(agent);
  } catch (err) {
    console.warn('[vapi] upsertAssistant failed:', err.message);
    return agent.vapiAssistantId || `local-assistant-${agent._id}`;
  }
}

/**
 * Guarantee the agent has a real Vapi assistant before a call. Agents created
 * while Vapi was unconfigured carry a placeholder id — rather than making the
 * user re-save the agent, sync it on demand and persist the new id.
 */
export async function ensureAssistant(agent) {
  if (!isPlaceholderAssistant(agent.vapiAssistantId)) return agent.vapiAssistantId;

  const id = await syncAssistant(agent);
  agent.vapiAssistantId = id;
  await agent.save();
  console.log(`[vapi] auto-synced assistant for agent ${agent._id} -> ${id}`);
  return id;
}

export async function deleteAssistant(assistantId) {
  if (!env.vapi.privateKey || !assistantId || /^(demo|local)-/.test(assistantId)) return;
  try {
    await client().delete(`/assistant/${assistantId}`);
  } catch (err) {
    console.warn('[vapi] deleteAssistant failed:', vapiError(err));
  }
}

/* ------------------------------------------------------------------ */
/* Phone numbers (Twilio → Vapi)                                       */
/* ------------------------------------------------------------------ */

export async function listPhoneNumbers() {
  if (!env.vapi.privateKey) throw ApiError.serviceUnavailable('Vapi is not configured');
  try {
    const { data } = await client().get('/phone-number');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw ApiError.serviceUnavailable(vapiError(err, 'Could not reach Vapi'));
  }
}

function serverBlock() {
  if (!env.vapi.serverUrl) return {};
  return {
    server: {
      url: `${env.vapi.serverUrl.replace(/\/$/, '')}/api/webhooks/vapi`,
      ...(env.vapi.webhookSecret ? { secret: env.vapi.webhookSecret } : {}),
    },
  };
}

/**
 * Import a USER's Twilio number into our Vapi account.
 * Returns the Vapi phone number record (its `id` is what we call from).
 */
export async function importTwilioNumber({ accountSid, authToken, phoneNumber, label }) {
  if (!env.vapi.privateKey) {
    throw ApiError.serviceUnavailable('Calling is not available — the platform Vapi key is missing.');
  }
  try {
    const { data } = await client().post('/phone-number', {
      provider: 'twilio',
      number: phoneNumber,
      twilioAccountSid: accountSid,
      twilioAuthToken: authToken,
      name: label || `LeadCall AI ${phoneNumber}`,
      ...serverBlock(),
    });
    return data;
  } catch (err) {
    throw ApiError.badRequest(vapiError(err, 'Twilio number could not be connected'));
  }
}

/** Remove a previously imported number from Vapi (used on disconnect / change). */
export async function releasePhoneNumber(phoneNumberId) {
  if (!env.vapi.privateKey || !phoneNumberId) return;
  try {
    await client().delete(`/phone-number/${phoneNumberId}`);
  } catch (err) {
    console.warn('[vapi] releasePhoneNumber failed:', vapiError(err));
  }
}

/** Find an already-imported Vapi number matching an E.164 number, if any. */
export async function findImportedNumber(phoneNumber) {
  try {
    const numbers = await listPhoneNumbers();
    return numbers.find((n) => n.number === phoneNumber) || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Calling                                                             */
/* ------------------------------------------------------------------ */

/**
 * Start an outbound call. Returns { providerCallId, simulated }.
 *
 * If the provider is not configured this THROWS rather than silently
 * pretending — simulated calls only happen when DEMO_MODE is explicitly on.
 */
export async function startCall({ assistantId, phoneNumberId, phone, variableValues, metadata }) {
  // Demo mode short-circuits before any provider check.
  if (env.demoMode && (!features.vapi || !phoneNumberId)) {
    return {
      providerCallId: `demo-call-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      simulated: true,
    };
  }

  if (!features.vapi) {
    throw fatal(
      ApiError.serviceUnavailable(
        'Calling is unavailable right now. Please contact support.',
      ),
    );
  }

  if (!phoneNumberId) {
    throw fatal(
      ApiError.serviceUnavailable(
        'Connect your Twilio number in API Settings before starting calls.',
      ),
    );
  }

  if (isPlaceholderAssistant(assistantId)) {
    throw fatal(
      ApiError.badRequest(
        'This agent could not be synced to the calling service. Try "Sync agents" in API Settings.',
      ),
    );
  }

  try {
    const { data } = await client().post('/call', {
      assistantId,
      phoneNumberId,
      customer: { number: phone },
      assistantOverrides: { variableValues },
      metadata,
    });
    return { providerCallId: data.id, simulated: false };
  } catch (err) {
    throw ApiError.badRequest(vapiError(err, 'Call could not be started'));
  }
}

/** Telephony status for one user's API Settings screen. Never returns secrets. */
export function getTelephonyStatus(user) {
  const t = user.twilio || {};
  return {
    // Platform side
    platformReady: Boolean(env.vapi.privateKey),
    webhookConfigured: Boolean(env.vapi.serverUrl),
    demoMode: env.demoMode,
    // This user's Twilio connection
    connected: Boolean(t.verified && t.vapiPhoneNumberId),
    accountSid: t.accountSid || '',
    phoneNumber: t.phoneNumber || '',
    friendlyName: t.friendlyName || '',
    verifiedAt: t.verifiedAt || null,
    canCall: Boolean(env.vapi.privateKey && t.verified && t.vapiPhoneNumberId),
  };
}

export { features as vapiFeatures };
