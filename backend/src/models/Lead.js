import mongoose from 'mongoose';

export const SELECTION_STATUS = ['unselected', 'selected', 'removed'];
export const CALL_STATUS = [
  'new',
  'selected',
  'in_queue',
  'calling',
  'completed',
  'failed',
  'do_not_call',
];
export const CALL_RESULT = [
  'pending',
  'interested',
  'not_interested',
  'follow_up',
  'no_answer',
  'busy',
  'wrong_number',
  'voicemail',
];

const leadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
    automationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Automation',
      default: null,
    },

    businessName: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    website: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    category: { type: String, default: '' },

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    source: { type: String, default: 'mock' },

    leadScore: { type: Number, default: 0 },
    scoreReason: { type: String, default: '' },

    selectionStatus: { type: String, enum: SELECTION_STATUS, default: 'unselected' },
    callStatus: { type: String, enum: CALL_STATUS, default: 'new' },
    callResult: { type: String, enum: CALL_RESULT, default: 'pending' },
    callAttempts: { type: Number, default: 0 },
    interestLevel: { type: Number, default: null },

    doNotCall: { type: Boolean, default: false },
    lastCalledAt: { type: Date, default: null },
    notes: { type: String, default: '' },

    // Dedup key so the same business isn't imported twice for a user.
    dedupeKey: { type: String, index: true },
  },
  { timestamps: true },
);

leadSchema.index({ userId: 1, dedupeKey: 1 }, { unique: false });
leadSchema.index({ userId: 1, callStatus: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
