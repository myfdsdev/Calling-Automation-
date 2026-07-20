import { Router } from 'express';
import { vapiWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Public endpoint (secured by shared secret header, not JWT).
router.post('/vapi', vapiWebhook);

export default router;
