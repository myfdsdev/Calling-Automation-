import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { Workspace } from '../models/Workspace.js';
import * as vapi from '../services/vapi.service.js';
import * as twilio from '../services/twilio.service.js';
import { testGeminiKey } from '../services/gemini.service.js';
import { testSerpApiKey } from '../services/leadProvider.service.js';
import {
  ensureWorkspace,
  canManageMembers,
  apiKeysStatus,
  resolveVapiKey,
  getWorkspaceMemberIds,
} from '../services/workspace.service.js';
import { encryptSecret, decryptSecret, credentialsEncryptionReady } from '../utils/crypto.js';

/** Telephony status for the API Settings screen. Never returns secrets. */
export const getTelephony = asyncHandler(async (req, res) => {
  const vapiKey = await resolveVapiKey(req.user);
  const status = vapi.getTelephonyStatus(req.user, vapiKey);

  // Agents without a real Vapi assistant can't place calls.
  const unsyncedAgents = await Agent.countDocuments({
    userId: req.user._id,
    $or: [{ vapiAssistantId: '' }, { vapiAssistantId: { $regex: '^(demo|local)-' } }],
  });

  res.json({ telephony: { ...status, unsyncedAgents } });
});

/**
 * Look up the voice-capable numbers on a Twilio account so the user can pick one.
 * Credentials are used for this request only — nothing is stored.
 */
export const lookupTwilioNumbers = asyncHandler(async (req, res) => {
  const { accountSid, authToken } = req.body;
  await twilio.verifyAccount({ accountSid, authToken });
  const numbers = await twilio.listNumbers({ accountSid, authToken });
  res.json({ numbers });
});

/**
 * Connect the user's own Twilio account:
 *   1. verify the SID/token against Twilio
 *   2. confirm the number belongs to that account and supports voice
 *   3. import it into our Vapi account
 *   4. store the credentials (auth token encrypted at rest)
 */
export const connectTwilio = asyncHandler(async (req, res) => {
  if (!credentialsEncryptionReady()) {
    throw ApiError.serviceUnavailable(
      'Credential storage is not configured on the server. Set CREDENTIALS_SECRET and restart.',
    );
  }

  const { accountSid, authToken, phoneNumber } = req.body;

  const account = await twilio.verifyAccount({ accountSid, authToken });
  const number = await twilio.verifyPhoneNumber({ accountSid, authToken, phoneNumber });

  const user = await User.findById(req.user._id);
  // Import into THIS workspace's Vapi account (own key or platform fallback).
  const vapiKey = await resolveVapiKey(req.user);

  // Reuse an existing Vapi import of this number, otherwise import it fresh.
  let vapiNumber = await vapi.findImportedNumber(phoneNumber, vapiKey);
  if (!vapiNumber) {
    vapiNumber = await vapi.importTwilioNumber({
      accountSid,
      authToken,
      phoneNumber,
      label: `${user.companyName || user.name} — ${phoneNumber}`,
      vapiKey,
    });
  }

  // Releasing the previous number keeps the Vapi account tidy when switching.
  const previousId = user.twilio?.vapiPhoneNumberId;
  if (previousId && previousId !== vapiNumber.id) {
    await vapi.releasePhoneNumber(previousId, vapiKey);
  }

  user.twilio = {
    accountSid,
    authToken: encryptSecret(authToken),
    phoneNumber,
    vapiPhoneNumberId: vapiNumber.id,
    verified: true,
    verifiedAt: new Date(),
    friendlyName: number.friendlyName || account.friendlyName || '',
    trial: account.trial,
  };
  await user.save();

  res.status(201).json({
    telephony: vapi.getTelephonyStatus(user, vapiKey),
    message: account.trial
      ? `${phoneNumber} connected — but this is a Twilio TRIAL account. Trial accounts can only call numbers you've verified in Twilio, not your leads. Upgrade your Twilio account to start calling.`
      : `${phoneNumber} connected and ready to call`,
  });
});

/** Disconnect the user's Twilio number and forget the stored credentials. */
export const disconnectTwilio = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const vapiKey = await resolveVapiKey(req.user);
  const previousId = user.twilio?.vapiPhoneNumberId;
  if (previousId) await vapi.releasePhoneNumber(previousId, vapiKey);

  user.twilio = {
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    vapiPhoneNumberId: '',
    verified: false,
    verifiedAt: null,
    friendlyName: '',
  };
  await user.save();

  res.json({ telephony: vapi.getTelephonyStatus(user, vapiKey), message: 'Twilio number disconnected' });
});

/** Re-check the stored credentials still work with Twilio. */
export const testTwilio = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+twilio.authToken');
  if (!user.twilio?.accountSid || !user.twilio?.authToken) {
    throw ApiError.badRequest('No Twilio account is connected yet');
  }

  const authToken = decryptSecret(user.twilio.authToken);
  await twilio.verifyAccount({ accountSid: user.twilio.accountSid, authToken });
  await twilio.verifyPhoneNumber({
    accountSid: user.twilio.accountSid,
    authToken,
    phoneNumber: user.twilio.phoneNumber,
  });

  user.twilio.verified = true;
  user.twilio.verifiedAt = new Date();
  await user.save();

  res.json({ ok: true, message: 'Twilio connection is working' });
});

