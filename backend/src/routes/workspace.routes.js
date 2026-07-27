import { Router } from 'express';
import {
  getWorkspace,
  renameWorkspace,
  createInvite,
  revokeInvite,
  inviteInfo,
  acceptInvite,
  changeRole,
  removeMember,
} from '../controllers/workspace.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  inviteSchema,
  acceptInviteSchema,
  changeRoleSchema,
  renameWorkspaceSchema,
} from '../validators/schemas.js';

const router = Router();

// Public: preview an invite before signing in.
router.get('/invite-info/:token', inviteInfo);

router.use(requireAuth);

router.get('/', getWorkspace);
router.patch('/', validate(renameWorkspaceSchema), renameWorkspace);
router.post('/invites', validate(inviteSchema), createInvite);
router.delete('/invites/:id', revokeInvite);
router.post('/invites/accept', validate(acceptInviteSchema), acceptInvite);
router.patch('/members/:userId', validate(changeRoleSchema), changeRole);
router.delete('/members/:userId', removeMember);

export default router;
