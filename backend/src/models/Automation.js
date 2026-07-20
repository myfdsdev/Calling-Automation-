import mongoose from 'mongoose';

export const AUTOMATION_STATUS = [
  'draft',
  'running',
  'paused',
  'completed',
  'stopped',
  'failed',
];

const automationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },
    name: { type: String, default: '' },
    businessCategory: { type: String, default: '' },
    location: { type: String, default: '' },

    // Queue: ordered list of lead ids to call.
    queue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
    currentIndex: { type: Number, default: 0 },

    totalLeads: { type: Number, default: 0 },
    selectedLeads: { type: Number, default: 0 },
    completedCalls: { type: Number, default: 0 },
    interestedLeads: { type: Number, default: 0 },

    delayBetweenCalls: { type: Number, default: 15 }, // seconds
    maxRetries: { type: Number, default: 1 },
    callWindow: {
      start: { type: String, default: '' }, // "09:00"
      end: { type: String, default: '' }, // "18:00"
    },

    status: { type: String, enum: AUTOMATION_STATUS, default: 'draft' },
    // User-safe reason the automation stopped early (e.g. provider not configured).
    lastError: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

automationSchema.index({ userId: 1, createdAt: -1 });

export const Automation = mongoose.model('Automation', automationSchema);
