import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Lead } from '../models/Lead.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { findLeads } from '../services/leadProvider.service.js';
import { scoreLeads } from '../services/gemini.service.js';
import { isValidPhone, normalizePhone } from '../utils/phone.js';
import { getBillingAccount, resolveWorkspaceKeys } from '../services/workspace.service.js';

const dedupeKey = (l) =>
  `${(l.businessName || '').toLowerCase().trim()}|${(l.phone || '').replace(/\D/g, '')}`;

/* -------------------- Search + persist + score ------------------- */
export const searchLeads = asyncHandler(async (req, res) => {
  const q = req.body;
  const user = req.user;
  // Credits are billed to the workspace owner (members spend the owner's pool).
  const billing = await getBillingAccount(user);

  if (billing.leadCredits < q.limit) {
    throw ApiError.badRequest(
      `Not enough lead credits. The workspace has ${billing.leadCredits}, this search needs ${q.limit}.`,
    );
  }

  const location = [q.city, q.state, q.country].filter(Boolean).join(', ');

  // This workspace's own API keys (falls back to platform keys).
  const wsKeys = await resolveWorkspaceKeys(user);

  let raw = await findLeads(q, { apiKey: wsKeys.serpApiKey, hl: wsKeys.serpHl, gl: wsKeys.serpGl });

  // Apply hard filters requested by the user.
  raw = raw.filter((l) => {
    if (q.mustHavePhone && !l.phone) return false;
    if (q.mustHaveWebsite && !l.website) return false;
    if (q.minRating && (l.rating || 0) < q.minRating) return false;
    if (q.minReviews && (l.reviewCount || 0) < q.minReviews) return false;
    if (l.phone && !isValidPhone(l.phone)) return false;
    return true;
  });

  // Suppression: existing do-not-call and (optionally) already-called businesses.
  const keys = raw.map(dedupeKey);
  const existing = await Lead.find({
    userId: user._id,
    dedupeKey: { $in: keys },
  }).select('dedupeKey doNotCall callStatus');
  const existingMap = new Map(existing.map((e) => [e.dedupeKey, e]));

  const fresh = [];
  for (const l of raw) {
    const key = dedupeKey(l);
    const prior = existingMap.get(key);
    if (prior?.doNotCall) continue; // opted-out suppression
    if (q.excludeCalled && prior && prior.callStatus === 'completed') continue;
    if (existingMap.has(key)) continue; // duplicate — already in the user's list
    fresh.push({ ...l, dedupeKey: key });
    existingMap.set(key, true); // avoid in-batch dupes
  }

  if (!fresh.length) {
    return res.json({
      leads: [],
      message: 'No new leads matched your filters. Try widening the criteria.',
      creditsRemaining: billing.leadCredits,
    });
  }

  // Score before saving (uses the workspace's Gemini key).
  const scores = await scoreLeads(
    fresh,
    { category: q.businessCategory, location },
    { apiKey: wsKeys.geminiKey, model: wsKeys.geminiModel },
  );
  const docs = fresh.map((l, i) => ({
    ...l,
    userId: user._id,
    agentId: q.agentId || null,
    category: q.businessCategory,
    leadScore: scores[i].score,
    scoreReason: scores[i].reason,
    callStatus: 'new',
  }));

  const created = await Lead.insertMany(docs);

  // Consume credits from the workspace owner by the number actually stored.
  const updated = await User.findByIdAndUpdate(
    billing._id,
    { $inc: { leadCredits: -created.length } },
    { new: true },
  );

  res.status(201).json({
    leads: created,
    creditsRemaining: updated.leadCredits,
    scoreSource: scores[0]?.source || 'fallback',
  });
});

