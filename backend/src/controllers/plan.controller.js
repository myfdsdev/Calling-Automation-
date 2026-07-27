import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { PLANS, getPlan, PLAN_MAP } from '../config/plans.js';
import { getBillingAccount, getWorkspaceMemberIds } from '../services/workspace.service.js';

/** Public catalog + (when authenticated) the workspace's plan, usage & permission. */
export const listPlans = asyncHandler(async (req, res) => {
  let current = 'free';
  let usage = null;
  let canManage = true;
  if (req.user) {
    // Plan & credits belong to the workspace owner.
    const billing = await getBillingAccount(req.user);
    current = billing.plan || 'free';
    canManage = String(billing._id) === String(req.user._id); // only the owner
    const { memberIds } = await getWorkspaceMemberIds(req.user);
    const agentCount = await Agent.countDocuments({ userId: { $in: memberIds } });
    usage = {
      agents: agentCount,
      leadCredits: billing.leadCredits,
      callingMinutes: billing.callingMinutes,
    };
  }
  res.json({ plans: PLANS, currentPlan: current, usage, canManage });
});

/**
 * Activate a plan. NOTE: no payment is processed — this is a demo activation that
 * applies the plan's credit/minute allotment. Real billing would gate this behind
 * a payment provider (e.g. Stripe checkout) before granting the allotment.
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

  // Downgrading below the workspace's current agent count is blocked.
  if (plan.maxAgents != null) {
    const { memberIds } = await getWorkspaceMemberIds(user);
    const agentCount = await Agent.countDocuments({ userId: { $in: memberIds } });
    if (agentCount > plan.maxAgents) {
      throw ApiError.badRequest(
        `Your workspace has ${agentCount} agents. Delete ${agentCount - plan.maxAgents} to switch to ${plan.name} (limit ${plan.maxAgents}).`,
      );
    }
  }

  user.plan = plan.id;
  user.planActivatedAt = new Date();
  // Fresh allotment for the new plan (demo billing cycle).
  user.leadCredits = plan.leadCredits;
  user.callingMinutes = plan.callingMinutes;
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
