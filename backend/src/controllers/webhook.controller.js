import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { Call } from '../models/Call.js';
import { finalizeCallFromReport } from '../services/automation.service.js';
import { pickRecordingUrl } from '../services/vapi.service.js';

/**
 * Vapi webhook. Handles the call lifecycle events and, on end-of-call-report,
 * finalizes the call (transcript, recording, Gemini analysis) and advances the queue.
 *
 * Security: if VAPI_WEBHOOK_SECRET is set we require it via the
 * `x-vapi-secret` header (Vapi server-message secret).
 */
export const vapiWebhook = asyncHandler(async (req, res) => {
  if (env.vapi.webhookSecret) {
    const provided = req.headers['x-vapi-secret'];
    if (provided !== env.vapi.webhookSecret) {
      return res.status(401).json({ error: { message: 'Invalid webhook signature' } });
    }
  }

  const message = req.body?.message || req.body;
  const type = message?.type;
  const call = message?.call || {};
  const providerCallId = call.id || message?.callId;

  switch (type) {
    case 'status-update': {
      const map = {
        queued: 'queued',
        ringing: 'ringing',
        'in-progress': 'in_progress',
        forwarding: 'in_progress',
        ended: 'completed',
      };
      const status = map[message.status];
      if (providerCallId && status) {
        await Call.findOneAndUpdate({ providerCallId }, { $set: { status } });
      }
      break;
    }

    case 'end-of-call-report': {
      const artifact = message.artifact || {};
      await finalizeCallFromReport({
        providerCallId,
        duration: Math.round(message.durationSeconds || call.duration || 0),
        transcript: artifact.transcript || message.transcript || '',
        recordingUrl: pickRecordingUrl(artifact, message),
        endedReason: message.endedReason || call.endedReason || '',
      });
      break;
    }

    case 'recording': {
      const url = pickRecordingUrl(message.artifact, message);
      if (providerCallId && url) {
        await Call.findOneAndUpdate({ providerCallId }, { $set: { recordingUrl: url } });
      }
      break;
    }

    default:
      // Acknowledge unhandled events so Vapi doesn't retry.
      break;
  }

  res.json({ received: true });
});
