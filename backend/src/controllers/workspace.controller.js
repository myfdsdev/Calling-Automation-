import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Invite } from '../models/Invite.js';
import { visibleFeatures, sanitizeFeatures, featureLabels } from '../config/features.js';
import { emailReady, sendWorkspaceInviteEmail } from '../services/email.service.js';
import {
  ensureWorkspace,
  getMembers,
  canManageMembers,
  makeInviteToken,
  inviteLink,
  inviteExpiry,
  moveToOwnWorkspace,
  buildSessionPayload,
} from '../services/workspace.service.js';

const ROLE_LABELS = { owner: 'Admin', editor: 'Editor', viewer: 'Viewer' };
const roleLabel = (role) => ROLE_LABELS[role] || 'User';

function memberJSON(u, meId, ownerId) {
  const isOwner = String(u._id) === String(ownerId);
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.workspaceRole,
    // Owners implicitly have every feature; members carry an explicit grant list.
    assignedFeatures: isOwner ? [] : Array.isArray(u.assignedFeatures) ? u.assignedFeatures : [],
    isYou: String(u._id) === String(meId),
    isOwner,
    joinedAt: u.createdAt,
  };
}

/**
 * Send the branded invite email. Never throws — a transient email failure must
 * not lose the invite (the owner can still copy the link or resend). Returns
 * whether the email actually went out.
 */
async function fireInviteEmail(invite, { inviterName, workspaceName }) {
  if (!emailReady()) return false;
  try {
    await sendWorkspaceInviteEmail({
      to: invite.email,
      inviterName,
      workspaceName,
      roleLabel: roleLabel(invite.role),
      featureLabels: featureLabels(invite.assignedFeatures),
      joinUrl: inviteLink(invite.token),
      expiresInDays: 7,
    });
    return true;
  } catch (err) {
    console.error('[workspace] invite email failed:', err.message);
    return false;
  }
}

/** Full workspace view: name, my role, members, pending invites, feature registry. */
export const getWorkspace = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  const workspace = await Workspace.findById(req.user.workspaceId);
  if (!workspace) throw ApiError.notFound('Workspace not found');

  const myRole = req.user.workspaceRole || 'owner';
  const canManage = canManageMembers(myRole);
  const members = await getMembers(workspace._id);

  let invites = [];
  if (canManage) {
    invites = await Invite.find({ workspaceId: workspace._id, status: 'pending' }).sort({
      createdAt: -1,
    });
  }

  res.json({
    workspace: {
      id: workspace._id,
      name: workspace.name,
      myRole,
      canManage,
      isOwner: myRole === 'owner',
    },
    // The real, non-hidden feature registry — powers the invite/edit checkboxes.
    features: visibleFeatures(),
    members: members.map((m) => memberJSON(m, req.user._id, workspace.ownerId)),
    invites: invites.map((i) => ({
      id: i._id,
      email: i.email,
      role: i.role,
      assignedFeatures: i.assignedFeatures || [],
      link: inviteLink(i.token),
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    })),
  });
});

export const renameWorkspace = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  if (req.user.workspaceRole !== 'owner') {
    throw ApiError.forbidden('Only the workspace owner can rename it');
  }
  const ws = await Workspace.findByIdAndUpdate(
    req.user.workspaceId,
    { name: req.body.name },
    { new: true },
  );
  res.json({ workspace: { id: ws._id, name: ws.name } });
});

export const createInvite = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  if (!canManageMembers(req.user.workspaceRole)) {
    throw ApiError.forbidden('Only the workspace owner can invite users');
  }
  const email = String(req.body.email || '').toLowerCase();
  const role = req.body.role === 'viewer' ? 'viewer' : 'editor';
  const assignedFeatures = sanitizeFeatures(req.body.assignedFeatures);

  if (email === req.user.email.toLowerCase()) {
    throw ApiError.badRequest('You are already in this workspace');
  }

  // Reject if they're already an active member of THIS workspace.
  const existingMember = await User.findOne({ email, workspaceId: req.user.workspaceId });
  if (existingMember) throw ApiError.conflict('That person is already in this workspace');

  // Reject if there's already a pending invite (owner can resend or revoke it).
  const pending = await Invite.findOne({
    workspaceId: req.user.workspaceId,
    email,
    status: 'pending',
  });
  if (pending) {
    throw ApiError.conflict(
      'There is already a pending invite for this email. Resend or revoke it from the pending list.',
    );
  }

  const invite = await Invite.create({
    workspaceId: req.user.workspaceId,
    email,
    role,
    assignedFeatures,
    token: makeInviteToken(),
    invitedBy: req.user._id,
    expiresAt: inviteExpiry(),
  });

  const ws = await Workspace.findById(req.user.workspaceId);
  const emailed = await fireInviteEmail(invite, {
    inviterName: req.user.name,
    workspaceName: ws?.name,
  });

  res.status(201).json({
    invite: {
      id: invite._id,
      email: invite.email,
      role: invite.role,
      assignedFeatures: invite.assignedFeatures,
      link: inviteLink(invite.token),
      expiresAt: invite.expiresAt,
    },
    emailed,
    message: emailed
      ? `Invite emailed to ${email}.`
      : `Invite created for ${email}. Email isn't configured — share the link instead.`,
  });
});

