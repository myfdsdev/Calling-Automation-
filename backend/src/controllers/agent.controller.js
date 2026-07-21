import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Agent } from '../models/Agent.js';
import { Lead } from '../models/Lead.js';
import * as vapi from '../services/vapi.service.js';
import { generateScript } from '../services/gemini.service.js';
import { assertAgentQuota } from './plan.controller.js';

export const listAgents = asyncHandler(async (req, res) => {
  const agents = await Agent.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ agents });
});

export const getAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ _id: req.params.id, userId: req.user._id });
  if (!agent) throw ApiError.notFound('Agent not found');
  res.json({ agent });
});

export const createAgent = asyncHandler(async (req, res) => {
  // Enforce the plan's agent limit before creating.
  await assertAgentQuota(req.user);

  const agent = await Agent.create({
    ...req.body,
    userId: req.user._id,
    companyName: req.body.companyName || req.user.companyName,
  });

  // Best-effort: create the Vapi assistant and store its id.
  try {
    agent.vapiAssistantId = await vapi.upsertAssistant(agent);
    await agent.save();
  } catch (err) {
    console.warn('[agent] assistant creation skipped:', err.message);
  }

  res.status(201).json({ agent });
});

export const updateAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ _id: req.params.id, userId: req.user._id });
  if (!agent) throw ApiError.notFound('Agent not found');

  Object.assign(agent, req.body);
  try {
    agent.vapiAssistantId = await vapi.upsertAssistant(agent);
  } catch (err) {
    console.warn('[agent] assistant update skipped:', err.message);
  }
  await agent.save();
  res.json({ agent });
});

export const deleteAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!agent) throw ApiError.notFound('Agent not found');

  await vapi.deleteAssistant(agent.vapiAssistantId);
  await Lead.updateMany({ agentId: agent._id }, { $set: { agentId: null } });
  res.json({ success: true });
});

export const testAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ _id: req.params.id, userId: req.user._id });
  if (!agent) throw ApiError.notFound('Agent not found');

  // A "test" returns the compiled system prompt + opening line so the user can
  // preview exactly what the agent will say without placing a real call.
  res.json({
    preview: {
      openingMessage: agent.openingMessage,
      systemPrompt: vapi.buildSystemPrompt(agent),
      voiceId: agent.voiceId,
      language: agent.language,
    },
  });
});

export const generateAgentScript = asyncHandler(async (req, res) => {
  const script = await generateScript(req.body);
  res.json({ script });
});
