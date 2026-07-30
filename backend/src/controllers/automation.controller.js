import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Automation } from '../models/Automation.js';
import { Agent } from '../models/Agent.js';
import { Lead } from '../models/Lead.js';
import * as runner from '../services/automation.service.js';
import * as twilio from '../services/twilio.service.js';
import { env } from '../config/env.js';
import { resolveVapiKey } from '../services/workspace.service.js';

export const createAutomation = asyncHandler(async (req, res) => {
  const { agentId, name, businessCategory, location, leadIds, delayBetweenCalls, maxRetries, callWindow } =
    req.body;

  const agent = await Agent.findOne({ _id: agentId, userId: req.user._id });
  if (!agent) throw ApiError.badRequest('Select a valid agent');
  if (agent.status !== 'active') throw ApiError.badRequest('Activate the agent before starting calls');

  // Only keep the user's own, callable leads.
  const leads = await Lead.find({
    _id: { $in: leadIds },
    userId: req.user._id,
    doNotCall: false,
    phone: { $ne: '' },
  });
  if (!leads.length) throw ApiError.badRequest('None of the selected leads are callable');

  const queue = leads.map((l) => l._id);

  const automation = await Automation.create({
    userId: req.user._id,
    agentId,
    name: name || `${businessCategory || agent.name} — ${new Date().toLocaleDateString()}`,
    businessCategory,
    location,
    queue,
    totalLeads: leads.length,
    selectedLeads: leads.length,
    delayBetweenCalls,
    maxRetries,
    callWindow,
    status: 'draft',
  });

  await Lead.updateMany(
    { _id: { $in: queue } },
    { $set: { callStatus: 'in_queue', agentId, automationId: automation._id } },
  );

  res.status(201).json({ automation });
});

export const listAutomations = asyncHandler(async (req, res) => {
  const automations = await Automation.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .populate('agentId', 'name');
  res.json({ automations });
});

export const getAutomation = asyncHandler(async (req, res) => {
  const automation = await Automation.findOne({ _id: req.params.id, userId: req.user._id }).populate(
    'agentId',
    'name voiceId',
  );
  if (!automation) throw ApiError.notFound('Automation not found');
  res.json({ automation });
});

async function loadOwned(req) {
  const automation = await Automation.findOne({ _id: req.params.id, userId: req.user._id });
  if (!automation) throw ApiError.notFound('Automation not found');
  return automation;
}

export const startAutomation = asyncHandler(async (req, res) => {
  const automation = await loadOwned(req);
  if (['running', 'completed', 'stopped'].includes(automation.status)) {
    throw ApiError.badRequest(`Automation is already ${automation.status}`);
  }

  // Fail fast: don't queue calls we can't actually place.
  if (!env.demoMode) {
    const vapiKey = await resolveVapiKey(req.user);
    if (!vapiKey) {
      throw ApiError.serviceUnavailable(
        'Connect your workspace Vapi key in API Settings before starting an automation.',
      );
    }
    if (!req.user.canCall()) {
      throw ApiError.serviceUnavailable(
        'Connect your Twilio number in API Settings before starting an automation.',
      );
    }
    // A trial Twilio number can't call arbitrary leads — surface a clear upgrade
    // message instead of placing a queue of calls that all fail.
    if (await twilio.refreshUserTrial(req.user._id)) {
      throw ApiError.badRequest(twilio.TRIAL_ACCOUNT_MESSAGE);
    }
  }

  automation.lastError = '';
  await runner.startAutomation(automation);
  res.json({ automation });
});

export const pauseAutomation = asyncHandler(async (req, res) => {
  const automation = await loadOwned(req);
  if (automation.status !== 'running') throw ApiError.badRequest('Automation is not running');
  await runner.pauseAutomation(automation);
  res.json({ automation });
});

export const resumeAutomation = asyncHandler(async (req, res) => {
  const automation = await loadOwned(req);
  if (automation.status !== 'paused') throw ApiError.badRequest('Automation is not paused');
  await runner.resumeAutomation(automation);
  res.json({ automation });
});

export const stopAutomation = asyncHandler(async (req, res) => {
  const automation = await loadOwned(req);
  if (['completed', 'stopped'].includes(automation.status)) {
    throw ApiError.badRequest(`Automation is already ${automation.status}`);
  }
  await runner.stopAutomation(automation);
  res.json({ automation });
});
