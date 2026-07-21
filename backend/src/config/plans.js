/**
 * Plan catalog — the single source of truth for pricing tiers, the credits/minutes
 * each grants, and the feature limits it unlocks. The frontend fetches this via
 * GET /api/plans so nothing is duplicated.
 *
 * `maxAgents: null` means unlimited. Prices are USD / month (display only — no
 * payment processing is wired; selecting a plan applies its allotment as a demo).
 */
export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Kick the tires',
    price: 0,
    leadCredits: 500,
    callingMinutes: 120,
    maxAgents: 1,
    highlighted: false,
    cta: 'Current plan',
    features: [
      '1 AI calling agent',
      '500 lead credits',
      '120 calling minutes',
      'AI lead scoring',
      'Transcripts & recordings',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For solo outreach',
    price: 29,
    leadCredits: 2500,
    callingMinutes: 500,
    maxAgents: 3,
    highlighted: false,
    cta: 'Choose Starter',
    features: [
      '3 AI calling agents',
      '2,500 lead credits',
      '500 calling minutes',
      'AI lead scoring',
      'Transcripts & recordings',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing teams',
    price: 79,
    leadCredits: 10000,
    callingMinutes: 2000,
    maxAgents: 10,
    highlighted: true,
    cta: 'Choose Pro',
    features: [
      '10 AI calling agents',
      '10,000 lead credits',
      '2,000 calling minutes',
      'Priority AI scoring',
      'Transcripts & recordings',
      'Priority support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For high volume',
    price: 199,
    leadCredits: 40000,
    callingMinutes: 8000,
    maxAgents: null,
    highlighted: false,
    cta: 'Choose Business',
    features: [
      'Unlimited AI calling agents',
      '40,000 lead credits',
      '8,000 calling minutes',
      'Priority AI scoring',
      'Transcripts & recordings',
      'Dedicated support',
    ],
  },
];

export const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p]));

export const getPlan = (id) => PLAN_MAP[id] || PLAN_MAP.free;
