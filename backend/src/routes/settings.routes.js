import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getTelephony,
  lookupTwilioNumbers,
  connectTwilio,
  disconnectTwilio,
  testTwilio,
  syncAgents,
} from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { twilioConnectSchema, twilioLookupSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

// Credential endpoints are tighter — they hit a third party with secrets.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please try again in a few minutes.' } },
});

router.get('/telephony', getTelephony);
router.post('/telephony/lookup', credentialLimiter, validate(twilioLookupSchema), lookupTwilioNumbers);
router.post('/telephony/connect', credentialLimiter, validate(twilioConnectSchema), connectTwilio);
router.post('/telephony/test', credentialLimiter, testTwilio);
router.delete('/telephony', disconnectTwilio);
router.post('/telephony/sync-agents', syncAgents);

export default router;
