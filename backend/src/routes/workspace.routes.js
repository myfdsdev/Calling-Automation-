import { Router } from 'express';
import {
  getWorkspace,
  renameWorkspace,
  createInvite,
  resendInvite,
  revokeInvite,
  inviteInfo,
  acceptInvite,
  changeRole,
  updateMemberFeatures,
  removeMember,
} from '../controllers/workspace.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  inviteSchema,
  acceptInviteSchema,
  changeRoleSchema,
  updateFeaturesSchema,
  renameWorkspaceSchema,
} from '../validators/schemas.js';

const router = Router();

// Public: preview an invite before signing in.
router.get('/invite-info/:token', inviteInfo);

router.use(requireAuth);

router.get('/', getWorkspace);
router.patch('/', validate(renameWorkspaceSchema), renameWorkspace);
router.post('/invites', validate(inviteSchema), createInvite);
router.post('/invites/:id/resend', resendInvite);
router.delete('/invites/:id', revokeInvite);
router.post('/invites/accept', validate(acceptInviteSchema), acceptInvite);
router.patch('/members/:userId', validate(changeRoleSchema), changeRole);
router.patch('/members/:userId/features', validate(updateFeaturesSchema), updateMemberFeatures);
router.delete('/members/:userId', removeMember);

export default router;
