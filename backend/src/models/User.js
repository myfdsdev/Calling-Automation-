import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { mask } from '../utils/crypto.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    // Password reset: a SHA-256 hash of the emailed token (never the raw token),
    // plus its expiry. Both are never sent to the client.
    resetPasswordToken: { type: String, default: '', select: false },
    resetPasswordExpires: { type: Date, default: null, select: false },
    googleId: { type: String, unique: true, sparse: true, trim: true },
    companyName: { type: String, trim: true, default: '' },
    // Admins register via /register-admin, own a workspace, and can invite users
    // and grant features. A non-admin who signs up normally has NO app access
    // until an admin invites them (invite-only model).
    isAdmin: { type: Boolean, default: false },

    // Workspace membership. `workspaceId` is the user's ACTIVE workspace context:
    // owner of their own by default; moved into someone else's when they accept an
    // invite. Data stays isolated per user.
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    workspaceRole: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'owner' },
    // Features the workspace owner granted this member. Owners implicitly have all
    // features, so this only matters for editors/viewers. Merged with base access
    // in getUserEntitlements().
    assignedFeatures: { type: [String], default: [] },

    // The user's own Twilio account, connected from API Settings.
    twilio: {
      accountSid: { type: String, default: '' },
      // AES-256-GCM ciphertext — never selected by default, never sent to the client.
      authToken: { type: String, default: '', select: false },
      phoneNumber: { type: String, default: '' },
      // Id of this number after it's imported into our Vapi account.
      vapiPhoneNumberId: { type: String, default: '' },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date, default: null },
      friendlyName: { type: String, default: '' },
      // Twilio trial accounts can only call pre-verified numbers, not arbitrary
      // leads — flagged so lead calling shows a clear "upgrade" error, not fake calls.
      trial: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

/** True when this user has a verified Twilio number imported into Vapi. */
userSchema.methods.canCall = function canCall() {
  return Boolean(this.twilio?.verified && this.twilio?.vapiPhoneNumberId);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    companyName: this.companyName,
    createdAt: this.createdAt,
    // Connection state only — never the credentials themselves.
    telephony: {
      connected: this.canCall(),
      phoneNumber: this.twilio?.phoneNumber || '',
      accountSid: this.twilio?.accountSid ? mask(this.twilio.accountSid, 6) : '',
      friendlyName: this.twilio?.friendlyName || '',
      verifiedAt: this.twilio?.verifiedAt || null,
    },
  };
};

export const User = mongoose.model('User', userSchema);
