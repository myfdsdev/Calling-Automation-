import axios from 'axios';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { decryptSecret } from '../utils/crypto.js';

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

/** Shown when a trial account tries to place outbound calls to leads. */
export const TRIAL_ACCOUNT_MESSAGE =
  'Your Twilio number is on a trial account, which can only call numbers you have verified in Twilio — not your leads. Please upgrade your Twilio account to a paid plan to place outbound calls.';

function auth(accountSid, authToken) {
  return { username: accountSid, password: authToken };
}

/** Turn a Twilio API error into a message safe to show the user. */
function twilioError(err, fallback) {
  const status = err.response?.status;
  const msg = err.response?.data?.message;
  if (status === 401) return 'Twilio rejected those credentials. Check the Account SID and Auth Token.';
  if (status === 404) return 'That Twilio account could not be found.';
  return msg || err.message || fallback;
}

/**
 * Verify an Account SID + Auth Token pair against Twilio.
 * Returns { friendlyName, status } on success, throws ApiError otherwise.
 */
export async function verifyAccount({ accountSid, authToken }) {
  try {
    const { data } = await axios.get(`${TWILIO_BASE}/Accounts/${accountSid}.json`, {
      auth: auth(accountSid, authToken),
      timeout: 15000,
    });
    if (data.status && data.status !== 'active') {
      throw ApiError.badRequest(`This Twilio account is ${data.status}, not active.`);
    }
    // Twilio account `type` is "Trial" or "Full".
    return {
      friendlyName: data.friendly_name || '',
      status: data.status || 'active',
      type: data.type || '',
      trial: data.type === 'Trial',
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest(twilioError(err, 'Could not verify your Twilio account'));
  }
}

/**
 * Re-check whether the user's connected Twilio account is still on a trial plan,
 * caching the result on the user. Returns true if trial. Used to block lead
 * calling with a clear message instead of letting calls fail as "fake"-looking.
 */
export async function refreshUserTrial(userId) {
  const u = await User.findById(userId).select('+twilio.authToken');
  if (!u?.twilio?.accountSid || !u.twilio?.authToken) return false;
  try {
    const account = await verifyAccount({
      accountSid: u.twilio.accountSid,
      authToken: decryptSecret(u.twilio.authToken),
    });
    if (Boolean(u.twilio.trial) !== account.trial) {
      u.twilio.trial = account.trial;
      await u.save();
    }
    return account.trial;
  } catch {
    return Boolean(u.twilio.trial); // network hiccup — trust the last known value
  }
}

/**
 * Confirm the phone number actually belongs to this Twilio account, and that it
 * can place outbound voice calls.
 */
export async function verifyPhoneNumber({ accountSid, authToken, phoneNumber }) {
  let numbers;
  try {
    const { data } = await axios.get(
      `${TWILIO_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        auth: auth(accountSid, authToken),
        params: { PhoneNumber: phoneNumber, PageSize: 20 },
        timeout: 15000,
      },
    );
    numbers = data.incoming_phone_numbers || [];
  } catch (err) {
    throw ApiError.badRequest(twilioError(err, 'Could not check that phone number'));
  }

  const match = numbers.find((n) => n.phone_number === phoneNumber);
  if (!match) {
    throw ApiError.badRequest(
      `${phoneNumber} is not an active number on this Twilio account. Use a number from your Twilio console, in +E.164 format.`,
    );
  }
  if (match.capabilities && match.capabilities.voice === false) {
    throw ApiError.badRequest(`${phoneNumber} does not support voice calls.`);
  }
  return { sid: match.sid, friendlyName: match.friendly_name || '' };
}

/** List the account's voice-capable numbers so the user can pick one. */
export async function listNumbers({ accountSid, authToken }) {
  try {
    const { data } = await axios.get(
      `${TWILIO_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      { auth: auth(accountSid, authToken), params: { PageSize: 50 }, timeout: 15000 },
    );
    return (data.incoming_phone_numbers || [])
      .filter((n) => !n.capabilities || n.capabilities.voice !== false)
      .map((n) => ({ phoneNumber: n.phone_number, friendlyName: n.friendly_name || '' }));
  } catch (err) {
    throw ApiError.badRequest(twilioError(err, 'Could not list your Twilio numbers'));
  }
}
