import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
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
    companyName: { type: String, trim: true, default: '' },
    leadCredits: { type: Number, default: env.defaults.leadCredits },
    callingMinutes: { type: Number, default: env.defaults.callingMinutes },

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
    leadCredits: this.leadCredits,
    callingMinutes: this.callingMinutes,
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
