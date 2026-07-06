import { describe, it, expect, vi } from 'vitest'

// pricing.js pulls in the firebase client for fetchPricing(); the pure
// helpers under test don't need it.
vi.mock('../../lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }))

const { DEFAULT_PRICING, mergePricing, trialDaysLeft } = await import('../pricing')

describe('DEFAULT_PRICING', () => {
  it('carries the launch numbers', () => {
    expect(DEFAULT_PRICING.trialDays).toBe(60)
    expect(DEFAULT_PRICING.plans.standard.monthly).toBe(495)
    expect(DEFAULT_PRICING.plans.featured.monthly).toBe(895)
  })
})

describe('mergePricing', () => {
  it('returns defaults for missing/null config', () => {
    expect(mergePricing(null)).toEqual(DEFAULT_PRICING)
    expect(mergePricing(undefined)).toEqual(DEFAULT_PRICING)
    expect(mergePricing({})).toEqual(DEFAULT_PRICING)
  })

  it('applies valid overrides', () => {
    const p = mergePricing({ trialDays: 14, plans: { standard: { monthly: 399 } } })
    expect(p.trialDays).toBe(14)
    expect(p.plans.standard.monthly).toBe(399)
    expect(p.plans.standard.annual).toBe(DEFAULT_PRICING.plans.standard.annual)
    expect(p.plans.featured.monthly).toBe(DEFAULT_PRICING.plans.featured.monthly)
  })

  it('rejects zero, negative, NaN and non-numeric values', () => {
    const p = mergePricing({
      trialDays: 0,
      plans: { standard: { monthly: -5, annual: 'free' }, featured: { monthly: NaN } },
    })
    expect(p).toEqual(DEFAULT_PRICING)
  })
})

describe('trialDaysLeft', () => {
  const now = new Date('2026-06-10T12:00:00Z')

  it('counts whole days remaining, ceiling partial days', () => {
    expect(trialDaysLeft('2026-06-20T12:00:00Z', now)).toBe(10)
    expect(trialDaysLeft('2026-06-11T11:00:00Z', now)).toBe(1) // 23h → still "1 day"
  })

  it('returns 0 once the trial has ended', () => {
    expect(trialDaysLeft('2026-06-10T11:59:00Z', now)).toBe(0)
    expect(trialDaysLeft('2026-01-01T00:00:00Z', now)).toBe(0)
  })

  it('returns 0 for missing or invalid dates', () => {
    expect(trialDaysLeft(null, now)).toBe(0)
    expect(trialDaysLeft(undefined, now)).toBe(0)
    expect(trialDaysLeft('not-a-date', now)).toBe(0)
  })
})
