import mongoose from 'mongoose';

export const CALL_LIFECYCLE = [
  'queued',
  'ringing',
  'in_progress',
  'completed',
  'failed',
  'no_answer',
  'busy',
];

const callSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    automationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Automation',
      default: null,
    },

    providerCallId: { type: String, default: '', index: true },
    status: { type: String, enum: CALL_LIFECYCLE, default: 'queued' },
    result: { type: String, default: 'pending' },
    // True when the call lifecycle was simulated locally (DEMO_MODE), not a real call.
    simulated: { type: Boolean, default: false },
    // User-safe reason a call failed to start.
    failureReason: { type: String, default: '' },

    duration: { type: Number, default: 0 }, // seconds
    transcript: { type: String, default: '' },
    recordingUrl: { type: String, default: '' },
    summary: { type: String, default: '' },
    interestLevel: { type: Number, default: null },
    objections: { type: [String], default: [] },
    followUpRequested: { type: Boolean, default: false },
    endedReason: { type: String, default: '' },

    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

callSchema.index({ userId: 1, createdAt: -1 });

export const Call = mongoose.model('Call', callSchema);
