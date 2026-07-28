import axios from 'axios';
import { env } from '../config/env.js';
import { normalizePhone } from '../utils/phone.js';
import { ApiError } from '../utils/ApiError.js';

const SERPAPI_URL = 'https://serpapi.com/search.json';
const PAGE_SIZE = 20; // SerpAPI Google Maps returns up to 20 local results per page

/** Verify a SerpAPI key works. Throws ApiError.badRequest if it's rejected. */
export async function testSerpApiKey(apiKey) {
  try {
    const { data } = await axios.get(SERPAPI_URL, {
      params: { engine: 'google_maps', type: 'search', q: 'coffee in Austin', api_key: apiKey },
      timeout: 20000,
    });
    if (data?.error) {
      throw ApiError.badRequest(
        `SerpAPI rejected that key: ${data.error.replace(/\s*Your API key should be here:.*$/i, '')}`,
      );
    }
    return true;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const body = err.response?.data?.error;
    throw ApiError.badRequest(`Could not verify the SerpAPI key: ${body || err.message}`);
  }
}

/**
 * Find local business leads via SerpAPI's Google Maps engine.
 * Falls back to a deterministic synthetic generator when no key is configured,
 * so the full product flow still works offline.
 *
 * Returns an array of normalized lead-like plain objects (not yet persisted).
 */
export async function findLeads(query, creds = {}) {
  // Only the workspace's own SerpAPI key is used — never the platform key.
  const apiKey = creds.apiKey;
  const hl = creds.hl || env.serpApi.hl; // locale only
  const gl = creds.gl || env.serpApi.gl;

  if (apiKey) {
    try {
      return await fromSerpApi(query, { apiKey, hl, gl });
    } catch (err) {
      // Never silently substitute invented businesses for real ones — their phone
      // numbers would be dialed for real. Surface the failure instead.
      console.warn('[leadProvider] SerpAPI failed:', err.message);
      if (env.demoMode) return syntheticLeads(query);
      throw ApiError.badRequest(`Unable to find leads — ${err.message}`);
    }
  }

  if (env.demoMode) return syntheticLeads(query);

  throw ApiError.serviceUnavailable(
    'No SerpAPI key. Connect your workspace API keys in API Settings.',
  );
}

/* ----------------------------- SerpAPI ---------------------------- */

/** Build the Google Maps text query, e.g. "Restaurants in San Francisco, CA, US". */
function buildQuery({ businessCategory, city, state, country }) {
  const place = [city, state, country].filter(Boolean).join(', ');
  return place ? `${businessCategory} in ${place}` : businessCategory;
}

async function fromSerpApi(query, { apiKey, hl, gl }) {
  const { limit } = query;
  const q = buildQuery(query);
  const collected = [];
  const pages = Math.ceil(limit / PAGE_SIZE);

  for (let page = 0; page < pages && collected.length < limit; page += 1) {
    let data;
    try {
      ({ data } = await axios.get(SERPAPI_URL, {
        params: {
          engine: 'google_maps',
          type: 'search',
          q,
          hl,
          gl,
          start: page * PAGE_SIZE,
          api_key: apiKey,
        },
        timeout: 30000,
      }));
    } catch (err) {
      // SerpAPI puts the real reason in the body (e.g. "Invalid API key.").
      const body = err.response?.data?.error;
      if (body) throw new Error(body.replace(/\s*Your API key should be here:.*$/i, '').trim());
      if (err.response?.status === 429) throw new Error('SerpAPI rate limit or credits exhausted');
      throw new Error(err.message);
    }

    // SerpAPI reports problems in-band rather than via HTTP status.
    if (data?.error) {
      // "hasn't returned any results" just means we've run out of pages.
      if (/no results|hasn't returned any results/i.test(data.error)) break;
      throw new Error(data.error);
    }

    // A query that resolves to exactly one business comes back as place_results.
    const rows = data.local_results?.length
      ? data.local_results
      : data.place_results
        ? [data.place_results]
        : [];

    if (!rows.length) break;
    collected.push(...rows);
    if (rows.length < PAGE_SIZE) break; // last page
  }

  return collected.slice(0, limit).map((r) => mapSerpResult(r, query));
}

function mapSerpResult(r, { businessCategory, city, state, country }) {
  return {
    businessName: r.title || 'Unknown business',
    phone: normalizePhone(r.phone || ''),
    website: r.website || '',
    address: r.address || '',
    city: city || '',
    state: state || '',
    country: country || '',
    // SerpAPI gives `type` (string) and/or `types` (array) for the business category.
    category: r.type || r.types?.[0] || businessCategory,
    rating: Number(r.rating) || 0,
    reviewCount: Number(r.reviews) || 0,
    source: 'serpapi',
  };
}

/* ------------------------ Synthetic (demo) ----------------------- */
const NAME_PARTS = [
  'Bright', 'Summit', 'Coastal', 'Metro', 'Pioneer', 'Evergreen', 'Blue Sky',
  'Golden Gate', 'Riverside', 'Cornerstone', 'Prime', 'Urban', 'Maple', 'Sterling',
  'Harbor', 'Lakeview', 'Sunrise', 'Redwood', 'Ironclad', 'Nimbus',
];

function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i += 1) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function syntheticLeads(query) {
  const { businessCategory, city, state, country, limit } = query;
  const rnd = seededRandom(`${businessCategory}|${city}|${state}|${Date.now() >> 16}`);
  const out = [];
  for (let i = 0; i < limit; i += 1) {
    const namePart = NAME_PARTS[Math.floor(rnd() * NAME_PARTS.length)];
    const hasPhone = rnd() > 0.08; // ~8% missing phone
    const hasWebsite = rnd() > 0.35;
    const reviewCount = Math.floor(rnd() * 480);
    const rating = Math.round((3 + rnd() * 2) * 10) / 10;
    const digits = 2000000 + Math.floor(rnd() * 7999999);
    out.push({
      businessName: `${namePart} ${titleForCategory(businessCategory)} ${i % 2 ? 'Co.' : 'Group'}`,
      phone: hasPhone ? normalizePhone(`415${digits}`) : '',
      website: hasWebsite
        ? `https://www.${namePart.toLowerCase().replace(/\s+/g, '')}${i}.example.com`
        : '',
      address: `${100 + Math.floor(rnd() * 900)} Main St, ${city || 'Springfield'}`,
      city: city || 'Springfield',
      state: state || '',
      country: country || 'US',
      category: businessCategory,
      rating,
      reviewCount,
      source: 'mock',
    });
  }
  return out;
}

function titleForCategory(cat = '') {
  const c = cat.trim();
  if (!c) return 'Business';
  return c.charAt(0).toUpperCase() + c.slice(1);
}
