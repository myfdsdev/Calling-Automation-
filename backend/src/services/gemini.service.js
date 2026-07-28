import axios from 'axios';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Verify a Gemini key works. Throws ApiError.badRequest if it's rejected. */
export async function testGeminiKey(apiKey, model) {
  try {
    await axios.post(
      GEMINI_URL(model || env.gemini.model),
      { contents: [{ parts: [{ text: 'ping' }] }] },
      { params: { key: apiKey }, timeout: 15000 },
    );
    return true;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message;
    if (status === 400 || status === 403 || status === 401) {
      throw ApiError.badRequest(`Gemini rejected that key${msg ? `: ${msg}` : ''}`);
    }
    throw ApiError.badRequest(`Could not verify the Gemini key: ${msg || err.message}`);
  }
}

/**
 * Low-level Gemini call that asks for JSON and parses it. Returns null on any failure.
 * `creds.apiKey` is the workspace's own key (falls back to the platform env key).
 */
async function askGeminiJson(prompt, { apiKey, model } = {}) {
  // Only the workspace's own Gemini key is used — never the platform key. With no
  // workspace key, callers transparently fall back to their non-AI heuristic.
  const key = apiKey;
  const mdl = model || env.gemini.model; // model name only, not a key
  if (!key) return null;
  try {
    const { data } = await axios.post(
      GEMINI_URL(mdl),
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
      },
      {
        params: { key },
        timeout: 20000,
        headers: { 'Content-Type': 'application/json' },
      },
    );
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.warn('[gemini] request failed, using fallback:', err.message);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Script generation                                                   */
/* ------------------------------------------------------------------ */

const scriptSchema = z.object({
  openingMessage: z.string(),
  introduction: z.string(),
  qualificationQuestions: z.array(z.string()),
  objectionInstructions: z.string(),
  closingMessage: z.string(),
});

export async function generateScript(input, creds = {}) {
  const { companyName, serviceName, businessLocation, callGoal, targetCustomer, offerDescription } =
    input;

  const prompt = `You are an expert cold-calling script writer. Write a concise, polite,
professional outbound calling script for an AI voice agent. Return ONLY JSON matching:
{
 "openingMessage": string,
 "introduction": string,
 "qualificationQuestions": string[3],
 "objectionInstructions": string,
 "closingMessage": string
}
Context:
- Company: ${companyName || 'our company'}
- Service / business type: ${serviceName || 'our service'}
${businessLocation ? `- Business location: ${businessLocation}` : ''}
- Goal of the call: ${callGoal || 'book a short consultation'}
- Target customer: ${targetCustomer || 'local business owners'}
- Offer: ${offerDescription || 'a helpful service'}
Rules: introduce clearly, never make false promises, stop if not interested, respect opt-outs.`;

  const raw = await askGeminiJson(prompt, creds);
  const parsed = raw && scriptSchema.safeParse(raw);
  if (parsed && parsed.success) return { ...parsed.data, source: 'gemini' };

  return { ...fallbackScript(input), source: 'fallback' };
}

function fallbackScript({ companyName, serviceName, callGoal, targetCustomer, offerDescription }) {
  const co = companyName || 'our company';
  const svc = serviceName || 'our service';
  return {
    openingMessage: `Hi, this is an assistant calling on behalf of ${co}. Do you have a quick moment?`,
    introduction: `I'm reaching out to ${targetCustomer || 'local businesses'} about ${svc}. ${
      offerDescription || `We help businesses like yours get better results.`
    }`,
    qualificationQuestions: [
      'Are you currently looking for more customers?',
      'Who currently handles this for your business?',
      'Would you be open to a short 10-minute consultation this week?',
    ],
    objectionInstructions:
      'If they say they are busy, offer to call back at a better time. If they say they are not interested, thank them politely and end the call. Never pressure the person or make guarantees.',
    closingMessage: `Thanks so much for your time. The goal today was to ${
      callGoal || 'set up a short consultation'
    }. Have a great day!`,
  };
}

/* ------------------------------------------------------------------ */
/* Lead scoring                                                        */
/* ------------------------------------------------------------------ */

const leadScoreItem = z.object({
  index: z.number(),
  score: z.number().min(0).max(100),
  reason: z.string(),
});

/**
 * Score an array of lead-like objects 0–100. Uses Gemini when available, otherwise
 * a transparent deterministic heuristic. Returns [{ score, reason }] aligned by index.
 */
export async function scoreLeads(leads, context = {}, creds = {}) {
  const heuristic = leads.map((l) => heuristicScore(l, context));

  if (creds.apiKey && leads.length) {
    const compact = leads.map((l, i) => ({
      index: i,
      businessName: l.businessName,
      hasPhone: Boolean(l.phone),
      rating: l.rating,
      reviewCount: l.reviewCount,
      hasWebsite: Boolean(l.website),
      category: l.category,
      alreadyCalled: (l.callAttempts || 0) > 0,
      doNotCall: Boolean(l.doNotCall),
    }));
    const prompt = `Score each local-business lead 0-100 for outbound cold-calling quality.
Consider: phone availability (required), category match to "${context.category || ''}",
location match to "${context.location || ''}", rating, review count, website presence,
whether already called (lower), do-not-call (score 0). Return ONLY JSON:
{"scores":[{"index":number,"score":number,"reason":string}]}
Leads: ${JSON.stringify(compact)}`;

    const raw = await askGeminiJson(prompt, creds);
    const arr = raw?.scores;
    if (Array.isArray(arr)) {
      const byIndex = new Map();
      for (const item of arr) {
        const p = leadScoreItem.safeParse(item);
        if (p.success) byIndex.set(p.data.index, p.data);
      }
      if (byIndex.size) {
        return leads.map((_, i) => {
          const g = byIndex.get(i);
          return g
            ? { score: Math.round(g.score), reason: g.reason, source: 'gemini' }
            : { ...heuristic[i], source: 'fallback' };
        });
      }
    }
  }

  return heuristic.map((h) => ({ ...h, source: 'fallback' }));
}

function heuristicScore(lead, context) {
  if (lead.doNotCall) return { score: 0, reason: 'Marked Do Not Call' };
  if (!lead.phone) return { score: 5, reason: 'No phone number available' };

  let score = 40;
  const reasons = [];

  const rating = Number(lead.rating) || 0;
  score += Math.min(20, rating * 4);
  if (rating >= 4) reasons.push('strong rating');

  const reviews = Number(lead.reviewCount) || 0;
  if (reviews >= 100) {
    score += 20;
    reasons.push('established (100+ reviews)');
  } else if (reviews >= 20) {
    score += 12;
    reasons.push('active reviews');
  } else if (reviews > 0) {
    score += 5;
  }

  if (lead.website) {
    score += 8;
    reasons.push('has website');
  }
  if (
    context.category &&
    lead.category &&
    lead.category.toLowerCase().includes(context.category.toLowerCase())
  ) {
    score += 8;
    reasons.push('category match');
  }
  if ((lead.callAttempts || 0) > 0) {
    score -= 25;
    reasons.push('previously called');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    reason: reasons.length ? `Good fit: ${reasons.join(', ')}.` : 'Contactable lead.',
  };
}

/* ------------------------------------------------------------------ */
/* Call transcript analysis                                            */
/* ------------------------------------------------------------------ */

const analysisSchema = z.object({
  result: z.enum([
    'interested',
    'not_interested',
    'follow_up',
    'no_answer',
    'busy',
    'wrong_number',
    'voicemail',
  ]),
  interestLevel: z.number().min(0).max(10),
  summary: z.string(),
  objections: z.array(z.string()).default([]),
  followUpRequested: z.boolean().default(false),
  doNotCall: z.boolean().default(false),
});

export async function analyzeCall({ transcript, endedReason }, creds = {}) {
  if (creds.apiKey && transcript) {
    const prompt = `Analyze this outbound sales call transcript. Return ONLY JSON:
{"result":"interested|not_interested|follow_up|no_answer|busy|wrong_number|voicemail",
 "interestLevel":0-10,"summary":string,"objections":string[],
 "followUpRequested":boolean,"doNotCall":boolean}
Ended reason: ${endedReason || 'unknown'}
Transcript:
${transcript.slice(0, 6000)}`;
    const raw = await askGeminiJson(prompt, creds);
    const parsed = raw && analysisSchema.safeParse(raw);
    if (parsed && parsed.success) return { ...parsed.data, source: 'gemini' };
  }
  return { ...fallbackAnalysis({ transcript, endedReason }), source: 'fallback' };
}

function fallbackAnalysis({ transcript = '', endedReason = '' }) {
  const t = transcript.toLowerCase();
  const reason = (endedReason || '').toLowerCase();

  if (reason.includes('no-answer') || reason.includes('no_answer')) {
    return base('no_answer', 0, 'The lead did not answer the call.');
  }
  if (reason.includes('busy')) return base('busy', 0, 'The line was busy.');
  if (reason.includes('voicemail')) return base('voicemail', 1, 'Reached voicemail.');

  if (/not interested|no thanks|remove me|stop calling|do not call/.test(t)) {
    return {
      ...base('not_interested', 2, 'The lead was not interested.'),
      doNotCall: /remove me|stop calling|do not call/.test(t),
    };
  }
  if (/call me back|follow up|next week|send.*info|email me/.test(t)) {
    return { ...base('follow_up', 6, 'The lead asked for a follow-up.'), followUpRequested: true };
  }
  if (/interested|sounds good|tell me more|yes.*consultation|book/.test(t)) {
    return base('interested', 8, 'The lead expressed interest in learning more.');
  }
  return base('not_interested', 3, 'Call completed with no clear interest.');
}

function base(result, interestLevel, summary) {
  return {
    result,
    interestLevel,
    summary,
    objections: [],
    followUpRequested: false,
    doNotCall: false,
  };
}
