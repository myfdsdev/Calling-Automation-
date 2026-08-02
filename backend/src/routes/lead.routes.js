import { Router } from 'express';
import {
  searchLeads,
  createLead,
  scoreExistingLeads,
  selectBestLeads,
  listLeads,
  getLead,
  updateLead,
  deleteLead,
} from '../controllers/lead.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature, requireEditor } from '../middleware/entitlements.js';
import { validate } from '../middleware/validate.js';
import {
  leadSearchSchema,
  leadCreateSchema,
  scoreSchema,
  selectBestSchema,
  leadUpdateSchema,
} from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

// Discovering leads is the Lead Finder feature; everything else is Leads.
router.post('/search', requireFeature('lead_finder'), requireEditor, validate(leadSearchSchema), searchLeads);

router.post('/', requireFeature('leads'), requireEditor, validate(leadCreateSchema), createLead);
router.post('/score', requireFeature('leads'), requireEditor, validate(scoreSchema), scoreExistingLeads);
router.post('/select-best', requireFeature('leads'), requireEditor, validate(selectBestSchema), selectBestLeads);
router.get('/', requireFeature('leads'), listLeads);
router.get('/:id', requireFeature('leads'), getLead);
router.put('/:id', requireFeature('leads'), requireEditor, validate(leadUpdateSchema), updateLead);
router.delete('/:id', requireFeature('leads'), requireEditor, deleteLead);

export default router;
