import mongoose from 'mongoose';

export const AGENT_STATUS = ['active', 'inactive'];

const agentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: '' },
    serviceName: { type: String, trim: true, default: '' },
    language: { type: String, default: 'en-US' },
    voiceId: { type: String, default: 'jennifer' },

    // Call objective
    callGoal: { type: String, default: '' },
    targetCustomer: { type: String, default: '' },
    introduction: { type: String, default: '' },
    offerDescription: { type: String, default: '' },

    // Conversation setup
    openingMessage: { type: String, default: '' },
    qualificationQuestions: { type: [String], default: [] },
    objectionInstructions: { type: String, default: '' },
    closingMessage: { type: String, default: '' },

    vapiAssistantId: { type: String, default: '' },
    status: { type: String, enum: AGENT_STATUS, default: 'active' },
    totalCalls: { type: Number, default: 0 },
  },
  { timestamps: true },
);

agentSchema.index({ userId: 1, createdAt: -1 });

export const Agent = mongoose.model('Agent', agentSchema);
