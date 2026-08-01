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

    // Workspace membership. Owner of their own workspace by default; members are
    // moved into someone else's workspace when they accept an invite; data stays
    // isolated per user.
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
    workspaceRole: { type: String, enum: ['owner', 'admin', 'member'], default: 'owner' },

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
