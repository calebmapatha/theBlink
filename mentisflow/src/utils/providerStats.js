// Practice analytics computed client-side from the provider's own
// appointments, ratings and profile. All functions are pure.
//
// Appointment statuses:
//   pending → confirmed → completed | no-show     (cancelled = declined)
// "Sessions" = confirmed + completed (revenue-bearing).

import { slotsForDay, DAY_KEYS } from './availability'

const SESSION_STATUSES = ['confirmed', 'completed']

export const isSession = (a) => SESSION_STATUSES.includes(a.status)

const pad = (n) => String(n).padStart(2, '0')
const toDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const dstr = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const WINDOWS = [
  { key: '7d',  label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '1y',  label: 'Year' },
]

// Build time buckets (oldest → newest) for a window.
export function buildBuckets(windowKey, now = new Date()) {
  const buckets = []
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (windowKey === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const e = new Date(d); e.setDate(e.getDate() + 1)
      buckets.push({ start: d, end: e, label: WEEKDAYS[d.getDay()] })
    }
  } else if (windowKey === '30d') {
    // 5 rolling weeks ending today
    for (let i = 4; i >= 0; i--) {
      const e = new Date(today); e.setDate(e.getDate() - i * 7 + 1)
      const s = new Date(e); s.setDate(s.getDate() - 7)
      buckets.push({ start: s, end: e, label: `${s.getDate()} ${MONTHS[s.getMonth()]}` })
    }
  } else if (windowKey === '90d') {
    for (let i = 2; i >= 0; i--) {
      const s = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const e = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
      buckets.push({ start: s, end: e, label: MONTHS[s.getMonth()] })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const s = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const e = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
      buckets.push({ start: s, end: e, label: MONTHS[s.getMonth()] })
    }
  }
  return buckets
}

export function windowRange(windowKey, now = new Date()) {
  const b = buildBuckets(windowKey, now)
  return { start: b[0].start, end: b[b.length - 1].end }
}

const inRange = (a, start, end) => {
  if (!a.date) return false
  const d = toDate(a.date)
  return d >= start && d < end
}

// Series of { label, value } per bucket.
export function series(appts, buckets, valueFn = () => 1, predicate = () => true) {
  return buckets.map(b => ({
    label: b.label,
    value: appts.filter(a => predicate(a) && inRange(a, b.start, b.end))
                .reduce((s, a) => s + valueFn(a), 0),
  }))
}

// KPI totals for the current window vs the previous equal-length window.
export function kpis(appts, windowKey, fee, now = new Date()) {
  const { start, end } = windowRange(windowKey, now)
  const span = end - start
  const prevStart = new Date(start.getTime() - span)
  const cur  = appts.filter(a => inRange(a, start, end))
  const prev = appts.filter(a => inRange(a, prevStart, start))
  const sessions  = (list) => list.filter(isSession).length
  const earnings  = (list) => Math.round(sessions(list) * fee * 0.9)
  const delta = (c, p) => p > 0 ? Math.round(((c - p) / p) * 100) : (c > 0 ? 100 : 0)
  return {
    requests:       { value: cur.length,        delta: delta(cur.length, prev.length) },
    sessions:       { value: sessions(cur),     delta: delta(sessions(cur), sessions(prev)) },
    earnings:       { value: earnings(cur),     delta: delta(earnings(cur), earnings(prev)) },
  }
}

// Attendance outcomes across all past sessions.
export function attendance(appts, now = new Date()) {
  const todayStr = dstr(now)
  const past = appts.filter(a => a.date && a.date < todayStr)
  const completed = past.filter(a => a.status === 'completed').length
  const noShow    = past.filter(a => a.status === 'no-show').length
  const cancelled = past.filter(a => a.status === 'cancelled').length
  // Past appointments still marked confirmed haven't been closed out yet.
  const unresolved = past.filter(a => a.status === 'confirmed').length
  const held = completed + noShow
  return {
    completed, noShow, cancelled, unresolved,
    attendanceRate: held > 0 ? Math.round((completed / held) * 100) : null,
    noShowRate:     held > 0 ? Math.round((noShow / held) * 100) : null,
  }
}

// First-ever appointment per patient marks them "new" in that window.
export function newVsReturning(appts, windowKey, now = new Date()) {
  const { start, end } = windowRange(windowKey, now)
  const firstSeen = {}
  for (const a of appts) {
    if (!a.patientUid || !a.date) continue
    if (!firstSeen[a.patientUid] || a.date < firstSeen[a.patientUid]) firstSeen[a.patientUid] = a.date
  }
  const inWin = appts.filter(a => inRange(a, start, end))
  const patients = [...new Set(inWin.map(a => a.patientUid).filter(Boolean))]
  let newP = 0, returning = 0
  for (const uid of patients) {
    const f = toDate(firstSeen[uid])
    if (f >= start && f < end) newP++; else returning++
  }
  return { newPatients: newP, returningPatients: returning }
}

