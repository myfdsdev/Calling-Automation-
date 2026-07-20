import { Router } from 'express';
import { listCalls, getCall, startLeadCall } from '../controllers/call.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', listCalls);
router.get('/:id', getCall);
router.post('/:leadId/start', startLeadCall);

export default router;
