import { Router } from 'express';
import {
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  testAgent,
  generateAgentScript,
} from '../controllers/agent.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature, requireEditor, requireAppAccess } from '../middleware/entitlements.js';
import { validate } from '../middleware/validate.js';
import { agentSchema, agentUpdateSchema, generateScriptSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);
router.use(requireAppAccess);
router.use(requireFeature('agents'));

router.post('/generate-script', requireEditor, validate(generateScriptSchema), generateAgentScript);
router.get('/', listAgents);
router.post('/', requireEditor, validate(agentSchema), createAgent);
router.get('/:id', getAgent);
router.put('/:id', requireEditor, validate(agentUpdateSchema), updateAgent);
router.delete('/:id', requireEditor, deleteAgent);
router.post('/:id/test', requireEditor, testAgent);

export default router;
