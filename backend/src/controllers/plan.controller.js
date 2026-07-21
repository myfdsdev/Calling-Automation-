import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { PLANS, getPlan, PLAN_MAP } from '../config/plans.js';

/** Public catalog + (when authenticated) which plan is current + usage. */
export const listPlans = asyncHandler(async (req, res) => {
  let current = 'free';
  let usage = null;
  if (req.user) {
    current = req.user.plan || 'free';
    const agentCount = await Agent.countDocuments({ userId: req.user._id });
    usage = {
      agents: agentCount,
      leadCredits: req.user.leadCredits,
      callingMinutes: req.user.callingMinutes,
    };
  }
  res.json({ plans: PLANS, currentPlan: current, usage });
});

/**
 * Activate a plan. NOTE: no payment is processed — this is a demo activation that
 * applies the plan's credit/minute allotment. Real billing would gate this behind
 * a payment provider (e.g. Stripe checkout) before granting the allotment.
 */
export const subscribe = asyncHandler(async (req, res) => {
  const plan = PLAN_MAP[req.params.planId];
  if (!plan) throw ApiError.notFound('Unknown plan');

  const user = await User.findById(req.user._id);

  // Downgrading below your current agent count is blocked to avoid orphaning agents.
  if (plan.maxAgents != null) {
    const agentCount = await Agent.countDocuments({ userId: user._id });
    if (agentCount > plan.maxAgents) {
      throw ApiError.badRequest(
        `You have ${agentCount} agents. Delete ${agentCount - plan.maxAgents} to switch to ${plan.name} (limit ${plan.maxAgents}).`,
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

/** Shared limit check used when creating agents. */
export async function assertAgentQuota(user) {
  const plan = getPlan(user.plan);
  if (plan.maxAgents == null) return; // unlimited
  const count = await Agent.countDocuments({ userId: user._id });
  if (count >= plan.maxAgents) {
    throw ApiError.forbidden(
      `Your ${plan.name} plan allows ${plan.maxAgents} agent${plan.maxAgents > 1 ? 's' : ''}. Upgrade your plan to add more.`,
    );
  }
}
