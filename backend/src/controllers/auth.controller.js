import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';

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

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});
