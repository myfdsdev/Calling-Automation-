import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { Invite } from '../models/Invite.js';
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
 * Resolve the account that OWNS a user's workspace (and its shared API keys).
 * Members resolve to the workspace owner; owners resolve to themselves. Returns
 * a User document.
 */
export async function getWorkspaceOwner(user) {
  if (!user.workspaceId || user.workspaceRole === 'owner') return user;
  const ws = await Workspace.findById(user.workspaceId);
  if (!ws || String(ws.ownerId) === String(user._id)) return user;
  const owner = await User.findById(ws.ownerId);
  return owner || user;
}

/** Session payload — includes the user's workspace/role for the frontend. */
export async function buildSessionPayload(user) {
  const owner = await getWorkspaceOwner(user);
  const isOwner = String(owner._id) === String(user._id);
  return {
    ...user.toSafeJSON(),
    workspace: {
      id: user.workspaceId || null,
      role: user.workspaceRole || 'owner',
      isOwner,
      ownerName: isOwner ? null : owner.name,
    },
  };
}

/** All members of a workspace (users whose workspaceId points here). */
export async function getMembers(workspaceId) {
  return User.find({ workspaceId }).select('name email workspaceRole createdAt').sort({
    createdAt: 1,
  });
}

/** User ids of everyone in the user's workspace (for shared data scope). */
export async function getWorkspaceMemberIds(user) {
  await ensureWorkspace(user);
  const owner = await getWorkspaceOwner(user);
  const wsId = owner.workspaceId || user.workspaceId;
  const members = await User.find({ workspaceId: wsId }).select('_id');
  const ids = members.map((m) => m._id);
  // Always include the workspace owner even if their workspaceId wasn't backfilled.
  if (!ids.some((id) => String(id) === String(owner._id))) ids.push(owner._id);
  return { ownerId: owner._id, memberIds: ids };
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
 * Resolve the external API keys for a user's workspace. ONLY this workspace's own
 * connected keys are ever used — the platform env keys are never used as a
 * fallback (and never another workspace's key). Returns decrypted keys for
 * immediate use (never stored/logged); empty string when the workspace hasn't
 * connected that key yet.
 */
export async function resolveWorkspaceKeys(user) {
  const ws = await getWorkspaceDoc(user);
  const wsGemini = safeDecrypt(ws?.apiKeys?.gemini?.cipher);
  const wsSerp = safeDecrypt(ws?.apiKeys?.serpapi?.cipher);
  const wsVapi = safeDecrypt(ws?.apiKeys?.vapi?.cipher);
  return {
    geminiKey: wsGemini || '',
    // A model NAME (not a secret) is fine as a default for whichever Gemini key the workspace uses.
    geminiModel: ws?.apiKeys?.gemini?.model || env.gemini.model,
    serpApiKey: wsSerp || '',
    serpHl: env.serpApi.hl, // locale defaults, not credentials
    serpGl: env.serpApi.gl,
    vapiKey: wsVapi || '',
    source: {
      gemini: wsGemini ? 'workspace' : 'none',
      serpapi: wsSerp ? 'workspace' : 'none',
      vapi: wsVapi ? 'workspace' : 'none',
    },
  };
}

/** Resolve just the Vapi key for a user's workspace — the workspace's own key, or empty. */
export async function resolveVapiKey(user) {
  const ws = await getWorkspaceDoc(user);
  return safeDecrypt(ws?.apiKeys?.vapi?.cipher) || '';
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
  };
}

export { Invite };
