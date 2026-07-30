/**
 * Plan catalog — the single source of truth for the platform-access tiers. The
 * frontend fetches this via GET /api/plans so nothing is duplicated.
 *
 * Billing model: users bring their OWN API keys (Gemini, SerpAPI, Vapi) and their
 * OWN Twilio number, so all usage (leads, calls, minutes) is on their accounts —
 * unlimited from our side. Plans are a flat monthly PLATFORM FEE that unlocks how
 * many agents and team members a workspace can have, plus support level.
 *
 * `maxAgents: null` / `maxMembers: null` means unlimited. Prices are USD / month
 * (display only — no payment processing is wired yet).
 */
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try it out',
    price: 0,
    maxAgents: 1,
    maxMembers: 1,
    highlighted: false,
    cta: 'Current plan',
    features: [
      '1 AI calling agent',
      'Just you (no team members)',
      'Bring your own API keys',
      'Unlimited leads & calls',
      'Transcripts & recordings',
      'Community support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small teams',
    price: 9,
    maxAgents: 5,
    maxMembers: 3,
    highlighted: false,
    cta: 'Choose Starter',
    features: [
      '5 AI calling agents',
      'Up to 3 team members',
      'Bring your own API keys',
      'Unlimited leads & calls',
      'Transcripts & recordings',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing teams',
    price: 29,
    maxAgents: null,
    maxMembers: null,
    highlighted: true,
    cta: 'Choose Pro',
    features: [
      'Unlimited AI calling agents',
      'Unlimited team members',
      'Bring your own API keys',
      'Unlimited leads & calls',
      'Transcripts & recordings',
      'Priority support',
    ],
  },
];

export const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export const getPlan = (id) => PLAN_MAP[id] || PLAN_MAP.free;
