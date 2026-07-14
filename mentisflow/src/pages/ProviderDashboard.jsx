import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, CheckCircle, XCircle, Clock, ExternalLink, Users, Calendar, BadgeCheck, Save, Eye, TrendingUp, Camera, Loader, Star, FileText, Trash2, FileSignature, MapPin, Smile, Zap, Lightbulb, CalendarCheck, LineChart, Wallet, ArrowRight, QrCode } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useProviders } from '../hooks/useProviders'
import { detectLocation } from '../utils/geolocate'
import { AddToCalendar } from '../components/ui/AddToCalendar'
import { slotsForDay, dayMode, DEFAULT_HOURS } from '../utils/availability'
import { trialDaysLeft } from '../utils/pricing'
import { getScreeningDocs, addScreeningDocPDF, addScreeningDocText, deleteScreeningDoc, openScreeningPDF, getConsentsForAppointment, MAX_PDF_BYTES, MAX_DOCS } from '../utils/screeningDocs'
import { shortCodeFor, normalizeCode, parseCheckInPayload, formatCode } from '../utils/checkin'

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400'

const PLATFORMS = [
  { value: 'zoom',    label: 'Zoom' },
  { value: 'meet',    label: 'Google Meet' },
  { value: 'teams',   label: 'MS Teams' },
  { value: 'whereby', label: 'Whereby' },
  { value: 'skype',   label: 'Skype' },
  { value: 'other',   label: 'Other' },
]

const RATING_METRICS = [
  { key: 'communication',   label: 'Communication',   desc: 'Explains clearly & listens well' },
  { key: 'empathy',         label: 'Empathy',         desc: 'Makes patients feel heard & safe' },
  { key: 'professionalism', label: 'Professionalism', desc: 'Punctual, prepared & organised' },
  { key: 'treatmentPlan',   label: 'Treatment plan',  desc: 'Therapy/medication approach' },
  { key: 'overall',         label: 'Overall',         desc: 'Would patients recommend?' },
]

const DATA_LABELS = { habits: '🔄 Habits', checkin: '😊 Mood', focus: '⏱️ Focus', tasks: '✅ Tasks', treatmentPlan: '📋 Treatment plan' }
const MOOD_LABELS   = { 1: 'Very low', 2: 'Low', 3: 'Neutral', 4: 'Good',   5: 'Great' }
const ENERGY_LABELS = { 1: 'Depleted', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Peak' }

// Category tints — soft icon-tile backgrounds used across stat and tool cards.
// Kept as a small role-locked palette (teal primary, then green/amber/violet)
// so accent colour never leaks into page chrome.
const TINTS = {
  teal:   { bg: 'bg-primary-100 dark:bg-primary-700/25', fg: 'text-primary-600 dark:text-primary-300' },
  green:  { bg: 'bg-success-100 dark:bg-success-500/15', fg: 'text-success-600 dark:text-success-400' },
  amber:  { bg: 'bg-warm-100 dark:bg-warm-500/15',       fg: 'text-warm-600 dark:text-warm-500' },
  violet: { bg: 'bg-accent-100 dark:bg-accent-700/25',   fg: 'text-accent-700 dark:text-accent-500' },
}
const AV_TINTS = [TINTS.teal, TINTS.violet, TINTS.amber, TINTS.green]

// Coloured monogram avatar — gives patient rows a face instead of plain text.
function Avatar({ name, size = 44 }) {
  const clean = (name || '').trim()
  const initials = clean
    ? clean.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
    : '?'
  const tint = AV_TINTS[(clean.charCodeAt(0) || 0) % AV_TINTS.length]
  return (
    <div style={{ width: size, height: size }}
      className={`rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${tint.bg} ${tint.fg}`}>
      {initials}
    </div>
  )
}

function StarDisplay({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size}
          className={n <= Math.round(value || 0) ? 'text-warm-400 fill-warm-400' : 'text-surface-300 dark:text-surface-600'}
        />
      ))}
    </div>
  )
}

