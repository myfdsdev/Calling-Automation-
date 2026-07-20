import { asyncHandler } from '../utils/asyncHandler.js';
import { Agent } from '../models/Agent.js';
import { Lead } from '../models/Lead.js';
import { Call } from '../models/Call.js';
import { Automation } from '../models/Automation.js';

export const getStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [totalAgents, leadsFound, callsCompleted, interestedLeads] = await Promise.all([
    Agent.countDocuments({ userId }),
    Lead.countDocuments({ userId }),
    Call.countDocuments({ userId, status: 'completed' }),
    Lead.countDocuments({ userId, callResult: 'interested' }),
  ]);
  res.json({ stats: { totalAgents, leadsFound, callsCompleted, interestedLeads } });
});

export const getRecentLeads = asyncHandler(async (req, res) => {
  const leads = await Lead.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('businessName phone city state leadScore callStatus');
  res.json({ leads });
});

export const getRecentCalls = asyncHandler(async (req, res) => {
  const calls = await Call.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('leadId', 'businessName')
    .populate('agentId', 'name')
    .select('leadId agentId duration result createdAt status');
  res.json({ calls });
});

export const getActiveAutomation = asyncHandler(async (req, res) => {
  const automation = await Automation.findOne({
    userId: req.user._id,
    status: { $in: ['running', 'paused'] },
  })
    .sort({ startedAt: -1 })
    .populate('agentId', 'name');

  if (!automation) {
    // Fall back to the most recent automation so the card can still show history.
    const last = await Automation.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('agentId', 'name');
    return res.json({ automation: last });
  }
  res.json({ automation });
});
