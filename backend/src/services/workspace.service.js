import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Invite } from '../models/Invite.js';
import { getPlan } from '../config/plans.js';
import { env } from '../config/env.js';

const INVITE_TTL_DAYS = 14;

/** Create a personal workspace for a user who doesn't have one yet. */
export async function ensureWorkspace(user) {
  if (user.workspaceId) return user.workspaceId;
  const ws = await Workspace.create({
    name: user.companyName?.trim() || `${user.name}'s workspace`,
    ownerId: user._id,
  });
  user.workspaceId = ws._id;
  user.workspaceRole = 'owner';
  await user.save();
  return ws._id;
}

/**
 * Resolve the account that should be BILLED for a user's actions (lead credits,
 * calling minutes, plan limits). Members bill the workspace owner; owners bill
 * themselves. Returns a User document.
 */
export async function getBillingAccount(user) {
  if (!user.workspaceId || user.workspaceRole === 'owner') return user;
  const ws = await Workspace.findById(user.workspaceId);
  if (!ws || String(ws.ownerId) === String(user._id)) return user;
  const owner = await User.findById(ws.ownerId);
  return owner || user;
}

/** Session payload — credits/plan reflect the billing owner (what the user spends). */
export async function buildSessionPayload(user) {
  const billing = await getBillingAccount(user);
  const isOwner = String(billing._id) === String(user._id);
  const plan = getPlan(billing.plan);
  return {
    ...user.toSafeJSON(),
    // Override with the billing owner's shared pool.
    leadCredits: billing.leadCredits,
    callingMinutes: billing.callingMinutes,
    plan: { id: plan.id, name: plan.name, maxAgents: plan.maxAgents },
    workspace: {
      id: user.workspaceId || null,
      role: user.workspaceRole || 'owner',
      isOwner,
      ownerName: isOwner ? null : billing.name,
    },
  };
}

/** All members of a workspace (users whose workspaceId points here). */
export async function getMembers(workspaceId) {
  return User.find({ workspaceId }).select('name email workspaceRole createdAt').sort({
    createdAt: 1,
  });
}

/** User ids of everyone in the billing account's workspace (for shared limits). */
export async function getWorkspaceMemberIds(user) {
  await ensureWorkspace(user);
  const billing = await getBillingAccount(user);
  const wsId = billing.workspaceId || user.workspaceId;
  const members = await User.find({ workspaceId: wsId }).select('_id');
  const ids = members.map((m) => m._id);
  // Always include the billing owner even if their workspaceId wasn't backfilled.
  if (!ids.some((id) => String(id) === String(billing._id))) ids.push(billing._id);
  return { ownerId: billing._id, memberIds: ids };
}

export const canManageMembers = (role) => role === 'owner' || role === 'admin';

export function makeInviteToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function inviteLink(token) {
  const base = (env.clientUrls?.[0] || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/accept-invite?token=${token}`;
}

export function inviteExpiry() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Move a user out to their own fresh personal workspace (used on remove/leave). */
export async function moveToOwnWorkspace(user) {
  const ws = await Workspace.create({
    name: user.companyName?.trim() || `${user.name}'s workspace`,
    ownerId: user._id,
  });
  user.workspaceId = ws._id;
  user.workspaceRole = 'owner';
  await user.save();
  return ws;
}

export { Invite };