function DataSnapshot({ snapshot }) {
  if (!snapshot || Object.keys(snapshot).length === 0) return null
  return (
    <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Last 30 days</p>

      {snapshot.checkin && (
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Smile size={15} className="text-primary-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-ink-400">Avg mood</p>
              <p className="text-xs font-semibold text-ink-800 dark:text-ink-200">
                {snapshot.checkin.avgMood}/5
                <span className="text-ink-400 font-normal ml-1">{MOOD_LABELS[Math.round(snapshot.checkin.avgMood)]}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap size={15} className="text-warm-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-ink-400">Avg energy</p>
              <p className="text-xs font-semibold text-ink-800 dark:text-ink-200">
                {snapshot.checkin.avgEnergy}/5
                <span className="text-ink-400 font-normal ml-1">{ENERGY_LABELS[Math.round(snapshot.checkin.avgEnergy)]}</span>
              </p>
            </div>
          </div>
          <p className="text-[10px] text-ink-400 self-end">{snapshot.checkin.count} check-ins</p>
        </div>
      )}

      {snapshot.tasks && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-ink-400">Task completion</p>
            <p className="text-[10px] font-semibold text-ink-700 dark:text-ink-300">
              {snapshot.tasks.completed}/{snapshot.tasks.total} tasks · {snapshot.tasks.rate}%
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
            <div className="h-full rounded-full bg-primary-500" style={{ width: `${snapshot.tasks.rate}%` }} />
          </div>
        </div>
      )}

      {snapshot.habits?.length > 0 && (
        <div className="space-y-1.5">
          {snapshot.habits.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm w-5 flex-shrink-0">{h.emoji}</span>
              <p className="text-[10px] text-ink-600 dark:text-ink-300 flex-1 truncate">{h.name}</p>
              <p className="text-[10px] font-semibold text-ink-700 dark:text-ink-300 flex-shrink-0">
                {h.completed}/{h.total}d
              </p>
              <div className="w-16 h-1 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden flex-shrink-0">
                <div className="h-full rounded-full bg-success-500"
                  style={{ width: `${Math.round(h.completed / h.total * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {snapshot.treatmentPlan && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Treatment plan</p>
          {snapshot.treatmentPlan.goals?.length > 0 && (
            <div>
              <p className="text-[10px] text-ink-400 mb-1">Active goals</p>
              {snapshot.treatmentPlan.goals.map((g, i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-ink-700 dark:text-ink-200 truncate">{g.text}</p>
                  </div>
                  <span className="text-[10px] text-primary-500 font-semibold flex-shrink-0">{g.progress}%</span>
                  <div className="w-12 h-1 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {snapshot.treatmentPlan.medications?.length > 0 && (
            <div>
              <p className="text-[10px] text-ink-400 mb-1">Medications</p>
              <div className="flex flex-wrap gap-1">
                {snapshot.treatmentPlan.medications.map((m, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-ink-600 dark:text-ink-300">
                    {m.name} {m.dosage}
                  </span>
                ))}
              </div>
            </div>
          )}
          {snapshot.treatmentPlan.symptoms?.length > 0 && (
            <div>
              <p className="text-[10px] text-ink-400 mb-1">Reported symptoms</p>
              <div className="flex flex-wrap gap-1">
                {snapshot.treatmentPlan.symptoms.map((s, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                    {s.name} ({s.severity}/5)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const STATUS_STYLES = {
  pending:   'bg-warm-50 dark:bg-warm-500/10 text-warm-600 dark:text-warm-400',
  confirmed: 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400',
  completed: 'bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400',
  'no-show': 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400',
  cancelled: 'bg-surface-100 dark:bg-surface-700 text-ink-400',
}
const STATUS_LABELS = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', 'no-show': 'No-show', cancelled: 'Declined' }

function StatusBadge({ status }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 ${STATUS_STYLES[status] || STATUS_STYLES.cancelled}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ApptRow({ appt }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink-900 dark:text-ink-100 truncate">{appt.patientName}</p>
        <p className="text-[10px] text-ink-400 flex items-center gap-1 mt-0.5">
          <Calendar size={9} className="flex-shrink-0" /> {appt.date} · {appt.timeSlot}
        </p>
      </div>
      <StatusBadge status={appt.status} />
    </div>
  )
}

function MetricRow({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900">
      <div>
        <p className="text-xs font-medium text-ink-800 dark:text-ink-200">{label}</p>
        {sub && <p className="text-[10px] text-ink-400 mt-0.5">{sub}</p>}
      </div>
      <p className="text-sm font-bold text-ink-900 dark:text-ink-100 flex-shrink-0">{value}</p>
    </div>
  )
}

function StatDetailModal({ kind, onClose, stats }) {
  if (!kind) return null
  const { appointments, pending, confirmed, sessions, declined, patientList, profileViews,
          uniquePatients, acceptanceRate, sessionFee } = stats

  const fee     = Number(sessionFee) || 0
  const gross   = sessions.length * fee
  const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '')

  const config = {
    views: {
      title: 'Profile views',
      body: (
        <div className="space-y-2">
          <MetricRow label="Total profile views" value={profileViews}
            sub="Counted each time a patient opens your full profile on Connect" />
          <MetricRow label="Booking requests" value={appointments.length}
            sub="Appointments requested from your profile" />
          <MetricRow label="View → booking conversion"
            value={profileViews > 0 ? `${Math.round((appointments.length / profileViews) * 100)}%` : 'N/A'}
            sub="Share of profile views that turned into a booking" />
          <MetricRow label="Unique patients reached" value={uniquePatients} />
          <p className="text-[11px] text-ink-400 leading-relaxed pt-1">
            <Lightbulb size={12} className="inline -mt-0.5 mr-1 text-warm-500" />A complete bio, profile photo, and up-to-date diary slots help convert views into bookings.
          </p>
        </div>
      ),
    },
    patients: {
      title: `Unique patients (${patientList.length})`,
      body: patientList.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-6">No patients yet. Your profile is live on Connect.</p>
      ) : (
        <div className="space-y-2">
          {patientList.map((p, i) => (
            <div key={i} className="px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-ink-900 dark:text-ink-100 truncate">{p.name}</p>
                <p className="text-[10px] text-ink-400 flex-shrink-0">
                  {p.total} booking{p.total !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-[10px] text-ink-400 truncate">{p.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {p.confirmed > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${STATUS_STYLES.confirmed}`}>{p.confirmed} confirmed</span>}
                {p.pending > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${STATUS_STYLES.pending}`}>{p.pending} pending</span>}
                {p.cancelled > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${STATUS_STYLES.cancelled}`}>{p.cancelled} declined</span>}
                {p.lastDate && <span className="text-[10px] text-ink-400 ml-auto">Last: {p.lastDate}</span>}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    acceptRate: {
      title: 'Accept rate',
      body: (
        <div className="space-y-2">
          <MetricRow label="Accept rate"
            value={acceptanceRate !== null ? `${acceptanceRate}%` : 'N/A'}
            sub="Confirmed out of all responded requests (pending excluded)" />
          <MetricRow label="Confirmed" value={confirmed.length} />
          <MetricRow label="Declined" value={declined.length} />
          <MetricRow label="Awaiting your response" value={pending.length} />
          {(confirmed.length + declined.length) > 0 && (
            <div className="pt-1">
              <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden flex">
                <div className="h-full bg-success-500" style={{ width: `${acceptanceRate}%` }} />
                <div className="h-full bg-surface-300 dark:bg-surface-600 flex-1" />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-success-600 dark:text-success-400">Confirmed {acceptanceRate}%</span>
                <span className="text-[10px] text-ink-400">Declined {100 - acceptanceRate}%</span>
              </div>
            </div>
          )}
          <p className="text-[11px] text-ink-400 leading-relaxed pt-1">
            <Lightbulb size={12} className="inline -mt-0.5 mr-1 text-warm-500" />Responding quickly to pending requests, even declining, keeps patients informed and your profile trustworthy.
          </p>
        </div>
      ),
    },
    revenue: {
      title: 'Revenue breakdown',
      body: (
        <div className="space-y-2">
          <MetricRow label="Your earnings" value={`R${gross.toLocaleString()}`}
            sub={`${sessions.length} session${sessions.length !== 1 ? 's' : ''} × R${fee.toLocaleString()}. No commission, you keep 100%`} />
          {pending.length > 0 && (
            <MetricRow label="Potential (pending)" value={`R${Math.round(pending.length * fee).toLocaleString()}`}
              sub={`${pending.length} pending request${pending.length !== 1 ? 's' : ''} if confirmed`} />
          )}
          {sessions.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-2">Sessions</p>
              <div className="space-y-1.5">
                {[...sessions].sort(byDateDesc).map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900">
                    <div className="min-w-0">
                      <p className="text-xs text-ink-800 dark:text-ink-200 truncate">{a.patientName}</p>
                      <p className="text-[10px] text-ink-400">{a.date} · {a.timeSlot}</p>
                    </div>
                    <p className="text-xs font-semibold text-success-600 dark:text-success-400 flex-shrink-0">
                      +R{fee.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-ink-400 leading-relaxed pt-1">
            Estimate only, based on your current session fee and confirmed bookings. Payments are settled directly between you and the patient.
          </p>
        </div>
      ),
    },
    pending: {
      title: `Pending requests (${pending.length})`,
      body: pending.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-6">No pending requests. You're all caught up.</p>
      ) : (
        <div className="space-y-2">{[...pending].sort(byDateDesc).map((a, i) => <ApptRow key={i} appt={a} />)}</div>
      ),
    },
    confirmedList: {
      title: `Confirmed appointments (${confirmed.length})`,
      body: confirmed.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-6">No confirmed appointments yet.</p>
      ) : (
        <div className="space-y-2">{[...confirmed].sort(byDateDesc).map((a, i) => <ApptRow key={i} appt={a} />)}</div>
      ),
    },
    total: {
      title: `All appointments (${appointments.length})`,
      body: appointments.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-6">No appointment requests yet.</p>
      ) : (
        <div className="space-y-2">
          {[...appointments].sort(byDateDesc).map((a, i) => <ApptRow key={i} appt={a} />)}
        </div>
      ),
    },
  }

  const { title, body } = config[kind] || {}
  if (!title) return null
  return (
    <Modal open onClose={onClose} title={title}>
      {body}
    </Modal>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const SA_PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']

function EditModal({ open, onClose, profile, onSave }) {
  const [form, setForm] = useState({
    bio:             profile?.bio || '',
    sessionFee:      profile?.sessionFee || '',
    hideFee:         !!profile?.hideFee,
    availability:    profile?.availability || '',
    meetingPlatform: profile?.meetingPlatform || '',
    meetingLink:     profile?.meetingLink || '',
    city:            profile?.city || '',
    province:        profile?.province || '',
    consultationType: profile?.consultationType || 'remote',
    address:         profile?.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUseLocation = async () => {
    setLocating(true)
    setLocError('')
    try {
      const { city, province } = await detectLocation()
      if (!city && !province) setLocError('Could not determine your location.')
      else setForm(f => ({ ...f, city: city || f.city, province: province || f.province }))
    } catch (e) {
      setLocError(e.message)
    }
    setLocating(false)
  }

  const handle = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Bio</label>
          <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={4} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Session fee (ZAR)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">R</span>
            <input type="number" value={form.sessionFee} onChange={e => set('sessionFee', e.target.value)} min="0" className={`${inputCls} pl-7`} />
          </div>
          <label className="flex items-start gap-2.5 mt-2.5 cursor-pointer">
            <input type="checkbox" checked={!!form.hideFee} onChange={e => set('hideFee', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-primary-500 flex-shrink-0" />
            <span className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">
              Hide my session fee from patients. Your profile will show "Fee on request" instead of the amount.
            </span>
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Availability</label>
          <input value={form.availability} onChange={e => set('availability', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-2">Video platform</label>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map(p => (
              <button key={p.value} type="button" onClick={() => set('meetingPlatform', p.value)}
                className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                  form.meetingPlatform === p.value
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                    : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">
            Meeting link <span className="text-ink-400 font-normal">(optional)</span>
          </label>
          <input value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)} className={inputCls} placeholder="https://…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">City</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} placeholder="e.g. Cape Town" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">Province</label>
            <select value={form.province} onChange={e => set('province', e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {SA_PROVINCES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <button type="button" onClick={handleUseLocation} disabled={locating}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 hover:text-primary-600 disabled:opacity-50 transition-colors">
          {locating ? <Loader size={12} className="animate-spin" /> : <MapPin size={12} />}
          {locating ? 'Finding your location…' : 'Use my current location'}
        </button>
        {locError && <p className="text-xs text-red-500">{locError}</p>}
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-2">Consultation type</label>
          <div className="grid grid-cols-3 gap-2">
            {[['remote', 'Online only'], ['in-person', 'In person'], ['both', 'Both']].map(([v, label]) => (
              <button key={v} type="button" onClick={() => set('consultationType', v)}
                className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                  form.consultationType === v
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                    : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {(form.consultationType === 'in-person' || form.consultationType === 'both') && (
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">Practice address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} placeholder="e.g. 12 Oak Ave, Rosebank, Johannesburg" />
            <p className="text-[10px] text-ink-400 mt-1">Shown to patients on a map — use a full address Google Maps can find.</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={saving} onClick={handle}>
            <Save size={13} /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const RX_FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every morning', 'Every night', 'As needed', 'Weekly', 'Other']

function PrescriptionModal({ open, onClose, appt, onSubmit }) {
  const blank = () => ({ name: '', dosage: '', frequency: 'Once daily', instructions: '' })
  const [items, setItems] = useState([blank()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setItems([blank()]); setNotes(''); setSaving(false) }
  }, [open])

  const setItem = (i, k, v) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it))
  const addItem = () => setItems(arr => [...arr, blank()])
  const removeItem = (i) => setItems(arr => arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr)

  const valid = items.some(it => it.name.trim())
  const handle = async () => {
    setSaving(true)
    await onSubmit({
      items: items.filter(it => it.name.trim()).map(it => ({
        name: it.name.trim(), dosage: it.dosage.trim(), frequency: it.frequency, instructions: it.instructions.trim(),
      })),
      notes: notes.trim(),
    })
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={`Prescribe for ${appt?.patientName || 'patient'}`}>
      <div className="space-y-4">
        <p className="text-xs text-ink-400 leading-relaxed">
          The patient will see this under <strong className="text-ink-600 dark:text-ink-300">Scripts</strong> in
          their treatment plan. They manage their own current medications separately.
        </p>

        {items.map((it, i) => (
          <div key={i} className="rounded-2xl border border-surface-100 dark:border-surface-700 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-500 dark:text-ink-300">Medication {i + 1}</p>
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="text-ink-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
              )}
            </div>
            <input value={it.name} onChange={e => setItem(i, 'name', e.target.value)} className={inputCls} placeholder="Medication name (e.g. Sertraline)" />
            <div className="grid grid-cols-2 gap-2">
              <input value={it.dosage} onChange={e => setItem(i, 'dosage', e.target.value)} className={inputCls} placeholder="Dosage (e.g. 50mg)" />
              <select value={it.frequency} onChange={e => setItem(i, 'frequency', e.target.value)} className={inputCls}>
                {RX_FREQUENCIES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <input value={it.instructions} onChange={e => setItem(i, 'instructions', e.target.value)} className={inputCls} placeholder="Instructions (optional, e.g. take with food)" />
          </div>
        ))}

        <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors">
          <FileText size={12} /> Add another medication
        </button>

        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Notes to patient (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`}
            placeholder="e.g. Collect from your pharmacy; review in 4 weeks." />
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!valid || saving} onClick={handle}>
            {saving ? 'Sending…' : 'Send prescription'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const VERIFICATION_DOCS = [
  { key: 'id',       label: 'Certified ID copy' },
  { key: 'academic', label: 'Academic certificate' },
  { key: 'hpcsa',    label: 'HPCSA certificate' },
]

function VerificationSection({ uid, upload, getMeta, getUrl, showToast }) {
  const [meta, setMeta] = useState({})
  const [busy, setBusy] = useState('')
  const fileRefs = useRef({})

  useEffect(() => { if (uid) getMeta(uid).then(setMeta) }, [uid, getMeta])

  const handleFile = async (docType, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(docType)
    const res = await upload(uid, docType, file)
    if (res.ok) { setMeta(m => ({ ...m, [docType]: { path: res.path } })); showToast('Document uploaded') }
    else showToast(res.error || 'Upload failed', { variant: 'error' })
    setBusy('')
    e.target.value = ''
  }

  const view = async (path) => {
    const url = await getUrl(path)
    if (url) window.open(url, '_blank', 'noopener')
  }

  const uploadedCount = VERIFICATION_DOCS.filter(d => meta[d.key]?.path).length

  return (
    <Card className="p-4 mb-5 border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">Verification documents</p>
        <span className="text-[10px] font-medium text-ink-400">{uploadedCount}/{VERIFICATION_DOCS.length} uploaded</span>
      </div>
      <p className="text-xs text-ink-400 mb-3 leading-relaxed">
        Please upload these during your trial so we can verify your practice. PDF or image, up to 10 MB. Only you and our team can view them.
      </p>
      <div className="space-y-2">
        {VERIFICATION_DOCS.map(d => {
          const uploaded = !!meta[d.key]?.path
          return (
            <div key={d.key} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700">
              <FileText size={15} className={uploaded ? 'text-success-500' : 'text-ink-400'} />
              <span className="flex-1 text-sm text-ink-700 dark:text-ink-200 min-w-0 truncate">{d.label}</span>
              {uploaded && <button onClick={() => view(meta[d.key].path)} className="text-[10px] font-semibold text-primary-500 hover:underline flex-shrink-0">View</button>}
              <input ref={el => (fileRefs.current[d.key] = el)} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={e => handleFile(d.key, e)} />
              <Button size="sm" variant={uploaded ? 'ghost' : 'soft'} disabled={busy === d.key} onClick={() => fileRefs.current[d.key]?.click()}>
                {busy === d.key ? <Loader size={12} className="animate-spin" /> : uploaded ? 'Replace' : 'Upload'}
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function AppointmentCard({ appt, onConfirm, onDecline, onOutcome, meetingLink, onViewConsents, onPrescribe }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const isPast = appt.date && appt.date < todayStr
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 flex-1 min-w-0">
          <Avatar name={appt.patientName} />
          <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900 dark:text-ink-100 truncate">{appt.patientName}</p>
          <p className="text-xs text-ink-400 truncate">{appt.patientEmail}</p>
          <p className="text-xs text-ink-400 mt-1 flex items-center gap-1">
            <Calendar size={10} className="flex-shrink-0" />
            {appt.date} · {appt.timeSlot}
          </p>
          {appt.notes && (
            <p className="text-xs text-ink-600 dark:text-ink-300 mt-1.5 italic bg-surface-50 dark:bg-surface-900 px-2 py-1 rounded-lg">"{appt.notes}"</p>
          )}
          {appt.sharedDataTypes?.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-ink-400 mb-1">Patient shared:</p>
              <div className="flex flex-wrap gap-1">
                {appt.sharedDataTypes.map(t => DATA_LABELS[t] ? (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">
                    {DATA_LABELS[t]}
                  </span>
                ) : null)}
              </div>
            </div>
          )}
          <DataSnapshot snapshot={appt.sharedDataSnapshot} />
          {appt.screeningSigned ? (
            <p className="text-[10px] text-success-600 dark:text-success-400 mt-1.5 flex items-center gap-1">
              <FileSignature size={10} className="flex-shrink-0" />
              Documents signed{appt.screeningSignatureName ? `: ${appt.screeningSignatureName}` : ''}
              {onViewConsents && (
                <button onClick={() => onViewConsents(appt)} className="text-primary-500 underline ml-1">View</button>
              )}
            </p>
          ) : appt.screeningRequired && appt.status === 'confirmed' ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
              <FileSignature size={10} className="flex-shrink-0" />
              Awaiting document signature from patient
            </p>
          ) : null}
          {appt.status === 'confirmed' && (
            <AddToCalendar
              appt={{ ...appt, meetingLink }}
              role="provider"
              className="mt-2.5 pt-2.5 border-t border-surface-100 dark:border-surface-800"
            />
          )}
          {appt.status === 'confirmed' && onPrescribe && (
            <button onClick={() => onPrescribe(appt)}
              className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
              <FileText size={12} /> Write prescription
            </button>
          )}
          </div>
        </div>
        {appt.status === 'pending' && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={() => onDecline(appt.id)}
              className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Decline">
              <XCircle size={20} />
            </button>
            <button onClick={() => onConfirm(appt.id)}
              className="p-1.5 rounded-lg text-ink-400 hover:text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10 transition-colors" title="Confirm">
              <CheckCircle size={20} />
            </button>
          </div>
        )}
        {appt.status === 'confirmed' && !isPast && (
          <span className="flex items-center gap-1 text-xs text-success-600 dark:text-success-400 font-medium flex-shrink-0">
            <CheckCircle size={13} />
            {appt.checkedInAt
              ? `Checked in · ${new Date(appt.checkedInAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`
              : 'Confirmed'}
          </span>
        )}
        {appt.status === 'confirmed' && isPast && onOutcome && (
          // Past session not yet closed out — record the outcome for
          // attendance analytics.
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button onClick={() => onOutcome(appt.id, 'completed')}
              className="text-[10px] font-medium px-2 py-1 rounded-lg bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 hover:bg-success-100 transition-colors">
              ✓ Completed
            </button>
            <button onClick={() => onOutcome(appt.id, 'no-show')}
              className="text-[10px] font-medium px-2 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors">
              No-show
            </button>
          </div>
        )}
        {['completed', 'no-show', 'cancelled'].includes(appt.status) && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 ${STATUS_STYLES[appt.status]}`}>
            {STATUS_LABELS[appt.status]}
          </span>
        )}
      </div>
    </Card>
  )
}

// Hourly slots shown on the weekly availability grid (07:00–18:00).
const GRID_TIMES = Array.from({ length: 12 }, (_, i) => `${String(7 + i).padStart(2, '0')}:00`)

function DiaryManager({ providerUid, getDiary, saveDiary }) {
  const [diary, setDiary]               = useState({})
  const [diaryLoading, setDiaryLoading] = useState(true)
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    getDiary(providerUid).then(d => { setDiary(d || {}); setDiaryLoading(false) })
  }, [providerUid])

  const persist = async (updated) => {
    setSaving(true)
    setDiary(updated)
    await saveDiary(providerUid, updated)
    setSaving(false)
  }

  // Tap a cell to open/close that time on that day. Toggling a default-hours
  // day first materialises the defaults as a custom list, then applies it.
  const toggleSlot = (dayKey, time) => {
    const base = slotsForDay(diary, dayKey)
    const next = base.includes(time) ? base.filter(t => t !== time) : [...base, time].sort()
    persist({ ...diary, [dayKey]: next })
  }

  const closeDay = (day) => persist({ ...diary, [day]: [] })
  const resetDay = (day) => {
    const updated = { ...diary }
    delete updated[day]
    return persist(updated)
  }

  if (diaryLoading) return <div className="h-40 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-400 leading-relaxed">
        Tap a cell to open or close that time. Weekdays are open <strong className="text-ink-600 dark:text-ink-300">08:00–16:00</strong> by
        default. Confirmed bookings hide their slot from patients automatically.
      </p>

      <Card className="p-3 overflow-x-auto">
        <div className="min-w-[460px]">
          {/* Header: day names */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '2.6rem repeat(7, 1fr)' }}>
            <div />
            {DAYS.map(d => {
              const closed = dayMode(diary, d.key) === 'closed'
              return (
                <div key={d.key} className="text-center">
                  <p className={`text-[10px] font-bold uppercase ${closed ? 'text-ink-300 dark:text-ink-600' : 'text-ink-500 dark:text-ink-300'}`}>{d.label.slice(0, 3)}</p>
                </div>
              )
            })}
          </div>

          {/* Time rows */}
          {GRID_TIMES.map(time => (
            <div key={time} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '2.6rem repeat(7, 1fr)' }}>
              <div className="text-[9px] text-ink-400 flex items-center justify-end pr-1 timer-nums">{time}</div>
              {DAYS.map(d => {
                const open = slotsForDay(diary, d.key).includes(time)
                return (
                  <button key={d.key + time} onClick={() => toggleSlot(d.key, time)} disabled={saving}
                    title={`${d.label} ${time} — ${open ? 'open' : 'closed'}`}
                    className={`h-6 rounded-md transition-colors ${
                      open
                        ? 'bg-primary-500 hover:bg-primary-600'
                        : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700'
                    }`} />
                )
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Legend + per-day quick actions */}
      <div className="flex items-center gap-3 text-[10px] text-ink-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary-500 inline-block" /> Open</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-surface-200 dark:bg-surface-700 inline-block" /> Closed</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map(d => {
          const closed = dayMode(diary, d.key) === 'closed'
          const custom = dayMode(diary, d.key) === 'custom'
          return (
            <div key={d.key} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-surface-50 dark:bg-surface-800">
              <span className="font-semibold text-ink-600 dark:text-ink-300">{d.label.slice(0, 3)}</span>
              {closed
                ? <button onClick={() => resetDay(d.key)} disabled={saving} className="text-primary-500 hover:underline">reopen</button>
                : <button onClick={() => closeDay(d.key)} disabled={saving} className="text-ink-400 hover:text-red-500">close</button>}
              {custom && !closed && <button onClick={() => resetDay(d.key)} disabled={saving} className="text-ink-400 hover:text-primary-500">reset</button>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// The signed consent records for one appointment — document titles, typed
// name, drawn signature image and timestamp.
function ConsentsModal({ appt, onClose }) {
  const [consents, setConsents] = useState(null)

  useEffect(() => {
    if (!appt) return
    setConsents(null)
    getConsentsForAppointment(appt.id).then(setConsents)
  }, [appt?.id])

  return (
    <Modal open={!!appt} onClose={onClose} title="Signed documents">
      {consents === null ? (
        <div className="py-8 text-center"><Loader size={18} className="animate-spin text-primary-500 mx-auto" /></div>
      ) : consents.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-6">No signed records found for this appointment.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-400">
            Signed by <strong className="text-ink-700 dark:text-ink-300">{appt?.patientName}</strong> for
            the session on {appt?.date} at {appt?.timeSlot}.
          </p>
          {consents.map(c => (
            <div key={c.id} className="p-3 rounded-xl border border-surface-200 dark:border-surface-700 space-y-2">
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-primary-500 flex-shrink-0" />
                <p className="text-xs font-medium text-ink-900 dark:text-ink-100 flex-1">{c.docTitle}</p>
              </div>
              <p className="text-[10px] text-ink-400">
                Signed as <strong className="text-ink-600 dark:text-ink-300">{c.signatureName}</strong>
                {c.signedAt?.seconds ? ` · ${new Date(c.signedAt.seconds * 1000).toLocaleString('en-ZA')}` : ''}
              </p>
              {c.signatureImage && (
                <img src={c.signatureImage} alt={`Signature of ${c.signatureName}`}
                  className="h-16 rounded-lg border border-surface-200 dark:border-surface-700 bg-white" />
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// Optional pre-screening documents (T&Cs, intake consent…) the patient is
// asked to sign after the doctor accepts a booking. Stored in Firestore as
// small PDFs (base64) or plain text — no Cloud Storage needed.
function DocumentsManager({ providerUid }) {
  const [docs, setDocs]         = useState([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const [textOpen, setTextOpen] = useState(false)
  const [textTitle, setTextTitle] = useState('')
  const [textBody, setTextBody]   = useState('')
  const [viewing, setViewing]   = useState(null)
  const pdfRef                  = useRef()

  useEffect(() => {
    getScreeningDocs(providerUid).then(d => { setDocs(d); setDocsLoading(false) })
  }, [providerUid])

  const refresh = async () => setDocs(await getScreeningDocs(providerUid))

  const handlePDF = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    try {
      await addScreeningDocPDF(providerUid, file)
      await refresh()
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleAddText = async () => {
    setBusy(true); setError('')
    try {
      await addScreeningDocText(providerUid, textTitle, textBody)
      setTextOpen(false); setTextTitle(''); setTextBody('')
      await refresh()
    } catch (err) {
      setError(err.message || 'Could not save the document.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this document? New bookings will no longer require it. Already-signed records are kept.')) return
    setBusy(true)
    try {
      await deleteScreeningDoc(providerUid, id)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  if (docsLoading) return <div className="h-20 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-400 leading-relaxed">
        Optional. Upload documents (terms &amp; conditions, consultation agreements, practice policies)
        for patients to sign. When you <strong className="text-ink-600 dark:text-ink-300">accept</strong> a
        booking request, the documents are sent to the patient to read and digitally sign before the
        session. Signatures are stored with each appointment.
      </p>

      {docs.length === 0 ? (
        <Card className="p-4 text-center">
          <FileSignature size={20} className="text-ink-400 mx-auto mb-1.5" />
          <p className="text-xs text-ink-400">No pre-screening documents yet. Patients can book without signing anything.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map(d => (
            <Card key={d.id} className="p-3 flex items-center gap-3">
              <FileText size={16} className="text-primary-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ink-900 dark:text-ink-100 truncate">{d.title}</p>
                <p className="text-[10px] text-ink-400">
                  {d.kind === 'pdf' ? `PDF · ${Math.round((d.size || 0) / 1024)} KB` : 'Text document'}
                </p>
              </div>
              <button
                onClick={() => d.kind === 'pdf' ? openScreeningPDF(d) : setViewing(d)}
                className="text-[10px] font-medium text-primary-500 hover:underline flex-shrink-0">
                View
              </button>
              <button onClick={() => handleDelete(d.id)} disabled={busy}
                className="p-1 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0" title="Remove">
                <Trash2 size={13} />
              </button>
            </Card>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {docs.length < MAX_DOCS && (
        <div className="flex gap-2">
          <Button variant="soft" size="sm" className="flex-1" disabled={busy} onClick={() => pdfRef.current.click()}>
            {busy ? <Loader size={13} className="animate-spin" /> : <>Upload PDF (max {Math.round(MAX_PDF_BYTES / 1024)} KB)</>}
          </Button>
          <Button variant="soft" size="sm" className="flex-1" disabled={busy} onClick={() => { setError(''); setTextOpen(true) }}>
            Write text document
          </Button>
        </div>
      )}
      <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePDF} />

      <Modal open={textOpen} onClose={() => setTextOpen(false)} title="New text document">
        <div className="space-y-3">
          <input value={textTitle} onChange={e => setTextTitle(e.target.value)}
            placeholder="Title, e.g. Terms & Conditions" className={inputCls} />
          <textarea value={textBody} onChange={e => setTextBody(e.target.value)} rows={10}
            placeholder="Paste or type the full document text…"
            className={`${inputCls} resize-none`} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setTextOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={busy || !textTitle.trim() || !textBody.trim()} onClick={handleAddText}>
              {busy ? <Loader size={14} className="animate-spin" /> : 'Save document'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || ''}>
        <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {viewing?.text}
        </p>
      </Modal>
    </div>
  )
}

// A KPI tile — editorial and number-forward: quiet label, ghost icon, an
// oversized metric. The metric stays in the sans (per the reference, serif is
// reserved for headlines). Tappable → detail modal.
function StatCard({ icon: Icon, value, label, onClick }) {
  return (
    <Card role="button" tabIndex={0} onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="p-5 cursor-pointer group hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-400">{label}</p>
        <Icon size={15} className="text-ink-300 dark:text-ink-600 group-hover:text-primary-500 transition-colors" />
      </div>
      <p className="text-[2.1rem] leading-none font-medium tracking-tight text-ink-900 dark:text-ink-100 mt-4">{value}</p>
    </Card>
  )
}

// A shortcut card in the "Manage your practice" row. Single rationed teal tile
// keeps the accent disciplined; the title stays in the sans.
function ToolCard({ icon: Icon, title, desc, badge, onClick }) {
  return (
    <button onClick={onClick}
      className="group text-left rounded-3xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700/60 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-surface-300 dark:hover:border-surface-600">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-primary-50 dark:bg-primary-700/20">
        <Icon size={20} className="text-primary-600 dark:text-primary-300" />
      </div>
      <div className="flex items-center gap-2">
        <p className="font-semibold text-ink-900 dark:text-ink-100 text-[15px]">{title}</p>
        {badge > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-700/25 text-primary-700 dark:text-primary-300">{badge}</span>
        )}
      </div>
      <p className="text-sm text-ink-400 mt-1.5 leading-relaxed">{desc}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
        Open <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
      </span>
    </button>
  )
}

// Contextual attention strip shown at most once at the top of the dashboard.
function Banner({ tone = 'amber', icon: Icon, title, children, action }) {
  const tones = {
    amber: 'bg-warm-50 dark:bg-warm-500/10 border-warm-200 dark:border-warm-500/30 text-warm-700 dark:text-warm-400',
    red:   'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400',
    teal:  'bg-primary-50 dark:bg-primary-700/15 border-primary-200 dark:border-primary-600/40 text-primary-700 dark:text-primary-300',
  }
  return (
    <div className={`mb-5 rounded-2xl border p-4 flex items-start gap-3 ${tones[tone]}`}>
      {Icon && <Icon size={18} className="flex-shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {children && <p className="text-xs opacity-80 leading-relaxed mt-0.5">{children}</p>}
      </div>
      {action && <div className="flex-shrink-0 self-center">{action}</div>}
    </div>
  )
}

// Live camera preview that reads the patient's check-in QR. Only rendered
// when the browser supports BarcodeDetector (Chrome on Android/desktop Mac);
// everywhere else the typed short code is the path.
function CameraScanner({ onPayload, onUnavailable }) {
  const videoRef = useRef(null)

  useEffect(() => {
    let stream, raf, cancelled = false
    const start = async () => {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const tick = async () => {
          if (cancelled) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) { onPayload(codes[0].rawValue); return }
          } catch { /* frame not ready yet — keep polling */ }
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        // Camera denied or detector failed — fall back to the typed code.
        if (!cancelled) onUnavailable?.()
      }
    }
    start()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return <video ref={videoRef} muted playsInline className="w-full aspect-video object-cover rounded-2xl bg-black" />
}

// Reception check-in: scan the patient's QR pass (where supported) or type
// their 6-character code. Matches against the provider's own confirmed
// appointments — no extra reads.
function CheckInModal({ open, onClose, appointments, onCheckIn }) {
  const [input, setInput]       = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [busy, setBusy]         = useState(false)

  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (open) { setInput(''); setScanning(false); setScanError(''); setBusy(false) }
  }, [open])

  const candidates = appointments.filter(a => a.status === 'confirmed' && !a.checkedInAt)
  const code = normalizeCode(input)
  const match = code.length === 6 ? candidates.find(a => shortCodeFor(a.id) === code) : null
  const alreadyIn = code.length === 6
    ? appointments.find(a => a.status === 'confirmed' && a.checkedInAt && shortCodeFor(a.id) === code)
    : null

  const todayStr = new Date().toISOString().split('T')[0]

  const handlePayload = (raw) => {
    const apptId = parseCheckInPayload(raw)
    setScanning(false)
    if (!apptId) { setScanError('That QR code is not a MentisFlow check-in pass.'); return }
    const appt = candidates.find(a => a.id === apptId)
    const done = appointments.find(a => a.id === apptId && a.checkedInAt)
    if (appt) setInput(shortCodeFor(appt.id))
    else if (done) setInput(shortCodeFor(done.id))
    else setScanError('No matching confirmed appointment for that pass.')
  }

  const confirm = async () => {
    if (!match) return
    setBusy(true)
    await onCheckIn(match)
    setBusy(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Check in a patient">
      <div className="space-y-4">
        <p className="text-xs text-ink-400 leading-relaxed">
          Ask the patient for their check-in pass. Type the 6-character code from it
          {canScan ? ', or scan the QR with your camera.' : '.'}
        </p>

        {scanning ? (
          <div className="space-y-2">
            <CameraScanner
              onPayload={handlePayload}
              onUnavailable={() => { setScanning(false); setScanError('Camera unavailable — type the code instead.') }}
            />
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setScanning(false)}>Stop scanning</Button>
          </div>
        ) : (
          <>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setScanError('') }}
              placeholder="e.g. K7M-PQ4"
              autoFocus
              maxLength={8}
              className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-center text-lg font-bold tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            {canScan && (
              <Button variant="soft" size="sm" className="w-full" onClick={() => { setScanError(''); setScanning(true) }}>
                <Camera size={13} /> Scan QR instead
              </Button>
            )}
          </>
        )}

        {scanError && <p className="text-xs text-red-500">{scanError}</p>}

        {match && (
          <div className="p-3.5 rounded-2xl bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/30">
            <div className="flex items-center gap-3">
              <Avatar name={match.patientName} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-100 truncate">{match.patientName}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400">{match.date} at {match.timeSlot}</p>
              </div>
            </div>
            {match.date !== todayStr && (
              <p className="mt-2 text-[11px] text-warm-600 dark:text-warm-500">
                Note: this booking is for {match.date}, not today.
              </p>
            )}
            <Button className="w-full mt-3" disabled={busy} onClick={confirm}>
              {busy ? 'Checking in…' : `Check in ${match.patientName?.split(' ')[0] || 'patient'}`}
            </Button>
          </div>
        )}

        {alreadyIn && !match && (
          <p className="text-xs text-success-600 dark:text-success-400 flex items-center gap-1">
            <CheckCircle size={12} /> {alreadyIn.patientName} is already checked in.
          </p>
        )}

        {code.length === 6 && !match && !alreadyIn && (
          <p className="text-xs text-ink-400">
            No confirmed appointment matches {formatCode(code)}. Double-check the code with the patient.
          </p>
        )}
      </div>
    </Modal>
  )
}

export function ProviderDashboard() {
  const { user }                                                                                                    = useAuth()
  const { showToast }                                                                                               = useApp()
  const { getProvider, getPrivateProfile, getAppointments, updateAppointment, confirmAppointment, saveProvider, getDiary, saveDiary, uploadPhoto, getProviderRatings, createPrescription, uploadVerificationDoc, getVerification, getVerificationURL, getProviderFeeRequests, discloseFee } = useProviders()
  const navigate                                                                                                    = useNavigate()
  const [profile, setProfile]           = useState(null)
  const [appointments, setAppointments] = useState([])
  const [ratings, setRatings]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [editOpen, setEditOpen]         = useState(false)
  const [statModal, setStatModal]       = useState(null)
  const [consentAppt, setConsentAppt]   = useState(null)
  const [prescribeAppt, setPrescribeAppt] = useState(null)
  const [checkInOpen, setCheckInOpen]   = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [feeRequests, setFeeRequests]   = useState([])
  const fileRef                         = useRef()

  useEffect(() => {
    if (!user) return
    Promise.all([
      getProvider(user.uid),
      getAppointments(user.uid),
      getProviderRatings(user.uid),
      getPrivateProfile(user.uid),
      getProviderFeeRequests(user.uid),
    ]).then(([p, appts, rats, priv, fees]) => {
      if (!p) { navigate('/provider/signup'); return }
      // Merge owner-only fields (meeting link) into the working profile.
      setProfile({ ...p, ...priv })
      setAppointments(appts.sort((a, b) => {
        const order = { pending: 0, confirmed: 1, cancelled: 2 }
        return (order[a.status] ?? 3) - (order[b.status] ?? 3)
      }))
      setRatings(rats)
      setFeeRequests(fees)
      setLoading(false)
    })
  }, [user])

  const handleDiscloseFee = async (req) => {
    setFeeRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'disclosed' } : r))
    try {
      await discloseFee(req.id)
      showToast('Fee shared — the patient has been notified')
    } catch {
      showToast('Could not share the fee. Please try again.', { variant: 'error' })
    }
  }

  const handleAction = async (id, status) => {
    const appt = appointments.find(a => a.id === id)
    let extra = {}
    if (status === 'confirmed' && appt) {
      // Also records the slot in the provider's bookedSlots map so it
      // disappears from patients' booking views, and flags the appointment
      // if pre-screening documents must be signed.
      const res = await confirmAppointment(appt)
      extra = { screeningRequired: res?.screeningRequired || false }
    } else {
      // Tag provider-initiated cancellations so the patient (not the doctor)
      // gets the notification.
      await updateAppointment(id, status === 'cancelled' ? { status, cancelledBy: 'provider' } : { status })
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status, ...extra } : a))
  }

  // Reception check-in: stamp the arrival time on the appointment. The rules
  // allow either party to add fields (only uids/createdAt are locked).
  const handleCheckInAppt = async (appt) => {
    const checkedInAt = new Date().toISOString()
    try {
      await updateAppointment(appt.id, { checkedInAt })
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, checkedInAt } : a))
      showToast(`${appt.patientName || 'Patient'} checked in`)
    } catch {
      showToast('Could not check the patient in. Please try again.', { variant: 'error' })
    }
  }

  const handleCreatePrescription = async ({ items, notes }) => {
    try {
      await createPrescription({
        patientUid:  prescribeAppt.patientUid,
        patientName: prescribeAppt.patientName,
        providerUid: user.uid,
        providerName: profile?.name || '',
        items, notes,
      })
      setPrescribeAppt(null)
      showToast('Prescription sent to your patient')
    } catch (e) {
      showToast(
        e?.code === 'permission-denied'
          ? 'This patient needs to add you as their doctor (from Connect) before you can prescribe.'
          : 'Could not send the prescription. Please try again.',
        { variant: 'error' },
      )
    }
  }

  const handleSave = async (updates) => {
    await saveProvider(user.uid, updates)
    setProfile(p => ({ ...p, ...updates }))
  }

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    const url = await uploadPhoto(user.uid, file, 'provider')
    if (url) setProfile(p => ({ ...p, photoURL: url }))
    else showToast('Could not upload photo. Use an image under 5MB and try again.', { variant: 'error' })
    setPhotoUploading(false)
    e.target.value = '' // allow re-selecting the same file after a failure
  }

  // Tool cards deep-link to the in-page management sections below.
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (loading) return (
    <PageWrapper>
      <div className="space-y-3 mt-6">
        {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}
      </div>
    </PageWrapper>
  )

  const pending        = appointments.filter(a => a.status === 'pending')
  const confirmed      = appointments.filter(a => a.status === 'confirmed')
  // Revenue-bearing sessions: still-upcoming confirmed + held (completed).
  const sessions       = appointments.filter(a => ['confirmed', 'completed'].includes(a.status))
  const accepted       = appointments.filter(a => ['confirmed', 'completed', 'no-show'].includes(a.status))
  const declined       = appointments.filter(a => a.status === 'cancelled')
  const resolved       = appointments.filter(a => a.status !== 'pending')
  const acceptanceRate = resolved.length > 0
    ? Math.round((accepted.length / resolved.length) * 100)
    : null
  const uniquePatients = new Set(appointments.map(a => a.patientUid)).size

  // Group appointments per patient for the "Unique patients" detail view
  const patientList = Object.values(appointments.reduce((map, a) => {
    const key = a.patientUid || a.patientEmail
    if (!map[key]) map[key] = { name: a.patientName, email: a.patientEmail, total: 0, pending: 0, confirmed: 0, cancelled: 0, lastDate: '' }
    const p = map[key]
    p.total++
    p[a.status] = (p[a.status] || 0) + 1
    if ((a.date || '') > p.lastDate) p.lastDate = a.date
    return map
  }, {})).sort((a, b) => b.total - a.total)
  const profileViews   = profile?.profileViews || 0
  const planLabel      = profile?.subscriptionPlan === 'featured' ? '⭐ Featured' : '✓ Standard'
  const platformLabel  = PLATFORMS.find(p => p.value === profile?.meetingPlatform)?.label || null
  const trialing       = profile?.subscriptionStatus === 'trialing'
  const trialDays      = trialing ? trialDaysLeft(profile?.trialEndsAt) : 0
  const subInactive    = profile && profile.subscriptionActive === false
  const statusLabel    = trialing
    ? `Free trial · ${trialDays} day${trialDays === 1 ? '' : 's'} left`
    : subInactive ? `${planLabel} plan · Inactive` : `${planLabel} plan · Active`

  // Prefer live-computed average from loaded ratings if available; fall back to stored aggregate
  const ratingCount = ratings.length || (profile?.ratingCount || 0)
  const ratingAvg   = ratingCount > 0 && ratings.length > 0
    ? RATING_METRICS.reduce((acc, m) => {
        acc[m.key] = +(ratings.reduce((s, r) => s + (r[m.key] || 0), 0) / ratings.length).toFixed(2)
        return acc
      }, {})
    : (profile?.ratingAvg || null)

  // Recent comments (max 5)
  const recentComments = ratings
    .filter(r => r.comment?.trim())
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5)

  const hasRevenue = sessions.length > 0 && profile?.sessionFee
  const grossEarnings = sessions.length * Number(profile?.sessionFee || 0)

  return (
    <PageWrapper wide>
      {/* Editorial greeting — oversized serif on paper, an italicised greeting
          as the one flourish, and a matched pill-button pair. No saturated
          surface: the type and the whitespace carry it. */}
      <header className="pt-1 pb-9 sm:pb-12 border-b border-surface-200 dark:border-surface-800 mb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <button
              onClick={() => fileRef.current.click()}
              disabled={photoUploading}
              title="Change photo"
              className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 group ring-1 ring-surface-200 dark:ring-surface-700 mt-1.5">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-50 dark:bg-primary-700/20 flex items-center justify-center text-2xl">{profile?.avatar || '🧠'}</div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {photoUploading ? <Loader size={15} className="text-white animate-spin" /> : <Camera size={15} className="text-white" />}
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />

            <div className="min-w-0">
              <h1 className="font-serif text-[2.15rem] sm:text-[3rem] leading-[1.08] tracking-[-0.02em] text-ink-900 dark:text-ink-100">
                <span className="italic text-ink-400 dark:text-ink-500">{greeting()},</span>{' '}
                <span className="text-balance">{profile?.name || 'your practice'}</span>
              </h1>
              <div className="flex items-center gap-2.5 mt-3 flex-wrap text-sm text-ink-500 dark:text-ink-400">
                <span>{statusLabel}</span>
                {ratingCount > 0 && ratingAvg && (
                  <>
                    <span className="text-ink-300 dark:text-ink-600">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Star size={12} className="fill-primary-500 text-primary-500" /> {ratingAvg.overall?.toFixed(1)} ({ratingCount} review{ratingCount !== 1 ? 's' : ''})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 pt-1.5">
            <Button variant="outline" size="pill" onClick={() => navigate('/provider/analytics')}>
              <LineChart size={14} /> Analytics
            </Button>
            <Button size="pill" onClick={() => setEditOpen(true)}>
              <Edit2 size={14} /> Edit profile
            </Button>
          </div>
        </div>
        <div className="flex sm:hidden gap-2 mt-5">
          <Button size="pill" className="flex-1" onClick={() => setEditOpen(true)}>
            <Edit2 size={14} /> Edit profile
          </Button>
          <Button variant="outline" size="pill" className="flex-1" onClick={() => navigate('/provider/analytics')}>
            <LineChart size={14} /> Analytics
          </Button>
        </div>
      </header>

      {/* Contextual attention strips — at most a couple, styled consistently. */}
      {subInactive && (
        <Banner tone="red" icon={XCircle} title="Your subscription is inactive"
          action={<Button size="sm" onClick={() => navigate('/provider/signup')}>Choose a plan</Button>}>
          {profile?.subscriptionStatus === 'trial_expired'
            ? 'Your free trial has ended. Your profile is hidden from patients until you choose a plan. Your data and reviews are safe.'
            : 'Your profile is hidden from patients until you reactivate your plan.'}
        </Banner>
      )}
      {trialing && trialDays <= 7 && (
        <Banner tone="teal" icon={Clock}
          title={trialDays === 0 ? 'Your free trial ends today' : `${trialDays} day${trialDays === 1 ? '' : 's'} left in your free trial`}
          action={<Button size="sm" variant="soft" onClick={() => navigate('/provider/signup')}>Choose a plan</Button>}>
          Pick a plan now to keep your profile visible to patients without interruption.
        </Banner>
      )}
      {profile?.approvalStatus === 'pending' && (
        <Banner tone="amber" icon={Clock} title="Awaiting approval"
          action={<Button size="sm" variant="soft" onClick={() => goTo('verification')}>Upload docs</Button>}>
          Your profile is being reviewed and isn't visible to patients yet. You can set up your diary and profile in the meantime. You'll go live as soon as you're approved.
        </Banner>
      )}
      {profile?.suspended && (
        <Banner tone="red" icon={XCircle} title="Account suspended">
          Your profile has been suspended and is hidden from patients.
          {profile.suspensionReason ? ` Reason: ${profile.suspensionReason}` : ''} Contact support to resolve this.
        </Banner>
      )}

      {/* KPI row — tap any tile for the full breakdown. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        <StatCard icon={Eye} value={profileViews} label="Profile views" onClick={() => setStatModal('views')} />
        <StatCard icon={Users} value={uniquePatients} label="Unique patients" onClick={() => setStatModal('patients')} />
        <StatCard icon={TrendingUp} value={acceptanceRate !== null ? `${acceptanceRate}%` : 'N/A'} label="Accept rate" onClick={() => setStatModal('acceptRate')} />
        {hasRevenue
          ? <StatCard icon={Wallet} value={`R${grossEarnings.toLocaleString()}`} label="Est. earnings" onClick={() => setStatModal('revenue')} />
          : <StatCard icon={Clock} value={pending.length} label="Pending" onClick={() => setStatModal('pending')} />}
      </div>

      {/* Booking requests (wide) + practice detail rail. */}
      <div className="grid lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2 space-y-5" id="requests">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-serif text-[1.6rem] leading-none tracking-tight text-ink-900 dark:text-ink-100">Booking requests</h2>
            <div className="flex items-center gap-3 text-[13px] text-ink-400">
              <button onClick={() => setStatModal('pending')} className="hover:text-primary-600 transition-colors">{pending.length} pending</button>
              <button onClick={() => setStatModal('confirmedList')} className="hover:text-primary-600 transition-colors">{confirmed.length} confirmed</button>
              <button onClick={() => setStatModal('total')} className="hover:text-primary-600 transition-colors">All</button>
              {/* Reception check-in only makes sense for practices that see patients in person. */}
              {['in-person', 'both'].includes(profile?.consultationType) && (
                <Button variant="outline" size="pill" className="!px-3.5 !py-1.5 text-xs" onClick={() => setCheckInOpen(true)}>
                  <QrCode size={13} /> Check in
                </Button>
              )}
            </div>
          </div>

          {appointments.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-4xl mb-3">💭</p>
              <p className="text-sm font-medium text-ink-600 dark:text-ink-300">No appointment requests yet</p>
              <p className="text-xs text-ink-400 mt-1">Your profile is live. Patients can book you from the Connect page.</p>
            </Card>
          ) : (pending.length === 0 && confirmed.length === 0) ? (
            <Card className="p-10 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm font-medium text-ink-600 dark:text-ink-300">You're all caught up</p>
              <p className="text-xs text-ink-400 mt-1">No pending or upcoming appointments right now.</p>
            </Card>
          ) : (
            <>
              {pending.length > 0 && (
                <div>
                  <p className="text-[13px] font-medium text-ink-400 mb-3">Pending · {pending.length}</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {pending.map(a => (
                      <AppointmentCard key={a.id} appt={a}
                        onConfirm={id => handleAction(id, 'confirmed')}
                        onDecline={id => handleAction(id, 'cancelled')} />
                    ))}
                  </div>
                </div>
              )}
              {confirmed.length > 0 && (
                <div>
                  <p className="text-[13px] font-medium text-ink-400 mb-3">Confirmed · {confirmed.length}</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {confirmed.map(a => (
                      <AppointmentCard key={a.id} appt={a} onConfirm={() => {}} onDecline={() => {}}
                        onOutcome={(id, status) => handleAction(id, status)}
                        meetingLink={profile?.meetingLink}
                        onViewConsents={setConsentAppt}
                        onPrescribe={setPrescribeAppt} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-5">
          {feeRequests.some(r => r.status === 'pending') && (
            <Card className="p-5">
              <p className="font-serif text-lg tracking-tight text-ink-900 dark:text-ink-100 mb-0.5">Fee requests</p>
              <p className="text-xs text-ink-400 mb-3">Patients asking you to share your session fee. Disclosing notifies them of your R{profile?.sessionFee || '—'} fee.</p>
              <div className="space-y-2">
                {feeRequests.filter(r => r.status === 'pending').map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900">
                    <span className="flex-1 text-sm text-ink-700 dark:text-ink-200 truncate">{r.patientName || 'A patient'}</span>
                    <Button size="sm" variant="soft" onClick={() => handleDiscloseFee(r)}>Disclose fee</Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <p className="font-serif text-lg tracking-tight text-ink-900 dark:text-ink-100 mb-3">Your profile</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3"><span className="text-ink-400">Type</span><span className="font-medium text-ink-800 dark:text-ink-200 text-right truncate">{profile?.type}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-ink-400">Experience</span><span className="font-medium text-ink-800 dark:text-ink-200">{profile?.experience} yrs</span></div>
              {profile?.hpcsa && <div className="flex items-center justify-between gap-3"><span className="text-ink-400">HPCSA</span><span className="font-medium text-ink-800 dark:text-ink-200">{profile.hpcsa}</span></div>}
              <div className="flex items-center justify-between gap-3"><span className="text-ink-400">Session fee</span><span className="font-medium text-ink-800 dark:text-ink-200">R{profile?.sessionFee}{profile?.hideFee ? ' · hidden' : ''}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-ink-400">Availability</span><span className="font-medium text-ink-800 dark:text-ink-200 text-right truncate">{profile?.availability || '—'}</span></div>
            </div>
            {profile?.bio && (
              <p className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800 text-xs text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-4">{profile.bio}</p>
            )}
            {/* Only ever link out to http(s) URLs — a stored javascript: URI must not become a clickable script. */}
            {/^https?:\/\//i.test(profile?.meetingLink || '') && (
              <a href={profile.meetingLink} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1.5 text-xs text-primary-500 hover:underline w-fit">
                <ExternalLink size={10} /> {platformLabel ? `${platformLabel} meeting room` : 'Your meeting room'}
              </a>
            )}
            {!profile?.meetingLink && platformLabel && (
              <p className="mt-3 text-xs text-ink-400">Platform: {platformLabel} · <button onClick={() => setEditOpen(true)} className="text-primary-500 hover:underline">Add link</button></p>
            )}
            {(profile?.specialties || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {(profile?.specialties || []).map(s => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">{s}</span>
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>

      {/* Patient ratings */}
      {ratingCount > 0 && ratingAvg && (
        <div id="reviews" className="mb-12">
          <h2 className="font-serif text-[1.6rem] leading-none tracking-tight text-ink-900 dark:text-ink-100 mb-5">Patient ratings</h2>
          <Card className="p-6">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {RATING_METRICS.map(({ key, label, desc }) => {
                const val = ratingAvg[key] || 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-xs font-medium text-ink-800 dark:text-ink-200">{label}</span>
                        <span className="text-[10px] text-ink-400 ml-1.5">{desc}</span>
                      </div>
                      <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">{val.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                      <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${(val / 5) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {recentComments.length > 0 && (
              <div className="mt-5 pt-4 border-t border-surface-100 dark:border-surface-800">
                <p className="text-[13px] font-medium text-ink-400 mb-2">Recent feedback</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {recentComments.map((r, i) => (
                    <div key={i} className="bg-surface-50 dark:bg-surface-900 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1"><StarDisplay value={r.overall} size={11} /></div>
                      <p className="text-xs text-ink-600 dark:text-ink-300 italic">"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Manage your practice — shortcut launcher into the sections below. */}
      <div className="mb-12">
        <h2 className="font-serif text-[1.6rem] leading-none tracking-tight text-ink-900 dark:text-ink-100 mb-5">Manage your practice</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ToolCard icon={CalendarCheck} title="Availability" desc="Open and close time slots in your weekly diary." onClick={() => goTo('availability')} />
          <ToolCard icon={FileSignature} title="Documents" desc="Pre-screening forms patients sign before a session." onClick={() => goTo('documents')} />
          <ToolCard icon={LineChart} title="Analytics" desc="Bookings, ratings and growth for your practice." onClick={() => navigate('/provider/analytics')} />
          {profile && profile.approvalStatus !== 'approved' ? (
            <ToolCard icon={BadgeCheck} title="Verification" desc="Upload the documents that verify your practice." onClick={() => goTo('verification')} />
          ) : ratingCount > 0 ? (
            <ToolCard icon={Star} title="Reviews" desc="See what your patients are saying." onClick={() => goTo('reviews')} />
          ) : (
            <ToolCard icon={Edit2} title="Public profile" desc="Keep your bio, fee and photo up to date." onClick={() => setEditOpen(true)} />
          )}
        </div>
      </div>

      {/* Verification documents — required while the account is not yet approved. */}
      {profile && profile.approvalStatus !== 'approved' && (
        <div id="verification" className="mb-8 scroll-mt-6">
          <VerificationSection uid={user.uid} upload={uploadVerificationDoc} getMeta={getVerification} getUrl={getVerificationURL} showToast={showToast} />
        </div>
      )}

      <div id="availability" className="mb-12 scroll-mt-6">
        <h2 className="font-serif text-[1.6rem] leading-none tracking-tight text-ink-900 dark:text-ink-100 mb-5">Availability</h2>
        <DiaryManager providerUid={user.uid} getDiary={getDiary} saveDiary={saveDiary} />
      </div>

      <div id="documents" className="mb-6 scroll-mt-6">
        <h2 className="font-serif text-[1.6rem] leading-none tracking-tight text-ink-900 dark:text-ink-100 mb-5">Pre-screening documents</h2>
        <DocumentsManager providerUid={user.uid} />
      </div>

      <ConsentsModal appt={consentAppt} onClose={() => setConsentAppt(null)} />
      <CheckInModal open={checkInOpen} onClose={() => setCheckInOpen(false)}
        appointments={appointments} onCheckIn={handleCheckInAppt} />
      <EditModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onSave={handleSave} />
      <PrescriptionModal open={!!prescribeAppt} onClose={() => setPrescribeAppt(null)} appt={prescribeAppt} onSubmit={handleCreatePrescription} />
      <StatDetailModal kind={statModal} onClose={() => setStatModal(null)}
        stats={{ appointments, pending, confirmed, sessions, declined, patientList, profileViews, uniquePatients, acceptanceRate, sessionFee: profile?.sessionFee }} />
    </PageWrapper>
  )
}
