import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Single source of truth for subscription pricing. The Super Admin can
// override any of these numbers at runtime via the `pricing` map on the
// config/platform document (Admin Portal → Settings) — code falls back to
// these defaults when the doc or a key is missing.
//
// Model: flat monthly subscription, no per-session commission. Doctors keep
// 100% of their session fees; MentisFlow charges only the listing plan.
export const DEFAULT_PRICING = {
  trialDays: 30,
  currency: 'R',
  plans: {
    standard: { monthly: 495, annual: 4950 },
    featured: { monthly: 895, annual: 8950 },
  },
}

// Merge a (possibly partial / malformed) config override over the defaults.
// Only numbers > 0 are accepted so a bad admin edit can never produce a
// R0 or NaN price in the signup flow.
export function mergePricing(raw) {
  const num = (v, fallback) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : fallback)
  const plan = (key) => ({
    monthly: num(raw?.plans?.[key]?.monthly, DEFAULT_PRICING.plans[key].monthly),
    annual:  num(raw?.plans?.[key]?.annual,  DEFAULT_PRICING.plans[key].annual),
  })
  return {
    trialDays: num(raw?.trialDays, DEFAULT_PRICING.trialDays),
    currency: typeof raw?.currency === 'string' && raw.currency ? raw.currency : DEFAULT_PRICING.currency,
    plans: { standard: plan('standard'), featured: plan('featured') },
  }
}

export async function fetchPricing() {
  try {
    const snap = await getDoc(doc(db, 'config', 'platform'))
    return mergePricing(snap.exists() ? snap.data().pricing : null)
  } catch {
    return mergePricing(null)
  }
}

// Whole days of trial remaining (0 when ended/invalid). Ceils so the last
// partial day still reads "1 day left".
export function trialDaysLeft(trialEndsAt, now = new Date()) {
  if (!trialEndsAt) return 0
  const end = new Date(trialEndsAt)
  if (isNaN(end)) return 0
  return Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)))
}
