import { Router } from 'express';
import {
  searchLeads,
  scoreExistingLeads,
  selectBestLeads,
  listLeads,
  getLead,
  updateLead,
  deleteLead,
} from '../controllers/lead.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  leadSearchSchema,
  scoreSchema,
  selectBestSchema,
  leadUpdateSchema,
} from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.post('/search', validate(leadSearchSchema), searchLeads);
router.post('/score', validate(scoreSchema), scoreExistingLeads);
router.post('/select-best', validate(selectBestSchema), selectBestLeads);
router.get('/', listLeads);
router.get('/:id', getLead);
router.put('/:id', validate(leadUpdateSchema), updateLead);
router.delete('/:id', deleteLead);

export default router;