export const resendInvite = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  if (!canManageMembers(req.user.workspaceRole)) {
    throw ApiError.forbidden('Only the workspace owner can manage invites');
  }
  const invite = await Invite.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
    status: 'pending',
  });
  if (!invite) throw ApiError.notFound('Pending invite not found');

  // Give them a fresh 7-day window on resend.
  invite.expiresAt = inviteExpiry();
  await invite.save();

  const ws = await Workspace.findById(req.user.workspaceId);
  const emailed = await fireInviteEmail(invite, {
    inviterName: req.user.name,
    workspaceName: ws?.name,
  });
  if (!emailed) {
    throw ApiError.serviceUnavailable(
      "Couldn't send the invite email. Email may not be configured — share the link manually.",
    );
  }
  res.json({ success: true, emailed, message: `Invite re-sent to ${invite.email}.` });
});

export const revokeInvite = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  if (!canManageMembers(req.user.workspaceRole)) {
    throw ApiError.forbidden('Only the workspace owner can manage invites');
  }
  const invite = await Invite.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
  });
  if (!invite) throw ApiError.notFound('Invite not found');
  invite.status = 'revoked';
  await invite.save();
  res.json({ success: true });
});

/** Public: preview an invite so the join page can show details pre-login. */
export const inviteInfo = asyncHandler(async (req, res) => {
  const invite = await Invite.findOne({ token: req.params.token });
  if (!invite || invite.status !== 'pending') return res.json({ valid: false });
  if (invite.expiresAt < new Date()) {
    // Lazily flip an expired-but-still-pending invite so its status is truthful.
    invite.status = 'expired';
    await invite.save();
    return res.json({ valid: false, reason: 'expired' });
  }
  const ws = await Workspace.findById(invite.workspaceId);
  res.json({
    valid: Boolean(ws),
    email: invite.email,
    role: invite.role,
    roleLabel: roleLabel(invite.role),
    assignedFeatures: invite.assignedFeatures || [],
    featureLabels: featureLabels(invite.assignedFeatures || []),
    workspaceName: ws?.name || 'a workspace',
  });
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const invite = await Invite.findOne({ token: req.body.token });
  if (!invite || invite.status !== 'pending') {
    throw ApiError.badRequest('This invite is no longer valid');
  }
  if (invite.expiresAt < new Date()) {
    invite.status = 'expired';
    await invite.save();
    throw ApiError.badRequest('This invite has expired');
  }

  if (invite.email !== req.user.email.toLowerCase()) {
    throw ApiError.forbidden(
      `This invite was sent to ${invite.email}. Sign in with that email to accept it.`,
    );
  }

  // Can't jump ship while owning a workspace that has other members.
  await ensureWorkspace(req.user);
  if (req.user.workspaceRole === 'owner') {
    const otherMembers = await User.countDocuments({
      workspaceId: req.user.workspaceId,
      _id: { $ne: req.user._id },
    });
    if (otherMembers > 0) {
      throw ApiError.badRequest(
        'You own a workspace with members. Remove them or transfer ownership before joining another.',
      );
    }
  }
  if (String(req.user.workspaceId) === String(invite.workspaceId)) {
    throw ApiError.badRequest('You are already in this workspace');
  }

  // Join: adopt the workspace, role, and the exact features the owner granted.
  req.user.workspaceId = invite.workspaceId;
  req.user.workspaceRole = invite.role;
  req.user.assignedFeatures = sanitizeFeatures(invite.assignedFeatures);
  await req.user.save();

  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  await invite.save();

  const ws = await Workspace.findById(invite.workspaceId);
  res.json({
    user: await buildSessionPayload(req.user),
    message: `You've joined ${ws?.name || 'the workspace'}.`,
  });
});

export const changeRole = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  if (req.user.workspaceRole !== 'owner') {
    throw ApiError.forbidden('Only the owner can change roles');
  }
  const target = await User.findOne({
    _id: req.params.userId,
    workspaceId: req.user.workspaceId,
  });
  if (!target) throw ApiError.notFound('User not found in this workspace');
  if (String(target._id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot change your own role');
  }
  target.workspaceRole = req.body.role;
  await target.save();
  res.json({ success: true });
});

/** Owner grants/updates the exact features an existing member can access. */
export const updateMemberFeatures = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  if (req.user.workspaceRole !== 'owner') {
    throw ApiError.forbidden('Only the owner can change feature access');
  }
  const target = await User.findOne({
    _id: req.params.userId,
    workspaceId: req.user.workspaceId,
  });
  if (!target) throw ApiError.notFound('User not found in this workspace');
  if (String(target._id) === String(req.user._id)) {
    throw ApiError.badRequest('The owner already has access to every feature');
  }
  target.assignedFeatures = sanitizeFeatures(req.body.assignedFeatures);
  await target.save();
  res.json({ success: true, assignedFeatures: target.assignedFeatures });
});

export const removeMember = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  const isSelf = String(req.params.userId) === String(req.user._id);

  const target = await User.findOne({
    _id: req.params.userId,
    workspaceId: req.user.workspaceId,
  });
  if (!target) throw ApiError.notFound('User not found in this workspace');

  const ws = await Workspace.findById(req.user.workspaceId);
  if (String(target._id) === String(ws.ownerId)) {
    throw ApiError.badRequest('The workspace owner cannot be removed');
  }

  // Members may remove themselves (leave); only the owner may remove others.
  if (!isSelf && !canManageMembers(req.user.workspaceRole)) {
    throw ApiError.forbidden('Only the workspace owner can remove users');
  }

  await moveToOwnWorkspace(target);
  res.json({ success: true, left: isSelf });
});
