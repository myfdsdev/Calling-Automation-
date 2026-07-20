import { Router } from 'express';
import {
  getStats,
  getRecentLeads,
  getRecentCalls,
  getActiveAutomation,
} from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/stats', getStats);
router.get('/recent-leads', getRecentLeads);
router.get('/recent-calls', getRecentCalls);
router.get('/active-automation', getActiveAutomation);

export default router;
