import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { verifyGoogleIdToken } from '../services/googleAuth.service.js';
import { emailReady, sendPasswordResetEmail } from '../services/email.service.js';
import { env, appUrl } from '../config/env.js';
import { ensureWorkspace, buildSessionPayload } from '../services/workspace.service.js';

/** Hash a raw reset token before comparing/storing (never store the raw token). */
const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, companyName } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, companyName, passwordHash });
  await ensureWorkspace(user);

  const token = signToken(user._id);
  res.status(201).json({ token, user: await buildSessionPayload(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Incorrect email or password');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Incorrect email or password');

  await ensureWorkspace(user);
  const token = signToken(user._id);
  res.json({ token, user: await buildSessionPayload(user) });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { credential, companyName } = req.body;
  const profile = await verifyGoogleIdToken(credential);

  let user = await User.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email }],
  });

  let status = 200;
  if (user) {
    if (user.googleId && user.googleId !== profile.googleId) {
      throw ApiError.conflict('This email is already linked to another Google account');
    }
    if (!user.googleId) user.googleId = profile.googleId;
    if (!user.name) user.name = profile.name;
    await user.save();
  } else {
    const passwordHash = await User.hashPassword(crypto.randomUUID());
    user = await User.create({
      name: profile.name,
      email: profile.email,
      googleId: profile.googleId,
      companyName,
      passwordHash,
    });
    status = 201;
  }

  await ensureWorkspace(user);
  const token = signToken(user._id);
  res.status(status).json({ token, user: await buildSessionPayload(user) });
});

export const googleConfig = asyncHandler(async (_req, res) => {
  res.json({
    enabled: Boolean(env.google.clientId),
    clientId: env.google.clientId,
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: await buildSessionPayload(req.user) });
});

/**
 * Start a password reset: email the user a time-limited reset link (via Resend).
 * Always returns the same generic message so it can't be used to discover which
 * emails have accounts.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  if (!emailReady()) {
    throw ApiError.serviceUnavailable(
      'Password reset email is not set up on the server. Set RESEND_API_KEY and RESEND_FROM.',
    );
  }
  const { email } = req.body;
  const genericMessage = 'If an account exists for that email, a password reset link is on its way.';

  const user = await User.findOne({ email });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    } catch (err) {
      // Don't leave a dangling reset token if the email couldn't be sent.
      user.resetPasswordToken = '';
      user.resetPasswordExpires = null;
      await user.save();
      throw ApiError.serviceUnavailable('Could not send the reset email. Please try again shortly.');
    }
  }

  res.json({ message: genericMessage });
});

/**
 * Complete a password reset: verify the emailed token, set the new password, and
 * sign the user in with a fresh session.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) {
    throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  }

  user.passwordHash = await User.hashPassword(password);
  user.resetPasswordToken = '';
  user.resetPasswordExpires = null;
  await user.save();

  await ensureWorkspace(user);
  const authToken = signToken(user._id);
  res.json({
    token: authToken,
    user: await buildSessionPayload(user),
    message: 'Password updated — you are now signed in.',
  });
});
