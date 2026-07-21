import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { verifyGoogleIdToken } from '../services/googleAuth.service.js';
import { env } from '../config/env.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, companyName } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, companyName, passwordHash });

  const token = signToken(user._id);
  res.status(201).json({ token, user: user.toSafeJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Incorrect email or password');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Incorrect email or password');

  const token = signToken(user._id);
  res.json({ token, user: user.toSafeJSON() });
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

  const token = signToken(user._id);
  res.status(status).json({ token, user: user.toSafeJSON() });
});

export const googleConfig = asyncHandler(async (_req, res) => {
  res.json({
    enabled: Boolean(env.google.clientId),
    clientId: env.google.clientId,
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});
