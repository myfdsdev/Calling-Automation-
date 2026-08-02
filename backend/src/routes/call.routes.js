import { Router } from 'express';
import { listCalls, getCall, startLeadCall } from '../controllers/call.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature, requireEditor } from '../middleware/entitlements.js';

const router = Router();
router.use(requireAuth);
router.use(requireFeature('calls'));

router.get('/', listCalls);
router.get('/:id', getCall);
router.post('/:leadId/start', requireEditor, startLeadCall);

export default router;
