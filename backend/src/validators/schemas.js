import { z } from 'zod';
import { VAPI_VOICES, DEFAULT_VOICE } from '../config/voices.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/* ---------------- Auth ---------------- */
export const registerSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(80),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  companyName: z.string().max(120).optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(20, 'Google sign-in token is required'),
  companyName: z.string().max(120).optional().default(''),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid or missing reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

/* ---------------- Workspace / team ---------------- */
export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  role: z.enum(['admin', 'member']).optional().default('member'),
});
export const acceptInviteSchema = z.object({
  token: z.string().min(10, 'Invalid invite token'),
});
export const changeRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});
export const renameWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name is too short').max(80),
});

export const apiKeysSchema = z
  .object({
    gemini: z.string().trim().min(10, 'That Gemini key looks too short').max(200).optional(),
    geminiModel: z.string().trim().max(60).optional(),
    serpapi: z.string().trim().min(10, 'That SerpAPI key looks too short').max(200).optional(),
    vapi: z.string().trim().min(10, 'That Vapi key looks too short').max(200).optional(),
  })
  .refine((v) => v.gemini || v.serpapi || v.vapi, {
    message: 'Provide at least one API key',
  });

/* ---------------- Telephony (user's own Twilio) ---------------- */
export const twilioConnectSchema = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-f]{32}$/i, 'Account SID should start with "AC" followed by 32 characters'),
  authToken: z.string().trim().min(20, 'That Auth Token looks too short').max(200),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use E.164 format, e.g. +14155550123'),
});

export const twilioLookupSchema = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[0-9a-f]{32}$/i, 'Account SID should start with "AC" followed by 32 characters'),
  authToken: z.string().trim().min(20, 'That Auth Token looks too short').max(200),
});

/* ---------------- Agent ---------------- */
export const agentSchema = z.object({
  name: z.string().min(2, 'Agent name is required').max(80),
  companyName: z.string().max(120).optional().default(''),
  serviceName: z.string().max(120).optional().default(''),
  businessLocation: z.string().max(160).optional().default(''),
  language: z.string().max(20).optional().default('en-US'),
  voiceId: z
    .enum(VAPI_VOICES, { errorMap: () => ({ message: 'Choose one of the available voices' }) })
    .optional()
    .default(DEFAULT_VOICE),

  callGoal: z.string().max(400).optional().default(''),
  targetCustomer: z.string().max(400).optional().default(''),
  introduction: z.string().max(600).optional().default(''),
  offerDescription: z.string().max(600).optional().default(''),

  openingMessage: z.string().max(600).optional().default(''),
  qualificationQuestions: z.array(z.string().max(300)).max(10).optional().default([]),
  objectionInstructions: z.string().max(1000).optional().default(''),
  closingMessage: z.string().max(600).optional().default(''),

  status: z.enum(['active', 'inactive']).optional(),
});

export const agentUpdateSchema = agentSchema.partial();

export const generateScriptSchema = z.object({
  companyName: z.string().max(120).optional().default(''),
  serviceName: z.string().max(120).optional().default(''),
  businessLocation: z.string().max(160).optional().default(''),
  callGoal: z.string().max(400).optional().default(''),
  targetCustomer: z.string().max(400).optional().default(''),
  offerDescription: z.string().max(600).optional().default(''),
  language: z.string().max(20).optional().default('en-US'),
});

/* ---------------- Leads ---------------- */
export const leadSearchSchema = z.object({
  agentId: objectId.optional(),
  businessCategory: z.string().min(2, 'Business category is required').max(120),
  country: z.string().max(80).optional().default(''),
  state: z.string().max(80).optional().default(''),
  city: z.string().max(80).optional().default(''),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  minRating: z.coerce.number().min(0).max(5).optional().default(0),
  maxRating: z.coerce.number().min(0).max(5).optional().default(5),
  minReviews: z.coerce.number().int().min(0).optional().default(0),
  mustHavePhone: z.boolean().optional().default(true),
  mustHaveWebsite: z.boolean().optional().default(false),
  excludeCalled: z.boolean().optional().default(true),
});

// Manually added lead (testing / one-off entries). Phone is required because a
// lead with no number can never be called.
export const leadCreateSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is required').max(160),
  phone: z
    .string()
    .trim()
    .min(5, 'Enter a valid phone number with country code, e.g. +14155550123')
    .max(25),
  website: z.string().trim().max(300).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
  city: z.string().trim().max(80).optional().default(''),
  state: z.string().trim().max(80).optional().default(''),
  country: z.string().trim().max(80).optional().default(''),
  category: z.string().trim().max(120).optional().default(''),
  rating: z.coerce.number().min(0).max(5).optional().default(0),
  reviewCount: z.coerce.number().int().min(0).optional().default(0),
  notes: z.string().max(2000).optional().default(''),
  // Empty string from an unselected dropdown means "no agent", not an invalid id.
  agentId: z.preprocess((v) => (v === '' || v == null ? undefined : v), objectId.optional()),
});

export const selectBestSchema = z.object({
  leadIds: z.array(objectId).optional(),
  count: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const scoreSchema = z.object({
  leadIds: z.array(objectId).min(1, 'Select at least one lead'),
});

export const leadUpdateSchema = z.object({
  selectionStatus: z.enum(['unselected', 'selected', 'removed']).optional(),
  callStatus: z
    .enum(['new', 'selected', 'in_queue', 'calling', 'completed', 'failed', 'do_not_call'])
    .optional(),
  doNotCall: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  agentId: objectId.nullable().optional(),
});

/* ---------------- Automation ---------------- */
export const automationSchema = z.object({
  agentId: objectId,
  name: z.string().max(120).optional().default(''),
  businessCategory: z.string().max(120).optional().default(''),
  location: z.string().max(160).optional().default(''),
  leadIds: z.array(objectId).min(1, 'Select at least one lead to call'),
  delayBetweenCalls: z.coerce.number().int().min(5).max(600).optional().default(15),
  maxRetries: z.coerce.number().int().min(0).max(5).optional().default(1),
  callWindow: z
    .object({
      start: z.string().max(5).optional().default(''),
      end: z.string().max(5).optional().default(''),
    })
    .optional()
    .default({ start: '', end: '' }),
});
