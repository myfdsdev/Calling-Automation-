import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { Invite } from '../models/Invite.js';
import { PLANS, getPlan, PLAN_MAP } from '../config/plans.js';
import { getBillingAccount, getWorkspaceMemberIds } from '../services/workspace.service.js';

/** Public catalog + (when authenticated) the workspace's plan, usage & permission. */
export const listPlans = asyncHandler(async (req, res) => {
  let current = 'free';
  let usage = null;
  let canManage = true;
  if (req.user) {
    // Plan belongs to the workspace owner (the billing account).
    const billing = await getBillingAccount(req.user);
    current = billing.plan || 'free';
    canManage = String(billing._id) === String(req.user._id); // only the owner
    const { memberIds } = await getWorkspaceMemberIds(req.user);
    const agentCount = await Agent.countDocuments({ userId: { $in: memberIds } });
    usage = {
      agents: agentCount,
      members: memberIds.length,
    };
  }
  res.json({ plans: PLANS, currentPlan: current, usage, canManage });
});

/**
 * Activate a plan (flat platform fee). NOTE: no payment is processed — this is a
 * demo activation. Real billing would gate this behind a payment provider
 * (e.g. Stripe checkout) before switching the plan.
 */
export const subscribe = asyncHandler(async (req, res) => {
  const plan = PLAN_MAP[req.params.planId];
  if (!plan) throw ApiError.notFound('Unknown plan');

  // Only the workspace owner can change the plan.
  const billing = await getBillingAccount(req.user);
  if (String(billing._id) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the workspace owner can change the plan.');
  }
  const user = await User.findById(req.user._id);
  const { memberIds } = await getWorkspaceMemberIds(user);

  // Downgrading below the workspace's current usage is blocked.
  if (plan.maxAgents != null) {
    const agentCount = await Agent.countDocuments({ userId: { $in: memberIds } });
    if (agentCount > plan.maxAgents) {
      throw ApiError.badRequest(
        `Your workspace has ${agentCount} agents. Delete ${agentCount - plan.maxAgents} to switch to ${plan.name} (limit ${plan.maxAgents}).`,
      );
    }
  }
  if (plan.maxMembers != null && memberIds.length > plan.maxMembers) {
    throw ApiError.badRequest(
      `Your workspace has ${memberIds.length} members. Remove ${memberIds.length - plan.maxMembers} to switch to ${plan.name} (limit ${plan.maxMembers}).`,
    );
  }

  user.plan = plan.id;
  user.planActivatedAt = new Date();
  await user.save();

  res.json({
    user: user.toSafeJSON(),
    message:
      plan.price > 0
        ? `${plan.name} activated (demo — no payment was charged)`
        : `Switched to the ${plan.name} plan`,
  });
});

/** Shared limit check used when creating agents — counts the whole workspace. */
export async function assertAgentQuota(user) {
  const billing = await getBillingAccount(user);
  const plan = getPlan(billing.plan);
  if (plan.maxAgents == null) return; // unlimited
  const { memberIds } = await getWorkspaceMemberIds(user);
  const count = await Agent.countDocuments({ userId: { $in: memberIds } });
  if (count >= plan.maxAgents) {
    throw ApiError.forbidden(
      `Your ${plan.name} plan allows ${plan.maxAgents} agent${plan.maxAgents > 1 ? 's' : ''} across the workspace. Ask the owner to upgrade to add more.`,
    );
  }
}

/** Shared limit check used when inviting members — counts members + pending invites. */
export async function assertMemberQuota(user) {
  const billing = await getBillingAccount(user);
  const plan = getPlan(billing.plan);
  if (plan.maxMembers == null) return; // unlimited
  const { memberIds } = await getWorkspaceMemberIds(user);
  const pending = await Invite.countDocuments({
    workspaceId: user.workspaceId,
    status: 'pending',
  });
  if (memberIds.length + pending >= plan.maxMembers) {
    throw ApiError.forbidden(
      `Your ${plan.name} plan allows ${plan.maxMembers} workspace member${plan.maxMembers > 1 ? 's' : ''} (including you). Upgrade to invite more.`,
    );
  }
}
