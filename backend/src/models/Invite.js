import mongoose from 'mongoose';

export const INVITE_ROLES = ['editor', 'viewer'];
export const INVITE_STATUS = ['pending', 'accepted', 'revoked', 'expired'];

const inviteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: INVITE_ROLES, default: 'editor' },
    // Features to grant the user on join — copied onto their member record.
    assignedFeatures: { type: [String], default: [] },
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: INVITE_STATUS, default: 'pending' },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Invite = mongoose.model('Invite', inviteSchema);
