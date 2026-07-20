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
import { validate } from '../middleware/validate.js';
import { automationSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.post('/', validate(automationSchema), createAutomation);
router.get('/', listAutomations);
router.get('/:id', getAutomation);
router.post('/:id/start', startAutomation);
router.post('/:id/pause', pauseAutomation);
router.post('/:id/resume', resumeAutomation);
router.post('/:id/stop', stopAutomation);

export default router;