/** Re-push every agent to Vapi so each has a real assistant id. */
export const syncAgents = asyncHandler(async (req, res) => {
  const agents = await Agent.find({ userId: req.user._id });
  const vapiKey = await resolveVapiKey(req.user);
  let synced = 0;
  const failures = [];

  let lastError = '';
  for (const agent of agents) {
    try {
      // Strict sync so real failures surface instead of silently placeholdering.
      agent.vapiAssistantId = await vapi.syncAssistant(agent, vapiKey);
      await agent.save();
      synced += 1;
    } catch (err) {
      lastError = err.message;
      failures.push(agent.name);
    }
  }

  res.json({ synced, total: agents.length, failures, error: lastError || undefined });
});

/* ----------------- Per-workspace external API keys --------------- */

/**
 * After a workspace connects/changes its Vapi key, migrate it into the new
 * account automatically: re-create every workspace agent's assistant, and
 * re-import every member's Twilio number. Returns a summary.
 */
async function migrateWorkspaceToVapiKey(user, vapiKey) {
  const { memberIds } = await getWorkspaceMemberIds(user);

  // 1) Re-sync all workspace agents into the new Vapi account.
  const agents = await Agent.find({ userId: { $in: memberIds } });
  let agentsSynced = 0;
  const agentFailures = [];
  for (const agent of agents) {
    try {
      agent.vapiAssistantId = ''; // force a fresh create in the new account
      agent.vapiAssistantId = await vapi.syncAssistant(agent, vapiKey);
      await agent.save();
      agentsSynced += 1;
    } catch {
      agentFailures.push(agent.name);
    }
  }

  // 2) Re-import each member's connected Twilio number into the new account.
  const members = await User.find({
    _id: { $in: memberIds },
    'twilio.verified': true,
  }).select('+twilio.authToken');
  let numbersReimported = 0;
  for (const m of members) {
    try {
      const authToken = decryptSecret(m.twilio.authToken);
      const existing = await vapi.findImportedNumber(m.twilio.phoneNumber, vapiKey);
      const num =
        existing ||
        (await vapi.importTwilioNumber({
          accountSid: m.twilio.accountSid,
          authToken,
          phoneNumber: m.twilio.phoneNumber,
          label: `${m.companyName || m.name} — ${m.twilio.phoneNumber}`,
          vapiKey,
        }));
      m.twilio.vapiPhoneNumberId = num.id;
      await m.save();
      numbersReimported += 1;
    } catch {
      /* leave as-is; that member can re-connect Twilio from their settings */
    }
  }

  return { agentsSynced, agentsTotal: agents.length, agentFailures, numbersReimported };
}


/** Status of the workspace's connected API keys (no secrets). */
export const getApiKeys = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  const ws = await Workspace.findById(req.user.workspaceId);
  res.json({
    apiKeys: apiKeysStatus(ws),
    canManage: canManageMembers(req.user.workspaceRole),
  });
});

/**
 * Connect / update the workspace's own API keys. Each provided key is verified
 * with the provider before being encrypted and stored. Owner/admin only.
 */
export const connectApiKeys = asyncHandler(async (req, res) => {
  if (!credentialsEncryptionReady()) {
    throw ApiError.serviceUnavailable(
      'Credential storage is not configured on the server. Set CREDENTIALS_SECRET and restart.',
    );
  }
  await ensureWorkspace(req.user);
  if (!canManageMembers(req.user.workspaceRole)) {
    throw ApiError.forbidden('Only the workspace owner or an admin can manage API keys');
  }

  const ws = await Workspace.findById(req.user.workspaceId);
  const { gemini, geminiModel, serpapi, vapi: vapiKey } = req.body;

  if (gemini) {
    await testGeminiKey(gemini, geminiModel);
    ws.apiKeys.gemini = {
      cipher: encryptSecret(gemini),
      last4: gemini.slice(-4),
      model: geminiModel || '',
      connectedAt: new Date(),
    };
  }
  if (serpapi) {
    await testSerpApiKey(serpapi);
    ws.apiKeys.serpapi = {
      cipher: encryptSecret(serpapi),
      last4: serpapi.slice(-4),
      connectedAt: new Date(),
    };
  }
  let vapiMigration = null;
  if (vapiKey) {
    await vapi.testVapiKey(vapiKey);
    ws.apiKeys.vapi = {
      cipher: encryptSecret(vapiKey),
      last4: vapiKey.slice(-4),
      connectedAt: new Date(),
    };
    await ws.save();
    // Automatically move the workspace onto the new Vapi account.
    vapiMigration = await migrateWorkspaceToVapiKey(req.user, vapiKey);
  } else {
    await ws.save();
  }

  const parts = ['API keys saved'];
  if (vapiMigration) {
    parts.push(`${vapiMigration.agentsSynced}/${vapiMigration.agentsTotal} agents synced`);
    if (vapiMigration.numbersReimported) parts.push(`${vapiMigration.numbersReimported} number(s) re-imported`);
  }

  res.json({ apiKeys: apiKeysStatus(ws), migration: vapiMigration, message: parts.join(' · ') });
});

/** Disconnect a single workspace API key. */
export const disconnectApiKey = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  if (!canManageMembers(req.user.workspaceRole)) {
    throw ApiError.forbidden('Only the workspace owner or an admin can manage API keys');
  }
  const service = req.params.service;
  if (!['gemini', 'serpapi', 'vapi'].includes(service)) throw ApiError.badRequest('Unknown service');

  const ws = await Workspace.findById(req.user.workspaceId);
  ws.apiKeys[service] = { cipher: '', last4: '', connectedAt: null, ...(service === 'gemini' ? { model: '' } : {}) };
  await ws.save();

  res.json({ apiKeys: apiKeysStatus(ws), message: `${service} key removed` });
});
