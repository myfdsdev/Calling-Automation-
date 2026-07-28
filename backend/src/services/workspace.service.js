import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Invite } from '../models/Invite.js';
import { getPlan } from '../config/plans.js';
import { env } from '../config/env.js';
import { decryptSecret } from '../utils/crypto.js';

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

/* --------------------- Per-workspace API keys -------------------- */

const safeDecrypt = (cipher) => {
  try {
    return cipher ? decryptSecret(cipher) : '';
  } catch {
    return '';
  }
};

/** Load the workspace document the user belongs to (creating one if needed). */
export async function getWorkspaceDoc(user) {
  await ensureWorkspace(user);
  return Workspace.findById(user.workspaceId);
}

/**
 * Resolve the external API keys for a user's workspace. Uses THIS workspace's own
 * key when connected, otherwise the platform key from env — never another
 * workspace's key. Returns decrypted keys for immediate use (never stored/logged).
 */
export async function resolveWorkspaceKeys(user) {
  const ws = await getWorkspaceDoc(user);
  const wsGemini = safeDecrypt(ws?.apiKeys?.gemini?.cipher);
  const wsSerp = safeDecrypt(ws?.apiKeys?.serpapi?.cipher);
  const wsVapi = safeDecrypt(ws?.apiKeys?.vapi?.cipher);
  return {
    geminiKey: wsGemini || env.gemini.apiKey || '',
    geminiModel: ws?.apiKeys?.gemini?.model || env.gemini.model,
    serpApiKey: wsSerp || env.serpApi.apiKey || '',
    serpHl: env.serpApi.hl,
    serpGl: env.serpApi.gl,
    vapiKey: wsVapi || env.vapi.privateKey || '',
    source: {
      gemini: wsGemini ? 'workspace' : env.gemini.apiKey ? 'platform' : 'none',
      serpapi: wsSerp ? 'workspace' : env.serpApi.apiKey ? 'platform' : 'none',
      vapi: wsVapi ? 'workspace' : env.vapi.privateKey ? 'platform' : 'none',
    },
  };
}

/** Resolve just the Vapi key for a user's workspace (own key or platform fallback). */
export async function resolveVapiKey(user) {
  const ws = await getWorkspaceDoc(user);
  return safeDecrypt(ws?.apiKeys?.vapi?.cipher) || env.vapi.privateKey || '';
}

/** Display-only status for the API-keys settings screen (no secrets). */
export function apiKeysStatus(ws) {
  const g = ws?.apiKeys?.gemini || {};
  const s = ws?.apiKeys?.serpapi || {};
  const v = ws?.apiKeys?.vapi || {};
  return {
    gemini: {
      connected: Boolean(g.cipher),
      last4: g.last4 || '',
      model: g.model || '',
      connectedAt: g.connectedAt || null,
    },
    serpapi: {
      connected: Boolean(s.cipher),
      last4: s.last4 || '',
      connectedAt: s.connectedAt || null,
    },
    vapi: {
      connected: Boolean(v.cipher),
      last4: v.last4 || '',
      connectedAt: v.connectedAt || null,
    },
    // Whether a platform key exists as a fallback when the workspace hasn't set one.
    platformFallback: {
      gemini: Boolean(env.gemini.apiKey),
      serpapi: Boolean(env.serpApi.apiKey),
      vapi: Boolean(env.vapi.privateKey),
    },
  };
}

export { Invite };
