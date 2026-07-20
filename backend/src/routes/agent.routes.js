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
import { validate } from '../middleware/validate.js';
import { agentSchema, agentUpdateSchema, generateScriptSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.post('/generate-script', validate(generateScriptSchema), generateAgentScript);
router.get('/', listAgents);
router.post('/', validate(agentSchema), createAgent);
router.get('/:id', getAgent);
router.put('/:id', validate(agentUpdateSchema), updateAgent);
router.delete('/:id', deleteAgent);
router.post('/:id/test', testAgent);

export default router;
