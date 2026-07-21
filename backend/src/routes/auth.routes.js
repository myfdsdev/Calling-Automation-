import { Router } from 'express';
import { register, login, googleAuth, googleConfig, me } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { registerSchema, loginSchema, googleAuthSchema } from '../validators/schemas.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/google/config', googleConfig);
router.post('/google', validate(googleAuthSchema), googleAuth);
router.get('/me', requireAuth, me);

export default router;
