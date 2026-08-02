import { Router } from 'express';
import {
  createAutomation,
  listAutomations,
  getAutomation,
  startAutomation,
  pauseAutomation,
  resumeAutomation,
  stopAutomation,
} from '../controllers/automation.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature, requireEditor } from '../middleware/entitlements.js';
import { validate } from '../middleware/validate.js';
import { automationSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);
router.use(requireFeature('automations'));

router.post('/', requireEditor, validate(automationSchema), createAutomation);
router.get('/', listAutomations);
router.get('/:id', getAutomation);
router.post('/:id/start', requireEditor, startAutomation);
router.post('/:id/pause', requireEditor, pauseAutomation);
router.post('/:id/resume', requireEditor, resumeAutomation);
router.post('/:id/stop', requireEditor, stopAutomation);

export default router;
