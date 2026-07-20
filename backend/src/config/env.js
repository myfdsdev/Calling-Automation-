import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

const toBool = (value, fallback = false) => {
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
};

export const env = {
  port: toInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/leadcall_ai',

  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },

  vapi: {
    privateKey: process.env.VAPI_PRIVATE_KEY || '',
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || '',
    webhookSecret: process.env.VAPI_WEBHOOK_SECRET || '',
    serverUrl: process.env.VAPI_SERVER_URL || '', // public webhook URL (e.g. ngrok)
  },

  // Key used to encrypt user-supplied third-party credentials (Twilio auth tokens)
  // at rest. Falls back to JWT_SECRET so dev doesn't store plaintext by accident.
  credentialsSecret:
    process.env.CREDENTIALS_SECRET || process.env.JWT_SECRET || '',

  // Simulated calls are OPT-IN. Never fake a call unless this is explicitly true.
  demoMode: toBool(process.env.DEMO_MODE, false),

  serpApi: {
    apiKey: process.env.SERPAPI_API_KEY || '',
    hl: process.env.SERPAPI_HL || 'en',
    gl: process.env.SERPAPI_GL || 'us',
  },

  cloudinaryUrl: process.env.CLOUDINARY_URL || '',

  defaults: {
    leadCredits: toInt(process.env.DEFAULT_LEAD_CREDITS, 500),
    callingMinutes: toInt(process.env.DEFAULT_CALLING_MINUTES, 120),
  },
};

/**
 * Platform-level feature flags.
 *
 * `vapi` means the PLATFORM can place calls (we hold the Vapi account). Whether a
 * given USER can call additionally depends on them connecting their own Twilio
 * number — see User.canCall().
 */
export const features = {
  gemini: Boolean(env.gemini.apiKey),
  vapi: Boolean(env.vapi.privateKey),
  leadProvider: Boolean(env.serpApi.apiKey),
  demoMode: env.demoMode,
};

export const isProd = env.nodeEnv === 'production';