/* ---------------------- Manually add a lead ---------------------- */
export const createLead = asyncHandler(async (req, res) => {
  const body = req.body;

  const phone = normalizePhone(body.phone);
  if (!isValidPhone(phone)) {
    throw ApiError.badRequest(
      'Enter a valid phone number in international format, e.g. +14155550123',
    );
  }

  const key = dedupeKey({ businessName: body.businessName, phone });
  const existing = await Lead.findOne({ userId: req.user._id, dedupeKey: key });
  if (existing) {
    throw ApiError.conflict('You already have a lead with this business name and phone number');
  }

  if (body.agentId) {
    const agent = await Agent.findOne({ _id: body.agentId, userId: req.user._id });
    if (!agent) throw ApiError.badRequest('Select a valid agent');
  }

  const [score] = await scoreLeads([{ ...body, phone }], { category: body.category });

  // Manual leads don't consume lead credits — they didn't come from the provider.
  const lead = await Lead.create({
    ...body,
    phone,
    userId: req.user._id,
    agentId: body.agentId || null,
    dedupeKey: key,
    source: 'manual',
    leadScore: score.score,
    scoreReason: score.reason,
    // Ready to call straight away.
    selectionStatus: 'selected',
    callStatus: 'selected',
  });

  res.status(201).json({ lead });
});

/* -------------------------- Re-score ----------------------------- */
export const scoreExistingLeads = asyncHandler(async (req, res) => {
  const leads = await Lead.find({ _id: { $in: req.body.leadIds }, userId: req.user._id });
  if (!leads.length) throw ApiError.notFound('No matching leads found');

  const keys = await resolveWorkspaceKeys(req.user);
  const scores = await scoreLeads(leads, {}, { apiKey: keys.geminiKey, model: keys.geminiModel });
  await Promise.all(
    leads.map((lead, i) => {
      lead.leadScore = scores[i].score;
      lead.scoreReason = scores[i].reason;
      return lead.save();
    }),
  );
  res.json({ leads, scoreSource: scores[0]?.source || 'fallback' });
});

/* ---------------------- Auto-select best ------------------------- */
export const selectBestLeads = asyncHandler(async (req, res) => {
  const { count } = req.body;
  const scope = req.body.leadIds?.length
    ? { _id: { $in: req.body.leadIds }, userId: req.user._id }
    : { userId: req.user._id, callStatus: { $in: ['new', 'selected'] } };

  const candidates = await Lead.find({
    ...scope,
    doNotCall: false,
    phone: { $ne: '' },
  }).sort({ leadScore: -1, reviewCount: -1 });

  const chosen = candidates.slice(0, count);
  const chosenIds = chosen.map((l) => l._id);

  await Lead.updateMany(
    { _id: { $in: chosenIds } },
    { $set: { selectionStatus: 'selected', callStatus: 'selected' } },
  );

  const updated = await Lead.find({ _id: { $in: chosenIds } }).sort({ leadScore: -1 });
  res.json({ selected: updated, selectedCount: updated.length });
});

/* ---------------------------- CRUD ------------------------------- */
export const listLeads = asyncHandler(async (req, res) => {
  const { search, callStatus, callResult, agentId, city } = req.query;
  const filter = { userId: req.user._id };
  if (search) filter.businessName = { $regex: search, $options: 'i' };
  if (callStatus) filter.callStatus = callStatus;
  if (callResult) filter.callResult = callResult;
  if (agentId) filter.agentId = agentId;
  if (city) filter.city = { $regex: city, $options: 'i' };

  const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(500).populate('agentId', 'name');

  const [total, notCalled, interested, notInterested] = await Promise.all([
    Lead.countDocuments({ userId: req.user._id }),
    Lead.countDocuments({ userId: req.user._id, callStatus: { $in: ['new', 'selected', 'in_queue'] } }),
    Lead.countDocuments({ userId: req.user._id, callResult: 'interested' }),
    Lead.countDocuments({ userId: req.user._id, callResult: 'not_interested' }),
  ]);

  res.json({ leads, stats: { total, notCalled, interested, notInterested } });
});

export const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id }).populate(
    'agentId',
    'name voiceId',
  );
  if (!lead) throw ApiError.notFound('Lead not found');
  res.json({ lead });
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id });
  if (!lead) throw ApiError.notFound('Lead not found');

  const body = req.body;
  if (body.doNotCall === true) {
    body.callStatus = 'do_not_call';
    body.selectionStatus = 'removed';
  }
  Object.assign(lead, body);
  await lead.save();
  res.json({ lead });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!lead) throw ApiError.notFound('Lead not found');
  res.json({ success: true });
});
