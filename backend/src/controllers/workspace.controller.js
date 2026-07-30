import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Invite } from '../models/Invite.js';
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
import { assertMemberQuota } from './plan.controller.js';

function memberJSON(u, meId, ownerId) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.workspaceRole,
    isYou: String(u._id) === String(meId),
    isOwner: String(u._id) === String(ownerId),
    joinedAt: u.createdAt,
  };
}

/** Full workspace view: name, my role, members, and (for managers) pending invites. */
export const getWorkspace = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  const workspace = await Workspace.findById(req.user.workspaceId);
  if (!workspace) throw ApiError.notFound('Workspace not found');

  const myRole = req.user.workspaceRole || 'owner';
  const members = await getMembers(workspace._id);

  let invites = [];
  if (canManageMembers(myRole)) {
    invites = await Invite.find({ workspaceId: workspace._id, status: 'pending' }).sort({
      createdAt: -1,
    });
  }

  res.json({
    workspace: {
      id: workspace._id,
      name: workspace.name,
      myRole,
      canManage: canManageMembers(myRole),
      isOwner: myRole === 'owner',
    },
    members: members.map((m) => memberJSON(m, req.user._id, workspace.ownerId)),
    invites: invites.map((i) => ({
      id: i._id,
      email: i.email,
      role: i.role,
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
    throw ApiError.forbidden('You do not have permission to invite members');
  }
  // Enforce the plan's team-seat limit (members + pending invites).
  await assertMemberQuota(req.user);
  const { email, role } = req.body;

  if (email === req.user.email.toLowerCase()) {
    throw ApiError.badRequest('You are already in this workspace');
  }
  // Admins can only invite regular members.
  const finalRole = req.user.workspaceRole === 'admin' ? 'member' : role;

  // Already a member of THIS workspace?
  const existingMember = await User.findOne({ email, workspaceId: req.user.workspaceId });
  if (existingMember) throw ApiError.conflict('That person is already in this workspace');

  // Replace any prior pending invite for the same email in this workspace.
  await Invite.updateMany(
    { workspaceId: req.user.workspaceId, email, status: 'pending' },
    { $set: { status: 'revoked' } },
  );

  const invite = await Invite.create({
    workspaceId: req.user.workspaceId,
    email,
    role: finalRole,
    token: makeInviteToken(),
    invitedBy: req.user._id,
    expiresAt: inviteExpiry(),
  });

  res.status(201).json({
    invite: {
      id: invite._id,
      email: invite.email,
      role: invite.role,
      link: inviteLink(invite.token),
      expiresAt: invite.expiresAt,
    },
    message: `Invite created for ${email}. Share the link to add them.`,
  });
});

export const revokeInvite = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  if (!canManageMembers(req.user.workspaceRole)) {
    throw ApiError.forbidden('You do not have permission to manage invites');
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

/** Public: preview an invite so the accept page can show details pre-login. */
export const inviteInfo = asyncHandler(async (req, res) => {
  const invite = await Invite.findOne({ token: req.params.token });
  if (!invite || invite.status !== 'pending' || invite.expiresAt < new Date()) {
    return res.json({ valid: false });
  }
  const ws = await Workspace.findById(invite.workspaceId);
  res.json({
    valid: Boolean(ws),
    email: invite.email,
    role: invite.role,
    workspaceName: ws?.name || 'a workspace',
  });
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const invite = await Invite.findOne({ token: req.body.token });
  if (!invite || invite.status !== 'pending') {
    throw ApiError.badRequest('This invite is no longer valid');
  }
  if (invite.expiresAt < new Date()) throw ApiError.badRequest('This invite has expired');

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

  req.user.workspaceId = invite.workspaceId;
  req.user.workspaceRole = invite.role;
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
  if (!target) throw ApiError.notFound('Member not found in this workspace');
  if (String(target._id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot change your own role');
  }
  target.workspaceRole = req.body.role;
  await target.save();
  res.json({ success: true });
});

export const removeMember = asyncHandler(async (req, res) => {
  await ensureWorkspace(req.user);
  const isSelf = String(req.params.userId) === String(req.user._id);

  const target = await User.findOne({
    _id: req.params.userId,
    workspaceId: req.user.workspaceId,
  });
  if (!target) throw ApiError.notFound('Member not found in this workspace');

  if (String(target._id) === String((await Workspace.findById(req.user.workspaceId)).ownerId)) {
    throw ApiError.badRequest('The workspace owner cannot be removed');
  }

  // Members may remove themselves (leave); managers may remove others.
  if (!isSelf && !canManageMembers(req.user.workspaceRole)) {
    throw ApiError.forbidden('You do not have permission to remove members');
  }
  // Admins can't remove other admins.
  if (!isSelf && req.user.workspaceRole === 'admin' && target.workspaceRole === 'admin') {
    throw ApiError.forbidden('Admins can only remove members');
  }

  await moveToOwnWorkspace(target);
  res.json({ success: true, left: isSelf });
});