// Cumulative unique patients by month (last 12) — acquisition/growth curve.
export function patientGrowth(appts, now = new Date()) {
  const firstSeen = {}
  for (const a of appts) {
    if (!a.patientUid || !a.date) continue
    if (!firstSeen[a.patientUid] || a.date < firstSeen[a.patientUid]) firstSeen[a.patientUid] = a.date
  }
  const firsts = Object.values(firstSeen).map(toDate)
  return buildBuckets('1y', now).map(b => ({
    label: b.label,
    value: firsts.filter(d => d < b.end).length,
  }))
}

// Booking distribution by weekday and by start hour (sessions only).
export function peakWeekdays(appts) {
  const counts = Array(7).fill(0)
  appts.filter(isSession).forEach(a => { counts[toDate(a.date).getDay()]++ })
  // Mon-first ordering
  return [1, 2, 3, 4, 5, 6, 0].map(i => ({ label: WEEKDAYS[i], value: counts[i] }))
}

export function peakHours(appts) {
  const byHour = {}
  appts.filter(isSession).forEach(a => {
    const h = (a.timeSlot || '').split(':')[0]
    if (h) byHour[h] = (byHour[h] || 0) + 1
  })
  return Object.entries(byHour)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 5)
    .map(([h, v]) => ({ label: `${h}:00`, value: v }))
}

// Occupancy for the next 7 days: confirmed sessions ÷ open slots.
export function occupancyNext7(appts, diary, now = new Date()) {
  let open = 0, booked = 0
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    const ds = dstr(d)
    const slots = slotsForDay(diary, DAY_KEYS[d.getDay()])
    open += slots.length
    booked += appts.filter(a => a.date === ds && isSession(a)).length
  }
  return { open, booked, pct: open > 0 ? Math.round((booked / open) * 100) : null }
}

// Upcoming confirmed sessions, soonest first.
export function upcoming(appts, now = new Date(), limit = 8) {
  const todayStr = dstr(now)
  return appts
    .filter(a => a.status === 'confirmed' && a.date >= todayStr)
    .sort((x, y) => (x.date + x.timeSlot).localeCompare(y.date + y.timeSlot))
    .slice(0, limit)
}

// Rule-based, actionable recommendations.
export function insights({ appts, diary, profileViews, ratingAvg, occupancy, att, now = new Date() }) {
  const out = []
  const sessions = appts.filter(isSession)

  if (occupancy.pct !== null && occupancy.pct < 30 && sessions.length > 0) {
    out.push('📣 Your next 7 days are under 30% booked. Sharing your profile link or adding specialties can lift visibility.')
  }
  if (att.noShowRate !== null && att.noShowRate >= 15) {
    out.push(`⚠️ Your no-show rate is ${att.noShowRate}%. Consider confirming sessions a day ahead via the calendar invite, or requesting payment upfront.`)
  }
  if (att.unresolved > 0) {
    out.push(`📝 ${att.unresolved} past session${att.unresolved > 1 ? 's are' : ' is'} not closed out. Mark them Completed or No-show to keep your stats accurate.`)
  }

  // Quietest open weekday
  if (sessions.length >= 3) {
    const wk = peakWeekdays(appts)
    const openDays = wk.filter(d => slotsForDay(diary, d.label.toLowerCase()).length > 0)
    if (openDays.length > 1) {
      const quiet = [...openDays].sort((a, b) => a.value - b.value)[0]
      const busy  = [...openDays].sort((a, b) => b.value - a.value)[0]
      if (busy.value > 0 && quiet.value <= busy.value / 3) {
        out.push(`📅 ${quiet.label} is your quietest open day (${quiet.value} vs ${busy.value} on ${busy.label}). Consider closing it or promoting off-peak rates.`)
      }
    }
  }

  // Repeat cancellers
  const cancelsByPatient = {}
  appts.filter(a => a.status === 'cancelled').forEach(a => {
    if (a.patientUid) cancelsByPatient[a.patientUid] = (cancelsByPatient[a.patientUid] || 0) + 1
  })
  const repeat = Object.values(cancelsByPatient).filter(c => c >= 2).length
  if (repeat > 0) {
    out.push(`🔁 ${repeat} patient${repeat > 1 ? 's have' : ' has'} 2+ declined/cancelled bookings. A quick message may help them find a slot that works.`)
  }

  // Weakest rating dimension
  if (ratingAvg) {
    const dims = [['communication', 'Communication'], ['empathy', 'Empathy'], ['professionalism', 'Professionalism'], ['treatmentPlan', 'Treatment plan']]
      .map(([k, l]) => ({ k, l, v: ratingAvg[k] || 0 }))
      .filter(d => d.v > 0)
    if (dims.length) {
      const weakest = dims.sort((a, b) => a.v - b.v)[0]
      if (weakest.v < 4) out.push(`⭐ ${weakest.l} is your lowest-rated area (${weakest.v.toFixed(1)}/5). Small changes here can move your overall score most.`)
    }
  }

  // Conversion
  if (profileViews >= 10 && appts.length / profileViews < 0.1) {
    out.push('👀 Less than 10% of profile views turn into bookings. A richer bio, photo, and visible availability all improve conversion.')
  }

  if (out.length === 0) out.push('✅ Practice is healthy — no issues detected. Keep your diary up to date to maintain momentum.')
  return out
}
