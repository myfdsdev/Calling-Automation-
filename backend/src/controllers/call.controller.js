import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Call } from '../models/Call.js';
import { Lead } from '../models/Lead.js';
import { Agent } from '../models/Agent.js';
import * as runner from '../services/automation.service.js';
import { startOfToday } from '../utils/dates.js';
import { env } from '../config/env.js';
import { resolveVapiKey } from '../services/workspace.service.js';

export const listCalls = asyncHandler(async (req, res) => {
  const { status, result, agentId, leadId } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (result) filter.result = result;
  if (agentId) filter.agentId = agentId;
  if (leadId) filter.leadId = leadId;

  const calls = await Call.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .populate('leadId', 'businessName phone city state')
    .populate('agentId', 'name');

  const today = startOfToday();
  const [callsToday, connected, interested, durationAgg] = await Promise.all([
    Call.countDocuments({ userId: req.user._id, createdAt: { $gte: today } }),
    Call.countDocuments({ userId: req.user._id, status: 'completed' }),
    Call.countDocuments({ userId: req.user._id, result: 'interested' }),
    Call.aggregate([
      { $match: { userId: req.user._id, duration: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]),
  ]);

  res.json({
    calls,
    stats: {
      callsToday,
      connected,
      interested,
      avgDuration: Math.round(durationAgg[0]?.avg || 0),
    },
  });
});

export const getCall = asyncHandler(async (req, res) => {
  const call = await Call.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('leadId', 'businessName phone city state website')
    .populate('agentId', 'name voiceId');
  if (!call) throw ApiError.notFound('Call not found');
  res.json({ call });
});

export const startLeadCall = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.leadId, userId: req.user._id });
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.doNotCall) throw ApiError.badRequest('This lead is marked Do Not Call');
  if (!lead.phone) throw ApiError.badRequest('This lead has no phone number');

  if (!env.demoMode) {
    if (!(await resolveVapiKey(req.user))) {
      throw ApiError.serviceUnavailable(
        'Connect your workspace Vapi key in API Settings before placing calls.',
      );
    }
    if (!req.user.canCall()) {
      throw ApiError.serviceUnavailable(
        'Connect your Twilio number in API Settings before placing calls.',
      );
    }
  }

  const agentId = req.body?.agentId || lead.agentId;
  const agent = await Agent.findOne({ _id: agentId, userId: req.user._id });
  if (!agent) throw ApiError.badRequest('Assign an agent to this lead first');
  if (agent.status !== 'active') throw ApiError.badRequest('Activate the agent before calling');

  const call = await runner.startSingleCall({ user: req.user, lead, agent });
  res.status(201).json({ call });
});
