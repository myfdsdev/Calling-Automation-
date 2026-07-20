import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import * as vapi from '../services/vapi.service.js';
import * as twilio from '../services/twilio.service.js';
import { encryptSecret, decryptSecret, credentialsEncryptionReady } from '../utils/crypto.js';

/** Telephony status for the API Settings screen. Never returns secrets. */
export const getTelephony = asyncHandler(async (req, res) => {
  const status = vapi.getTelephonyStatus(req.user);

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

  // Reuse an existing Vapi import of this number, otherwise import it fresh.
  let vapiNumber = await vapi.findImportedNumber(phoneNumber);
  if (!vapiNumber) {
    vapiNumber = await vapi.importTwilioNumber({
      accountSid,
      authToken,
      phoneNumber,
      label: `${user.companyName || user.name} — ${phoneNumber}`,
    });
  }

  // Releasing the previous number keeps the Vapi account tidy when switching.
  const previousId = user.twilio?.vapiPhoneNumberId;
  if (previousId && previousId !== vapiNumber.id) {
    await vapi.releasePhoneNumber(previousId);
  }

  user.twilio = {
    accountSid,
    authToken: encryptSecret(authToken),
    phoneNumber,
    vapiPhoneNumberId: vapiNumber.id,
    verified: true,
    verifiedAt: new Date(),
    friendlyName: number.friendlyName || account.friendlyName || '',
  };
  await user.save();

  res.status(201).json({
    telephony: vapi.getTelephonyStatus(user),
    message: `${phoneNumber} connected and ready to call`,
  });
});

/** Disconnect the user's Twilio number and forget the stored credentials. */
export const disconnectTwilio = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const previousId = user.twilio?.vapiPhoneNumberId;
  if (previousId) await vapi.releasePhoneNumber(previousId);

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

  res.json({ telephony: vapi.getTelephonyStatus(user), message: 'Twilio number disconnected' });
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
  let synced = 0;
  const failures = [];

  let lastError = '';
  for (const agent of agents) {
    try {
      // Strict sync so real failures surface instead of silently placeholdering.
      agent.vapiAssistantId = await vapi.syncAssistant(agent);
      await agent.save();
      synced += 1;
    } catch (err) {
      lastError = err.message;
      failures.push(agent.name);
    }
  }

  res.json({ synced, total: agents.length, failures, error: lastError || undefined });
});
