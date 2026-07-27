import mongoose from 'mongoose';

/**
 * A workspace groups a billing owner with the members they invite. Data stays
 * isolated per-user (each member sees only their own agents/leads/calls), but
 * credits & the plan are drawn from the OWNER's account.
 */
const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const Workspace = mongoose.model('Workspace', workspaceSchema);
