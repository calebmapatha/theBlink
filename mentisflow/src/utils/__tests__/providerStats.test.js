import { describe, it, expect } from 'vitest'
import {
  isSession, buildBuckets, windowRange, series, kpis, attendance,
  newVsReturning, patientGrowth, peakWeekdays, peakHours,
  occupancyNext7, upcoming, insights,
} from '../providerStats'

// Fixed "now": Wednesday 10 June 2026
const NOW = new Date(2026, 5, 10, 12, 0)

const appt = (over = {}) => ({
  date: '2026-06-08', timeSlot: '09:00', status: 'confirmed', patientUid: 'p1', ...over,
})

describe('isSession', () => {
  it('counts confirmed and completed as revenue-bearing', () => {
    expect(isSession({ status: 'confirmed' })).toBe(true)
    expect(isSession({ status: 'completed' })).toBe(true)
    expect(isSession({ status: 'pending' })).toBe(false)
    expect(isSession({ status: 'cancelled' })).toBe(false)
    expect(isSession({ status: 'no-show' })).toBe(false)
  })
})

describe('buildBuckets / windowRange', () => {
  it('7d gives 7 daily buckets ending today', () => {
    const b = buildBuckets('7d', NOW)
    expect(b).toHaveLength(7)
    expect(b[6].start.getDate()).toBe(10)
    expect(+b[6].end - +b[6].start).toBe(24 * 60 * 60 * 1000)
  })

  it('30d gives 5 weekly buckets, 90d gives 3 months, 1y gives 12', () => {
    expect(buildBuckets('30d', NOW)).toHaveLength(5)
    expect(buildBuckets('90d', NOW)).toHaveLength(3)
    expect(buildBuckets('1y', NOW)).toHaveLength(12)
  })

  it('buckets are contiguous (no gaps or overlap)', () => {
    for (const key of ['7d', '30d', '90d', '1y']) {
      const b = buildBuckets(key, NOW)
      for (let i = 1; i < b.length; i++) {
        expect(+b[i].start).toBe(+b[i - 1].end)
      }
    }
  })

  it('windowRange spans first bucket start to last bucket end', () => {
    const b = buildBuckets('7d', NOW)
    const r = windowRange('7d', NOW)
    expect(+r.start).toBe(+b[0].start)
    expect(+r.end).toBe(+b[6].end)
  })
})

describe('series', () => {
  it('sums valueFn per bucket with predicate applied', () => {
    const buckets = buildBuckets('7d', NOW)
    const appts = [appt({ date: '2026-06-10' }), appt({ date: '2026-06-10', status: 'pending' }), appt({ date: '2026-06-04' })]
    const s = series(appts, buckets, () => 1, isSession)
    expect(s[6].value).toBe(1) // only the confirmed one today
    expect(s[0].value).toBe(1) // 4 June
  })
})

describe('kpis', () => {
  it('computes requests, sessions and full-fee earnings with deltas', () => {
    const appts = [
      appt({ date: '2026-06-09' }),                       // current window, session
      appt({ date: '2026-06-09', status: 'pending' }),    // current window, not a session
      appt({ date: '2026-06-01' }),                       // previous window (7d: 4–10 June, prev 28 May–3 June)
    ]
    const k = kpis(appts, '7d', 1000, NOW)
    expect(k.requests.value).toBe(2)
    expect(k.sessions.value).toBe(1)
    expect(k.earnings.value).toBe(1000) // 1 session × 1000 — no commission
    expect(k.sessions.delta).toBe(0)    // 1 vs 1
  })

  it('delta is 100 when previous window is empty but current is not', () => {
    const k = kpis([appt({ date: '2026-06-09' })], '7d', 500, NOW)
    expect(k.sessions.delta).toBe(100)
  })
})

describe('attendance', () => {
  it('computes rates over held (completed + no-show) past sessions', () => {
    const appts = [
      appt({ date: '2026-06-01', status: 'completed' }),
      appt({ date: '2026-06-02', status: 'completed' }),
      appt({ date: '2026-06-03', status: 'no-show' }),
      appt({ date: '2026-06-04', status: 'cancelled' }),
      appt({ date: '2026-06-05', status: 'confirmed' }), // past but unresolved
      appt({ date: '2026-07-01', status: 'confirmed' }), // future — ignored
    ]
    const a = attendance(appts, NOW)
    expect(a.completed).toBe(2)
    expect(a.noShow).toBe(1)
    expect(a.cancelled).toBe(1)
    expect(a.unresolved).toBe(1)
    expect(a.attendanceRate).toBe(67)
    expect(a.noShowRate).toBe(33)
  })

  it('rates are null with no held sessions', () => {
    const a = attendance([], NOW)
    expect(a.attendanceRate).toBeNull()
    expect(a.noShowRate).toBeNull()
  })
})

