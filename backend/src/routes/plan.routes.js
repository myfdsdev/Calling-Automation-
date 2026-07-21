import { Router } from 'express';
import { listPlans, subscribe } from '../controllers/plan.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Plans are viewable while authenticated (current plan + usage are included).
router.get('/', requireAuth, listPlans);
router.post('/:planId/subscribe', requireAuth, subscribe);

export default router;
