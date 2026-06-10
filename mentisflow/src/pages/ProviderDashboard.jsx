import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, CheckCircle, XCircle, Clock, ExternalLink, Users, Calendar, BadgeCheck, Save, X, Eye, TrendingUp, Camera, Loader, Star } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useProviders } from '../hooks/useProviders'
import { AddToCalendar } from '../components/ui/AddToCalendar'
import { slotsForDay, dayMode, DEFAULT_HOURS } from '../utils/availability'
import { trialDaysLeft } from '../utils/pricing'

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

function StarDisplay({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size}
          className={n <= Math.round(value || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-surface-300 dark:text-surface-600'}
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
            <span className="text-sm">😊</span>
            <div>
              <p className="text-[10px] text-ink-400">Avg mood</p>
              <p className="text-xs font-semibold text-ink-800 dark:text-ink-200">
                {snapshot.checkin.avgMood}/5
                <span className="text-ink-400 font-normal ml-1">{MOOD_LABELS[Math.round(snapshot.checkin.avgMood)]}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">⚡</span>
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
            value={profileViews > 0 ? `${Math.round((appointments.length / profileViews) * 100)}%` : '—'}
            sub="Share of profile views that turned into a booking" />
          <MetricRow label="Unique patients reached" value={uniquePatients} />
          <p className="text-[11px] text-ink-400 leading-relaxed pt-1">
            💡 A complete bio, profile photo, and up-to-date diary slots help convert views into bookings.
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
            value={acceptanceRate !== null ? `${acceptanceRate}%` : '—'}
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
            💡 Responding quickly to pending requests — even declining — keeps patients informed and your profile trustworthy.
          </p>
        </div>
      ),
    },
    revenue: {
      title: 'Revenue breakdown',
      body: (
        <div className="space-y-2">
          <MetricRow label="Your earnings" value={`R${gross.toLocaleString()}`}
            sub={`${sessions.length} session${sessions.length !== 1 ? 's' : ''} × R${fee.toLocaleString()} — no commission, you keep 100%`} />
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
            Estimate only — based on your current session fee and confirmed bookings. Payments are settled directly between you and the patient.
          </p>
        </div>
      ),
    },
    pending: {
      title: `Pending requests (${pending.length})`,
      body: pending.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-6">No pending requests. You're all caught up. 🎉</p>
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
    availability:    profile?.availability || '',
    meetingPlatform: profile?.meetingPlatform || '',
    meetingLink:     profile?.meetingLink || '',
    city:            profile?.city || '',
    province:        profile?.province || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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

function AppointmentCard({ appt, onConfirm, onDecline, onOutcome, meetingLink }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const isPast = appt.date && appt.date < todayStr
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{appt.patientName}</p>
          <p className="text-xs text-ink-400">{appt.patientEmail}</p>
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
          {appt.status === 'confirmed' && (
            <AddToCalendar
              appt={{ ...appt, meetingLink }}
              role="provider"
              className="mt-2.5 pt-2.5 border-t border-surface-100 dark:border-surface-800"
            />
          )}
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
            <CheckCircle size={13} /> Confirmed
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

function DiaryManager({ providerUid, getDiary, saveDiary }) {
  const [diary, setDiary]               = useState({})
  const [diaryLoading, setDiaryLoading] = useState(true)
  const [selectedDay, setSelectedDay]   = useState('mon')
  const [newTime, setNewTime]           = useState('09:00')
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

  // Adding/removing a slot on a default-hours day first materialises the
  // defaults as a custom list, then applies the change.
  const addSlot = async () => {
    if (!newTime) return
    const base = slotsForDay(diary, selectedDay)
    if (base.includes(newTime)) return
    await persist({ ...diary, [selectedDay]: [...base, newTime].sort() })
  }

  const removeSlot = async (day, time) => {
    const base = slotsForDay(diary, day)
    await persist({ ...diary, [day]: base.filter(t => t !== time) })
  }

  const closeDay = (day) => persist({ ...diary, [day]: [] })

  const resetDay = (day) => {
    const updated = { ...diary }
    delete updated[day]
    return persist(updated)
  }

  if (diaryLoading) return <div className="h-20 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />

  const MODE_BADGES = {
    default: { label: 'Default hours', cls: 'bg-surface-100 dark:bg-surface-700 text-ink-400' },
    custom:  { label: 'Custom',        cls: 'bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400' },
    closed:  { label: 'Closed',        cls: 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400' },
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-400 leading-relaxed">
        Weekday slots ({DEFAULT_HOURS[0]}–{DEFAULT_HOURS[DEFAULT_HOURS.length - 1]}, hourly) are{' '}
        <strong className="text-ink-600 dark:text-ink-300">open by default</strong>. Add or remove times to
        customise a day, or close it entirely. Confirmed bookings hide their slot automatically.
      </p>

      <Card className="p-4">
        <p className="text-xs font-medium text-ink-400 mb-3">Add availability slot</p>
        <div className="flex gap-2">
          <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
            {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
          <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <Button size="sm" onClick={addSlot} disabled={saving}>Add</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {DAYS.map(({ key, label }) => {
          const mode  = dayMode(diary, key)
          const slots = slotsForDay(diary, key)
          const badge = MODE_BADGES[mode]
          return (
            <div key={key} className="rounded-xl border border-surface-100 dark:border-surface-800 p-3">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-ink-700 dark:text-ink-200 flex-1">{label}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${badge.cls}`}>{badge.label}</span>
                {mode !== 'closed' && (
                  <button onClick={() => closeDay(key)} disabled={saving}
                    className="text-[10px] text-ink-400 hover:text-red-500 transition-colors">Close day</button>
                )}
                {mode !== 'default' && (
                  <button onClick={() => resetDay(key)} disabled={saving}
                    className="text-[10px] text-ink-400 hover:text-primary-500 transition-colors">Reset to default</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {slots.length === 0 ? (
                  <span className="text-xs text-ink-400 italic">No slots — patients can't book this day</span>
                ) : (
                  slots.map(time => (
                    <span key={time}
                      className="flex items-center gap-1 text-xs bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg">
                      {time}
                      <button onClick={() => removeSlot(key, time)} disabled={saving} className="hover:text-red-500 transition-colors">
                        <X size={9} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ProviderDashboard() {
  const { user }                                                                                                    = useAuth()
  const { getProvider, getAppointments, updateAppointment, confirmAppointment, saveProvider, getDiary, saveDiary, uploadPhoto, getProviderRatings } = useProviders()
  const navigate                                                                                                    = useNavigate()
  const [profile, setProfile]           = useState(null)
  const [appointments, setAppointments] = useState([])
  const [ratings, setRatings]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [editOpen, setEditOpen]         = useState(false)
  const [statModal, setStatModal]       = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileRef                         = useRef()

  useEffect(() => {
    if (!user) return
    Promise.all([
      getProvider(user.uid),
      getAppointments(user.uid),
      getProviderRatings(user.uid),
    ]).then(([p, appts, rats]) => {
      if (!p) { navigate('/provider/signup'); return }
      setProfile(p)
      setAppointments(appts.sort((a, b) => {
        const order = { pending: 0, confirmed: 1, cancelled: 2 }
        return (order[a.status] ?? 3) - (order[b.status] ?? 3)
      }))
      setRatings(rats)
      setLoading(false)
    })
  }, [user])

  const handleAction = async (id, status) => {
    const appt = appointments.find(a => a.id === id)
    if (status === 'confirmed' && appt) {
      // Also records the slot in the provider's bookedSlots map so it
      // disappears from patients' booking views.
      await confirmAppointment(appt)
    } else {
      await updateAppointment(id, { status })
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
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
    setPhotoUploading(false)
  }

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

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Provider Dashboard</h1>
          <p className="text-sm text-ink-400 mt-0.5">{statusLabel}</p>
        </div>
        <Button variant="soft" size="sm" onClick={() => setEditOpen(true)}>
          <Edit2 size={13} /> Edit profile
        </Button>
      </div>

      {subInactive && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">Your subscription is inactive</p>
          <p className="text-[11px] text-red-600/80 dark:text-red-400/80 leading-relaxed mb-2">
            {profile?.subscriptionStatus === 'trial_expired'
              ? 'Your free trial has ended — your profile is hidden from patients until you choose a plan. Your data and reviews are safe.'
              : 'Your profile is hidden from patients until you reactivate your plan.'}
          </p>
          <Button size="sm" onClick={() => navigate('/provider/signup')}>Choose a plan</Button>
        </div>
      )}
      {trialing && trialDays <= 7 && (
        <div className="mb-5 p-3.5 rounded-2xl bg-primary-50 dark:bg-primary-700/15 border border-primary-200 dark:border-primary-600/40">
          <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-0.5">
            ⏳ {trialDays === 0 ? 'Your free trial ends today' : `${trialDays} day${trialDays === 1 ? '' : 's'} left in your free trial`}
          </p>
          <p className="text-[11px] text-primary-700/80 dark:text-primary-300/80 leading-relaxed mb-2">
            Pick a plan now to keep your profile visible to patients without interruption.
          </p>
          <Button size="sm" variant="soft" onClick={() => navigate('/provider/signup')}>Choose a plan</Button>
        </div>
      )}
      {profile?.approvalStatus === 'pending' && (
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">⏳ Awaiting approval</p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
            Your profile is being reviewed and isn't visible to patients yet. You can set up your diary
            and profile in the meantime — you'll go live as soon as you're approved.
          </p>
        </div>
      )}
      {profile?.suspended && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">🚫 Account suspended</p>
          <p className="text-[11px] text-red-600/80 dark:text-red-400/80 leading-relaxed">
            Your profile has been suspended and is hidden from patients.
            {profile.suspensionReason ? ` Reason: ${profile.suspensionReason}` : ''} Contact support to resolve this.
          </p>
        </div>
      )}

      {/* Profile card */}
      <Card className="p-4 mb-5">
        <div className="flex items-center gap-3">
          {/* Photo with upload overlay */}
          <button
            className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 group"
            onClick={() => fileRef.current.click()}
            disabled={photoUploading}
            title="Change photo"
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-3xl">
                {profile?.avatar || '🧠'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {photoUploading
                ? <Loader size={16} className="text-white animate-spin" />
                : <Camera size={16} className="text-white" />
              }
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-ink-900 dark:text-ink-100">{profile?.name}</p>
              <BadgeCheck size={14} className="text-primary-500" />
            </div>
            <p className="text-xs text-ink-400">{profile?.type} · {profile?.experience} yrs exp</p>
            {profile?.hpcsa && <p className="text-xs text-ink-400">HPCSA: {profile.hpcsa}</p>}
            <p className="text-xs text-ink-400 mt-0.5">R{profile?.sessionFee}/session · {profile?.availability}</p>
            {ratingCount > 0 && ratingAvg && (
              <div className="flex items-center gap-1.5 mt-1">
                <StarDisplay value={ratingAvg.overall} size={12} />
                <span className="text-xs text-ink-400">{ratingAvg.overall?.toFixed(1)} ({ratingCount} review{ratingCount !== 1 ? 's' : ''})</span>
              </div>
            )}
          </div>
        </div>
        {profile?.bio && (
          <p className="mt-3 text-xs text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-3">{profile.bio}</p>
        )}
        {/* Only ever link out to http(s) URLs — a stored javascript: URI must
            not become a clickable script. */}
        {/^https?:\/\//i.test(profile?.meetingLink || '') && (
          <a href={profile.meetingLink} target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-xs text-primary-500 hover:underline w-fit">
            <ExternalLink size={10} /> {platformLabel ? `${platformLabel} meeting room` : 'Your meeting room'}
          </a>
        )}
        {!profile?.meetingLink && platformLabel && (
          <p className="mt-2 text-xs text-ink-400">Platform: {platformLabel} · <button onClick={() => setEditOpen(true)} className="text-primary-500 hover:underline">Add meeting link</button></p>
        )}
        <div className="flex flex-wrap gap-1 mt-3">
          {(profile?.specialties || []).map(s => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">{s}</span>
          ))}
        </div>
      </Card>

      {/* Activity stats — tap any card for a detailed breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { kind: 'views',      icon: Eye,        color: 'text-primary-500', value: profileViews, label: 'Profile views' },
          { kind: 'patients',   icon: Users,      color: 'text-success-500', value: uniquePatients, label: 'Unique patients' },
          { kind: 'acceptRate', icon: TrendingUp, color: 'text-warm-500',    value: acceptanceRate !== null ? `${acceptanceRate}%` : '—', label: 'Accept rate' },
        ].map(({ kind, icon: Icon, color, value, label }) => (
          <Card key={kind} role="button" tabIndex={0} onClick={() => setStatModal(kind)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatModal(kind) } }}
            className="p-3 text-center cursor-pointer transition-all hover:border-primary-300 dark:hover:border-primary-600 active:scale-95">
            <Icon size={17} className={`${color} mx-auto mb-1`} />
            <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{value}</p>
            <p className="text-xs text-ink-400">{label}</p>
          </Card>
        ))}
      </div>

      {/* Revenue estimate — tap for per-session breakdown */}
      {sessions.length > 0 && profile?.sessionFee && (
        <Card role="button" tabIndex={0} onClick={() => setStatModal('revenue')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatModal('revenue') } }}
          className="p-4 mb-5 cursor-pointer transition-all hover:border-primary-300 dark:hover:border-primary-600 active:scale-[0.98]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Revenue estimate</p>
            <span className="text-[10px] text-primary-500 font-medium">Tap for breakdown</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-ink-400 mb-0.5">Sessions</p>
              <p className="text-lg font-bold text-ink-900 dark:text-ink-100">{sessions.length}</p>
              <p className="text-[10px] text-ink-400">confirmed + completed</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-400 mb-0.5">Per session</p>
              <p className="text-lg font-bold text-ink-900 dark:text-ink-100">
                R{Number(profile.sessionFee).toLocaleString()}
              </p>
              <p className="text-[10px] text-ink-400">no commission</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-400 mb-0.5">Your earnings</p>
              <p className="text-lg font-bold text-success-600 dark:text-success-400">
                R{(sessions.length * Number(profile.sessionFee)).toLocaleString()}
              </p>
              <p className="text-[10px] text-ink-400">you keep 100%</p>
            </div>
          </div>
        </Card>
      )}

      {/* Rating breakdown */}
      {ratingCount > 0 && ratingAvg && (
        <Card className="p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Patient ratings</p>
            <span className="text-xs text-ink-400">{ratingCount} review{ratingCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-3">
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
                    <div className="h-full rounded-full bg-primary-500 transition-all duration-500"
                      style={{ width: `${(val / 5) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {recentComments.length > 0 && (
            <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mb-2">Recent feedback</p>
              <div className="space-y-2">
                {recentComments.map((r, i) => (
                  <div key={i} className="bg-surface-50 dark:bg-surface-900 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <StarDisplay value={r.overall} size={11} />
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-300 italic">"{r.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { kind: 'pending',       label: 'Pending',   value: pending.length,      icon: Clock,       color: 'text-warm-500' },
          { kind: 'confirmedList', label: 'Confirmed', value: confirmed.length,    icon: CheckCircle, color: 'text-success-500' },
          { kind: 'total',         label: 'Total',     value: appointments.length, icon: Users,       color: 'text-primary-500' },
        ].map(({ kind, label, value, icon: Icon, color }) => (
          <Card key={label} role="button" tabIndex={0} onClick={() => setStatModal(kind)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatModal(kind) } }}
            className="p-3 text-center cursor-pointer transition-all hover:border-primary-300 dark:hover:border-primary-600 active:scale-95">
            <Icon size={17} className={`${color} mx-auto mb-1`} />
            <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{value}</p>
            <p className="text-xs text-ink-400">{label}</p>
          </Card>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="py-14 text-center mb-6">
          <p className="text-4xl mb-3">💭</p>
          <p className="text-sm text-ink-400">No appointment requests yet.</p>
          <p className="text-xs text-ink-400 mt-1">Your profile is live. Patients can book you from the Connect page.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Pending requests ({pending.length})</p>
              <div className="space-y-3">
                {pending.map(a => (
                  <AppointmentCard key={a.id} appt={a}
                    onConfirm={id => handleAction(id, 'confirmed')}
                    onDecline={id => handleAction(id, 'cancelled')} />
                ))}
              </div>
            </div>
          )}
          {confirmed.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Confirmed ({confirmed.length})</p>
              <div className="space-y-3">
                {confirmed.map(a => (
                  <AppointmentCard key={a.id} appt={a} onConfirm={() => {}} onDecline={() => {}}
                    onOutcome={(id, status) => handleAction(id, status)}
                    meetingLink={profile?.meetingLink} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4">Manage Diary</p>
        <DiaryManager providerUid={user.uid} getDiary={getDiary} saveDiary={saveDiary} />
      </div>

      <EditModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onSave={handleSave} />
      <StatDetailModal kind={statModal} onClose={() => setStatModal(null)}
        stats={{ appointments, pending, confirmed, sessions, declined, patientList, profileViews, uniquePatients, acceptanceRate, sessionFee: profile?.sessionFee }} />
    </PageWrapper>
  )
}