describe('newVsReturning', () => {
  it('splits patients by whether their first appointment falls in the window', () => {
    const appts = [
      appt({ date: '2025-01-10', patientUid: 'old' }),
      appt({ date: '2026-06-09', patientUid: 'old' }),  // returning
      appt({ date: '2026-06-09', patientUid: 'new' }),  // first ever in window
    ]
    const r = newVsReturning(appts, '7d', NOW)
    expect(r.newPatients).toBe(1)
    expect(r.returningPatients).toBe(1)
  })
})

describe('patientGrowth', () => {
  it('is cumulative and monotonically non-decreasing', () => {
    const appts = [
      appt({ date: '2025-08-15', patientUid: 'a' }),
      appt({ date: '2026-02-10', patientUid: 'b' }),
      appt({ date: '2026-06-01', patientUid: 'c' }),
    ]
    const g = patientGrowth(appts, NOW)
    expect(g).toHaveLength(12)
    for (let i = 1; i < g.length; i++) expect(g[i].value).toBeGreaterThanOrEqual(g[i - 1].value)
    expect(g[11].value).toBe(3)
  })
})

describe('peakWeekdays / peakHours', () => {
  it('orders weekdays Monday-first and counts sessions only', () => {
    const wk = peakWeekdays([appt({ date: '2026-06-08' }), appt({ date: '2026-06-08', status: 'pending' })])
    expect(wk[0]).toEqual({ label: 'Mon', value: 1 })
    expect(wk.map(d => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('returns top hours sorted by frequency', () => {
    const appts = [
      appt({ timeSlot: '09:00' }), appt({ timeSlot: '09:00' }), appt({ timeSlot: '14:00' }),
      appt({ timeSlot: '' }), // missing slot ignored
    ]
    const h = peakHours(appts)
    expect(h[0]).toEqual({ label: '09:00', value: 2 })
    expect(h[1]).toEqual({ label: '14:00', value: 1 })
  })
})

describe('occupancyNext7', () => {
  it('divides confirmed sessions by open slots over the next 7 days', () => {
    // Diary open only Wednesdays with 2 slots; next 7 days from Wed 10 June
    // include 2 Wednesdays (10th and... no — 10..16 has only the 10th) → 2 open.
    const diary = { mon: [], tue: [], wed: ['09:00', '10:00'], thu: [], fri: [], sat: [], sun: [] }
    const appts = [appt({ date: '2026-06-10', timeSlot: '09:00' })]
    const o = occupancyNext7(appts, diary, NOW)
    expect(o.open).toBe(2)
    expect(o.booked).toBe(1)
    expect(o.pct).toBe(50)
  })

  it('pct is null when nothing is open', () => {
    const diary = Object.fromEntries(['sun','mon','tue','wed','thu','fri','sat'].map(d => [d, []]))
    expect(occupancyNext7([], diary, NOW).pct).toBeNull()
  })
})

describe('upcoming', () => {
  it('returns only future/today confirmed sessions, soonest first, limited', () => {
    const appts = [
      appt({ date: '2026-06-12', timeSlot: '10:00' }),
      appt({ date: '2026-06-10', timeSlot: '15:00' }),
      appt({ date: '2026-06-01' }),                      // past
      appt({ date: '2026-06-11', status: 'pending' }),   // not confirmed
    ]
    const u = upcoming(appts, NOW)
    expect(u.map(a => a.date)).toEqual(['2026-06-10', '2026-06-12'])
  })
})

describe('insights', () => {
  it('reports a healthy practice when there is nothing to flag', () => {
    const out = insights({
      appts: [], diary: {}, profileViews: 0, ratingAvg: null,
      occupancy: { open: 0, booked: 0, pct: null },
      att: { completed: 0, noShow: 0, cancelled: 0, unresolved: 0, attendanceRate: null, noShowRate: null },
      now: NOW,
    })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/healthy/)
  })

  it('flags high no-show rates and unresolved sessions', () => {
    const out = insights({
      appts: [], diary: {}, profileViews: 0, ratingAvg: null,
      occupancy: { open: 10, booked: 5, pct: 50 },
      att: { completed: 8, noShow: 2, cancelled: 0, unresolved: 3, attendanceRate: 80, noShowRate: 20 },
      now: NOW,
    })
    expect(out.some(s => s.includes('no-show rate is 20%'))).toBe(true)
    expect(out.some(s => s.includes('3 past sessions are not closed out'))).toBe(true)
  })
})
