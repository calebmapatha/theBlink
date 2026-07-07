import { useState, useEffect, useMemo } from 'react'
import { Search, Clock, Globe, BadgeCheck, Calendar, X, HeartHandshake, Link2, Unlink, Check, Star, MessageSquare, Loader, ClipboardList, Video, MapPin, FileText, FileSignature } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useProviders } from '../hooks/useProviders'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { AddToCalendar } from '../components/ui/AddToCalendar'
import { availableSlotsForDate } from '../utils/availability'
import { submitReport } from '../hooks/useAdmin'
import { getScreeningDocs, signScreeningDocs, openScreeningPDF } from '../utils/screeningDocs'
import { SignatureField } from '../components/ui/SignatureField'
import { DatePicker } from '../components/ui/DatePicker'
import { detectLocation } from '../utils/geolocate'

const SPECIALTIES  = ['ADHD', 'Anxiety', 'Depression', 'OCD', 'PTSD', 'Autism Spectrum', 'Bipolar Disorder', 'Stress Management', 'Sleep Disorders', 'Trauma']
const SA_PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']

const DATA_TYPES = [
  { id: 'habits',        label: 'Habit streaks',    emoji: '🔄' },
  { id: 'checkin',       label: 'Mood & energy',     emoji: '😊' },
  { id: 'tasks',         label: 'Task completion',   emoji: '✅' },
  { id: 'treatmentPlan', label: 'Treatment plan',    emoji: '📋' },
]

// Mental-health-focused KPIs: the things that actually help someone judge
// whether a practitioner is right for them. Keys are unchanged (validated in
// firestore.rules and aggregated server-side); only the wording is refined.
const RATING_METRICS = [
  { key: 'communication',   label: 'Listening',       desc: 'Listened and explained things clearly' },
  { key: 'empathy',         label: 'Felt safe',       desc: 'Made me feel heard, safe and not judged' },
  { key: 'professionalism', label: 'Professionalism', desc: 'On time, prepared and respectful' },
  { key: 'treatmentPlan',   label: 'Helpfulness',     desc: 'Their approach felt helpful for me' },
  { key: 'overall',         label: 'Overall',         desc: "I'd recommend them to others" },
]

// A session can only be rated once it has actually taken place — never before.
const sessionHasPassed = (a) => {
  if (!a?.date) return false
  const dt = new Date(`${a.date}T${a.timeSlot || '23:59'}:00`)
  return !isNaN(dt.getTime()) && dt.getTime() <= Date.now()
}

function buildDataSnapshot(uid, types) {
  // Guard: only ever read the authenticated user's own data. The caller must
  // pass the current user's uid; bail otherwise so we never read another
  // account's locally-cached health data.
  if (!uid) return {}
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })
  const snapshot = {}
  try {
    if (types.includes('habits')) {
      const raw = JSON.parse(localStorage.getItem(`u_${uid}_adhd_habits`) || '{"definitions":[],"completions":{}}')
      snapshot.habits = (raw.definitions || []).map(h => ({
        name: h.name, emoji: h.emoji,
        completed: last30.filter(d => (raw.completions[d] || []).includes(h.id)).length,
        total: 30,
      }))
    }
    if (types.includes('checkin')) {
      const raw = JSON.parse(localStorage.getItem(`u_${uid}_adhd_checkins`) || '{}')
      const entries = last30.map(d => raw[d]).filter(Boolean)
      if (entries.length > 0) {
        snapshot.checkin = {
          avgMood:   +(entries.reduce((s, e) => s + (Number(e.mood)   || 0), 0) / entries.length).toFixed(1),
          avgEnergy: +(entries.reduce((s, e) => s + (Number(e.energy) || 0), 0) / entries.length).toFixed(1),
          count: entries.length,
        }
      }
    }
    if (types.includes('tasks')) {
      const raw = JSON.parse(localStorage.getItem(`u_${uid}_adhd_tasks`) || '[]')
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
      const recent = raw.filter(t => new Date(t.createdAt) >= cutoff)
      const completed = recent.filter(t => t.completedAt).length
      snapshot.tasks = { total: recent.length, completed, rate: recent.length > 0 ? Math.round(completed / recent.length * 100) : 0 }
    }
    if (types.includes('treatmentPlan')) {
      const raw = JSON.parse(localStorage.getItem(`u_${uid}_treatment_plan`) || 'null')
      if (raw) {
        snapshot.treatmentPlan = {
          goals:        (raw.goals || []).filter(g => g.status === 'active'),
          medications:  (raw.medications || []).filter(m => m.active),
          recentNotes:  (raw.sessionNotes || []).slice(0, 2),
          symptoms:     raw.symptoms || [],
        }
      }
    }
  } catch {}
  return snapshot
}

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            className={n <= (hovered || value) ? 'text-yellow-400 fill-yellow-400' : 'text-surface-300 dark:text-surface-600'}
          />
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ value, count }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-1">
      <Star size={11} className="text-yellow-400 fill-yellow-400" />
      <span className="text-xs font-medium text-ink-700 dark:text-ink-300">{value.toFixed(1)}</span>
      {count != null && <span className="text-[10px] text-ink-400">({count})</span>}
    </div>
  )
}

const PLATFORM_LABELS = { zoom: 'Zoom', meet: 'Google Meet', teams: 'MS Teams', whereby: 'Whereby', skype: 'Skype', other: 'Video call' }

function ReportModal({ provider, open, onClose, user }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy]     = useState(false)
  const [done, setDone]     = useState(false)
  const send = async () => {
    if (!reason.trim()) return
    setBusy(true)
    try {
      await submitReport({
        reporterUid:   user.uid,
        reporterEmail: user.email || '',
        providerUid:   provider.id,
        providerName:  provider.name,
        reason:        reason.trim(),
      })
      setDone(true)
    } finally { setBusy(false) }
  }
  const close = () => { setReason(''); setDone(false); onClose() }
  if (!provider) return null
  return (
    <Modal open={open} onClose={close} title="Report this provider">
      {done ? (
        <div className="text-center py-5 space-y-3">
          <p className="text-4xl">🛡️</p>
          <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">Report received</p>
          <p className="text-xs text-ink-400">Our team will review it. Thank you for keeping the platform safe.</p>
          <Button className="w-full" onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-ink-400">
            Reporting <strong className="text-ink-700 dark:text-ink-200">{provider.name}</strong>. Your report is
            confidential and reviewed by the platform team.
          </p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
            placeholder="What happened?"
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-sm text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={close}>Cancel</Button>
            <Button className="flex-1 bg-red-500 hover:bg-red-600" disabled={!reason.trim() || busy} onClick={send}>
              {busy ? <Loader size={13} className="animate-spin" /> : 'Submit report'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ProviderProfileModal({ provider, open, onClose, onBook, onLink, linked, onReport, onRequestFee, feeRequested }) {
  if (!provider) return null
  const rating     = provider.ratingAvg
  const ratingCnt  = provider.ratingCount || 0
  const platform   = provider.meetingPlatform ? PLATFORM_LABELS[provider.meetingPlatform] || provider.meetingPlatform : null

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="space-y-5 -mt-1">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
            {provider.photoURL ? (
              <img src={provider.photoURL} alt={provider.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-3xl">
                {provider.avatar || '🧠'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-ink-900 dark:text-ink-100">{provider.name}</p>
              <BadgeCheck size={15} className="text-primary-500 flex-shrink-0" />
            </div>
            <p className="text-sm text-ink-500 dark:text-ink-400">{provider.type}</p>
            {provider.experience && <p className="text-xs text-ink-400">{provider.experience} years experience</p>}
            {provider.hpcsa && <p className="text-xs text-ink-400">HPCSA: {provider.hpcsa}</p>}
            {ratingCnt > 0 && rating && <StarDisplay value={rating.overall} count={ratingCnt} />}
          </div>
        </div>

        {/* Rating breakdown */}
        {ratingCnt > 0 && rating && (
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-900 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Patient ratings</p>
            {RATING_METRICS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] text-ink-500 dark:text-ink-400 w-28 flex-shrink-0">{label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                  <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${((rating[key] || 0) / 5) * 100}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-ink-600 dark:text-ink-300 w-6 text-right">{(rating[key] || 0).toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bio */}
        {provider.bio && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1.5">About</p>
            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">{provider.bio}</p>
          </div>
        )}

        {/* Specialties */}
        {(provider.specialties || []).length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1.5">Specialties</p>
            <div className="flex flex-wrap gap-1.5">
              {provider.specialties.map(s => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-2">
          {(provider.city || provider.province) && (
            <div className="flex items-center gap-2.5">
              <MapPin size={14} className="text-ink-400 flex-shrink-0" />
              <span className="text-sm text-ink-700 dark:text-ink-300">
                {[provider.city, provider.province].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {provider.availability && (
            <div className="flex items-center gap-2.5">
              <Clock size={14} className="text-ink-400 flex-shrink-0" />
              <span className="text-sm text-ink-700 dark:text-ink-300">{provider.availability}</span>
            </div>
          )}
          {(provider.languages || []).length > 0 && (
            <div className="flex items-center gap-2.5">
              <Globe size={14} className="text-ink-400 flex-shrink-0" />
              <span className="text-sm text-ink-700 dark:text-ink-300">{provider.languages.join(', ')}</span>
            </div>
          )}
          {platform && (
            <div className="flex items-center gap-2.5">
              <Video size={14} className="text-ink-400 flex-shrink-0" />
              <span className="text-sm text-ink-700 dark:text-ink-300">Sessions via {platform}</span>
            </div>
          )}
        </div>

        {/* Consultation mode + location. In-person practices show a precise
            map of the address; remote-only shows an "online" note (no map). */}
        {(() => {
          const mode = provider.consultationType || 'remote'
          const inPerson = mode === 'in-person' || mode === 'both'
          const mapQuery = provider.address || [provider.city, provider.province, 'South Africa'].filter(Boolean).join(', ')
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                {inPerson ? <MapPin size={14} className="text-ink-400 flex-shrink-0" /> : <Video size={14} className="text-ink-400 flex-shrink-0" />}
                <span className="text-sm text-ink-700 dark:text-ink-300">
                  {mode === 'both' ? 'Online & in-person sessions' : inPerson ? 'In-person sessions' : 'Online sessions only'}
                </span>
              </div>
              {inPerson && provider.address && (
                <p className="text-xs text-ink-400 pl-6">{provider.address}</p>
              )}
              {inPerson && mapQuery && (
                <div className="rounded-2xl overflow-hidden border border-surface-100 dark:border-surface-700">
                  <iframe
                    title={`Map of ${mapQuery}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                    className="w-full h-40 border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )
        })()}

        {/* Fee */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-900">
          <span className="text-sm text-ink-500 dark:text-ink-400">Session fee</span>
          {provider.hideFee ? (
            feeRequested ? (
              <span className="text-xs font-medium text-success-600 dark:text-success-400 flex items-center gap-1">
                <Check size={12} /> Requested — you'll be notified
              </span>
            ) : (
              <Button size="sm" variant="soft" onClick={() => onRequestFee?.(provider)}>
                Request fee
              </Button>
            )
          ) : (
            <div>
              <span className="text-xl font-bold text-ink-900 dark:text-ink-100">R{provider.sessionFee}</span>
              <span className="text-xs text-ink-400 ml-1">/ session</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onLink && !linked && (
            <Button variant="ghost" className="flex-1" onClick={() => { onLink(provider); onClose() }}>
              <Link2 size={13} /> Link doctor
            </Button>
          )}
          {linked && (
            <span className="flex-1 flex items-center justify-center text-xs px-2 py-1.5 rounded-xl bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400 font-medium">Linked</span>
          )}
          <Button className="flex-1" onClick={() => { onBook(provider); onClose() }}>
            <Calendar size={13} /> Book appointment
          </Button>
        </div>

        {onReport && (
          <button onClick={() => { onClose(); onReport(provider) }}
            className="w-full text-center text-[11px] text-ink-400 hover:text-red-500 transition-colors">
            Report this provider
          </button>
        )}
      </div>
    </Modal>
  )
}

function ProviderCard({ provider, onBook, onLink, linked, onViewProfile }) {
  const rating    = provider.ratingAvg?.overall
  const ratingCnt = provider.ratingCount || 0

  return (
    <Card interactive className="p-4">
      {/* Tappable profile area */}
      <button className="w-full text-left" onClick={() => onViewProfile?.(provider)}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0">
            {provider.photoURL ? (
              <img src={provider.photoURL} alt={provider.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-2xl">
                {provider.avatar || '🧠'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-ink-900 dark:text-ink-100 text-sm">{provider.name}</p>
              <BadgeCheck size={14} className="text-primary-500 flex-shrink-0" />
            </div>
            <p className="text-xs text-ink-400 mt-0.5">{provider.type} · {provider.experience} yrs exp</p>
            {provider.hpcsa && <p className="text-xs text-ink-400">HPCSA: {provider.hpcsa}</p>}
            {ratingCnt > 0 && <StarDisplay value={rating} count={ratingCnt} />}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(provider.specialties || []).slice(0, 3).map(s => (
                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">{s}</span>
              ))}
              {(provider.specialties || []).length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-100 dark:bg-surface-700 text-ink-400">+{(provider.specialties || []).length - 3} more</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-4 text-xs text-ink-400 flex-wrap">
          {(provider.city || provider.province) && (
            <span className="flex items-center gap-1"><MapPin size={10} /> {[provider.city, provider.province].filter(Boolean).join(', ')}</span>
          )}
          {provider.availability && (
            <span className="flex items-center gap-1"><Clock size={10} /> {provider.availability}</span>
          )}
          {(provider.languages || []).length > 0 && (
            <span className="flex items-center gap-1"><Globe size={10} /> {provider.languages.join(', ')}</span>
          )}
        </div>

        {provider.bio && (
          <p className="mt-2 text-xs text-ink-400 line-clamp-2">{provider.bio}</p>
        )}
        <p className="mt-1.5 text-xs text-primary-500 font-medium">View full profile →</p>
      </button>

      <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between gap-2">
        <div>
          {provider.hideFee ? (
            <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">Fee on request</span>
          ) : (
            <>
              <span className="text-sm font-bold text-ink-900 dark:text-ink-100">R{provider.sessionFee}</span>
              <span className="text-xs text-ink-400"> / session</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {onLink && !linked && (
            <Button size="sm" variant="ghost" onClick={() => onLink(provider)}>
              <Link2 size={13} /> Link
            </Button>
          )}
          {linked && (
            <span className="text-xs px-2 py-1 rounded-full bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400 font-medium">Linked</span>
          )}
          <Button size="sm" onClick={() => onBook(provider)}>
            <Calendar size={13} /> Book
          </Button>
        </div>
      </div>
    </Card>
  )
}

function RatingModal({ open, onClose, appointment, providerName, onSubmit }) {
  const [scores, setScores] = useState({ communication: 0, empathy: 0, professionalism: 0, treatmentPlan: 0, overall: 0 })
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const setScore = (key, val) => setScores(s => ({ ...s, [key]: val }))
  const allFilled = Object.values(scores).every(v => v > 0)

  const handleSubmit = async () => {
    if (!allFilled) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit({ ...scores, comment })
      setDone(true)
    } catch {
      setError('Could not submit your rating. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setDone(false)
    setScores({ communication: 0, empathy: 0, professionalism: 0, treatmentPlan: 0, overall: 0 })
    setComment('')
    setError('')
    onClose()
  }

  if (!appointment) return null

  return (
    <Modal open={open} onClose={handleClose} title={`Rate your session`}>
      {done ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-5xl">⭐</p>
          <p className="font-semibold text-ink-900 dark:text-ink-100">Thank you for your feedback!</p>
          <p className="text-sm text-ink-400">Your rating helps other patients find the right care.</p>
          <Button className="w-full" onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            Rate your session with <strong className="text-ink-800 dark:text-ink-100">{providerName}</strong> on {appointment.date}.
          </p>

          {RATING_METRICS.map(({ key, label, desc }) => (
            <div key={key}>
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{label}</p>
                  <p className="text-xs text-ink-400">{desc}</p>
                </div>
                {scores[key] > 0 && (
                  <span className="text-xs font-semibold text-primary-500">{scores[key]}/5</span>
                )}
              </div>
              <StarRating value={scores[key]} onChange={v => setScore(key, v)} />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1.5">
              <MessageSquare size={11} className="inline mr-1" />
              Additional comments <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Anything else you'd like to share…"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
          </div>

          {!allFilled && (
            <p className="text-xs text-ink-400 text-center">Please rate all 5 areas to submit.</p>
          )}
          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button className="flex-1" disabled={!allFilled || submitting} onClick={handleSubmit}>
              {submitting ? <Loader size={14} className="animate-spin" /> : 'Submit rating'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function BookingModal({ provider, open, onClose, bookAppointment, user, userProfile, getBookingInfo }) {
  const [date, setDate]               = useState('')
  const [timeSlot, setTimeSlot]       = useState(null)
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [done, setDone]               = useState(false)
  const [bookingInfo, setBookingInfo] = useState({ diary: {}, bookedSlots: {} })
  const [diaryLoading, setDiaryLoading] = useState(false)
  const [sharedTypes, setSharedTypes] = useState([])
  const [consentGiven, setConsentGiven] = useState(false)
  // Loaded only to tell the patient up-front that signing will be required
  // if the doctor accepts — the actual signing happens after confirmation.
  const [screeningDocs, setScreeningDocs] = useState([])

  useEffect(() => {
    if (!provider || !open) return
    setDiaryLoading(true)
    Promise.all([getBookingInfo(provider.id), getScreeningDocs(provider.id)]).then(([info, docs]) => {
      setBookingInfo(info)
      setScreeningDocs(docs)
      setDiaryLoading(false)
    })
  }, [provider?.id, open])

  // Open-by-default: weekday default hours unless the provider customised or
  // closed the day, minus slots already confirmed for that date.
  const availableSlots = useMemo(
    () => availableSlotsForDate(bookingInfo.diary, bookingInfo.bookedSlots, date),
    [date, bookingInfo],
  )

  const toggleType = (id) =>
    setSharedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const handleBook = async () => {
    if (!date || !timeSlot) return
    setLoading(true)
    try {
      const sharing = sharedTypes.length > 0
      const snapshot = sharing ? buildDataSnapshot(user.uid, sharedTypes) : {}
      await bookAppointment({
        providerUid:         provider.id,
        providerName:        provider.name,
        patientUid:          user.uid,
        patientName:         userProfile?.profile?.displayName || user?.displayName || user?.email,
        patientEmail:        user?.email,
        date,
        timeSlot,
        notes,
        sharedDataTypes:    sharedTypes,
        sharedDataSnapshot: snapshot,
        // POPIA: record explicit consent when health data is shared.
        consentGiven:       sharing ? consentGiven : false,
        consentTimestamp:   sharing && consentGiven ? new Date().toISOString() : null,
      })
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setDone(false); setDate(''); setNotes(''); setTimeSlot(null); setSharedTypes([]); setConsentGiven(false)
    onClose()
  }

  if (!provider) return null

  return (
    <Modal open={open} onClose={handleClose} title={`Book with ${provider.name}`}>
      {done ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-5xl">✅</p>
          <p className="font-semibold text-ink-900 dark:text-ink-100">Request sent!</p>
          <p className="text-sm text-ink-400">{provider.name} will confirm your appointment soon.</p>
          <Button className="w-full" onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">Preferred date</label>
            <DatePicker
              value={date}
              onChange={d => { setDate(d); setTimeSlot(null) }}
              min={new Date().toISOString().split('T')[0]}
              placeholder="Pick a date"
            />
          </div>

          {date && (
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-2">Available slots</label>
              {diaryLoading ? (
                <p className="text-xs text-ink-400">Loading slots…</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-ink-400 bg-surface-50 dark:bg-surface-900 px-3 py-2 rounded-xl">
                  No open slots for this day. It may be fully booked or the provider is unavailable. Try another date.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map(slot => (
                    <button key={slot} onClick={() => setTimeSlot(slot)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        timeSlot === slot
                          ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                          : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                      }`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="What would you like to discuss?"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-2">Share app data with doctor (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              {DATA_TYPES.map(t => (
                <button key={t.id} onClick={() => toggleType(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-colors ${
                    sharedTypes.includes(t.id)
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                      : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                  }`}>
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                  {sharedTypes.includes(t.id) && <Check size={10} className="ml-auto text-primary-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
            {sharedTypes.length > 0 && (
              <label className="flex items-start gap-2.5 mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 cursor-pointer">
                <input type="checkbox" checked={consentGiven} onChange={() => setConsentGiven(v => !v)}
                  className="mt-0.5 w-4 h-4 rounded accent-primary-500 flex-shrink-0" />
                <span className="text-[11px] text-ink-700 dark:text-ink-300 leading-relaxed">
                  I consent to sharing the selected health data with {provider.name} for the purpose of my
                  mental health consultation. I understand I can withdraw this consent at any time. See our{' '}
                  <a href={`${import.meta.env.BASE_URL}privacy`} target="_blank" rel="noopener noreferrer"
                    className="text-primary-500 underline" onClick={e => e.stopPropagation()}>Privacy Policy</a>.
                </span>
              </label>
            )}
          </div>

          {screeningDocs.length > 0 && (
            <div className="px-3 py-2.5 rounded-xl border border-primary-200 dark:border-primary-700/40 bg-primary-50/50 dark:bg-primary-700/10 flex items-start gap-2">
              <FileSignature size={13} className="text-primary-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-ink-700 dark:text-ink-300 leading-relaxed">
                If {provider.name} accepts your request, you'll be asked to digitally sign{' '}
                {screeningDocs.length === 1 ? '1 document' : `${screeningDocs.length} documents`}{' '}
                ({screeningDocs.map(d => d.title).join(', ')}) before your session.
              </p>
            </div>
          )}

          <div className="px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900 text-xs text-ink-400">
            {provider.hideFee ? (
              <>Session fee: <strong className="text-ink-700 dark:text-ink-300">on request</strong> · Payment arranged directly with the provider after confirmation.</>
            ) : (
              <>Session fee: <strong className="text-ink-700 dark:text-ink-300">R{provider.sessionFee}</strong> · Payment arranged directly with the provider after confirmation.</>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button className="flex-1" disabled={!date || !timeSlot || loading || (sharedTypes.length > 0 && !consentGiven)} onClick={handleBook}>
              {loading ? 'Sending…' : 'Send Request'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// After the doctor accepts, their pre-screening / consultation agreement
// documents land here for the patient to read and digitally sign — drawn
// signature (signature_pad) plus typed full name.
function SignDocumentsModal({ appt, open, onClose, user, userProfile, onSigned, onNothingToSign }) {
  const [docs, setDocs]             = useState(null)
  const [agreed, setAgreed]         = useState([])
  const [sigImage, setSigImage]     = useState(null)
  const [sigName, setSigName]       = useState('')
  const [viewingDoc, setViewingDoc] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (!appt || !open) return
    setDocs(null); setAgreed([]); setSigImage(null); setSigName(''); setError('')
    getScreeningDocs(appt.providerUid).then(setDocs)
  }, [appt?.id, open])

  const toggleAgreed = (id) =>
    setAgreed(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  const canSign = docs?.length > 0 && agreed.length === docs.length &&
    !!sigImage && sigName.trim().length >= 2

  const handleSign = async () => {
    if (!canSign) return
    setSubmitting(true); setError('')
    try {
      await signScreeningDocs({
        appointmentId:  appt.id,
        providerUid:    appt.providerUid,
        patientUid:     user.uid,
        patientName:    userProfile?.profile?.displayName || user?.displayName || user?.email,
        signatureName:  sigName,
        signatureImage: sigImage,
        docs,
      })
      onSigned(appt.id)
      onClose()
    } catch {
      setError('Could not save your signature. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!appt) return null

  return (
    <>
    <Modal open={open && !viewingDoc} onClose={onClose} title="Sign documents">
      {docs === null ? (
        <div className="py-8 text-center"><Loader size={18} className="animate-spin text-primary-500 mx-auto" /></div>
      ) : docs.length === 0 ? (
        <div className="space-y-3 text-center py-4">
          <p className="text-sm text-ink-700 dark:text-ink-300">
            {appt.providerName} no longer requires any documents for this appointment.
          </p>
          <Button className="w-full" onClick={() => { onNothingToSign(appt.id); onClose() }}>OK</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-ink-400 leading-relaxed">
            {appt.providerName} accepted your appointment for{' '}
            <strong className="text-ink-700 dark:text-ink-300">{appt.date} at {appt.timeSlot}</strong>.
            Please read and sign the following before your session.
          </p>

          <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="p-3 rounded-xl border border-surface-200 dark:border-surface-700 flex items-start gap-2.5">
                <input type="checkbox" checked={agreed.includes(d.id)} onChange={() => toggleAgreed(d.id)}
                  className="mt-0.5 w-4 h-4 rounded accent-primary-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink-900 dark:text-ink-100">{d.title}</p>
                  <button
                    onClick={() => d.kind === 'pdf' ? openScreeningPDF(d) : setViewingDoc(d)}
                    className="text-[11px] text-primary-500 font-medium underline inline-flex items-center gap-1 mt-0.5">
                    <FileText size={10} className="flex-shrink-0" />
                    {d.kind === 'pdf' ? 'Open PDF' : 'Read document'}
                  </button>
                  <p className="text-[10px] text-ink-400 mt-0.5">Tick the box to confirm you've read and agree.</p>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1.5">Your signature</label>
            <SignatureField onChange={setSigImage} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">Full legal name</label>
            <input value={sigName} onChange={e => setSigName(e.target.value)}
              placeholder="Type your full name"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>

          <p className="text-[10px] text-ink-400 leading-relaxed">
            By signing you agree to the documents above. Your signature and name are stored
            securely and shared only with {appt.providerName}.
          </p>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Later</Button>
            <Button className="flex-1" disabled={!canSign || submitting} onClick={handleSign}>
              {submitting ? <Loader size={14} className="animate-spin" /> : 'Sign & submit'}
            </Button>
          </div>
          {!canSign && (
            <p className="text-[10px] text-ink-400 text-center -mt-1">
              Tick every document, draw your signature and type your full name to submit.
            </p>
          )}
        </div>
      )}
    </Modal>

    {/* Sibling modal (not nested) so its fixed positioning isn't trapped by
        the outer modal's transform; the signing modal hides while reading. */}
    <Modal open={!!viewingDoc} onClose={() => setViewingDoc(null)} title={viewingDoc?.title || ''}>
      <div className="space-y-3">
        <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-wrap max-h-[55vh] overflow-y-auto">
          {viewingDoc?.text}
        </p>
        <Button className="w-full" onClick={() => {
          if (viewingDoc && !agreed.includes(viewingDoc.id)) toggleAgreed(viewingDoc.id)
          setViewingDoc(null)
        }}>
          I have read this. Agree &amp; close
        </Button>
      </div>
    </Modal>
    </>
  )
}

export function Connect() {
  const {
    providers, loading, loadMore, hasMore, bookAppointment,
    getBookingInfo, linkDoctor, getLinkedDoctor, unlinkDoctor,
    searchProviderByHPCSA, getPatientAppointments,
    incrementProfileViews, submitRating, getRating, updateAppointment,
    createFeeRequest, getMyFeeRequests,
  } = useProviders()
  const { user }        = useAuth()
  const { userProfile, showToast } = useApp()
  const navigate        = useNavigate()

  // Providers whose (hidden) session fee this patient has already asked to see.
  const [feeRequestedSet, setFeeRequestedSet] = useState(new Set())
  useEffect(() => {
    if (!user) return
    getMyFeeRequests(user.uid).then(rows => setFeeRequestedSet(new Set(rows.map(r => r.providerUid))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleRequestFee = async (provider) => {
    setFeeRequestedSet(prev => new Set([...prev, provider.id]))
    try {
      await createFeeRequest({
        patientUid: user.uid,
        patientName: userProfile?.profile?.displayName || user.email?.split('@')[0] || '',
        providerUid: provider.id,
        providerName: provider.name,
      })
      showToast("Fee requested — you'll be notified when they share it")
    } catch {
      showToast('Could not send the request. Please try again.', { variant: 'error' })
    }
  }

  const [tab, setTab]                   = useState('find')
  const [search, setSearch]             = useState('')
  const [typeFilter, setTypeFilter]     = useState('All')
  const [specFilter, setSpecFilter]     = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [userProvince, setUserProvince] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [booking, setBooking]           = useState(null)

  const [linkedDoctor, setLinkedDoctor]     = useState(undefined)
  const [linkLoading, setLinkLoading]       = useState(true)
  const [hpcsaQuery, setHpcsaQuery]         = useState('')
  const [searchResult, setSearchResult]     = useState(null)
  const [searchError, setSearchError]       = useState('')
  const [myAppointments, setMyAppointments] = useState([])
  const [ratedSet, setRatedSet]             = useState(new Set())
  const [ratingAppt, setRatingAppt]         = useState(null)
  const [viewingProvider, setViewingProvider] = useState(null)
  const [reportingProvider, setReportingProvider] = useState(null)
  const [signingAppt, setSigningAppt]       = useState(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getLinkedDoctor(user.uid),
      getPatientAppointments(user.uid),
    ]).then(async ([doc, appts]) => {
      setLinkedDoctor(doc || null)
      const sorted = appts.sort((a, b) => (a.date > b.date ? 1 : -1))
      setMyAppointments(sorted)
      setLinkLoading(false)

      // Check which held sessions already have a rating
      const ratable = sorted.filter(a => ['confirmed', 'completed'].includes(a.status))
      const checks = await Promise.all(ratable.map(a => getRating(a.id).then(r => r ? a.id : null)))
      setRatedSet(new Set(checks.filter(Boolean)))
    })
  }, [user])

  const handleBookClick = (provider) => {
    incrementProfileViews(provider.id)
    setBooking(provider)
  }

  const handleHpcsaSearch = async () => {
    setSearchError('')
    setSearchResult(null)
    const q = hpcsaQuery.trim()
    if (!q) return
    let result = null
    if (/^(MP|PS)\d+/i.test(q)) {
      result = await searchProviderByHPCSA(q.toUpperCase())
    } else {
      result = providers.find(p => p.name?.toLowerCase().includes(q.toLowerCase())) || null
    }
    if (!result) setSearchError('No provider found with that HPCSA number or name.')
    else setSearchResult(result)
  }

  const handleNearMe = async () => {
    setLocationLoading(true)
    try {
      const { province } = await detectLocation()
      if (province) {
        setUserProvince(province)
        setProvinceFilter(province)
      }
    } catch { /* denied or offline: user picks a province manually */ }
    setLocationLoading(false)
  }

  const handleLink = async (provider) => {
    await linkDoctor(user.uid, provider.id)
    setLinkedDoctor(provider)
    setSearchResult(null)
    setHpcsaQuery('')
  }

  const handleUnlink = async () => {
    await unlinkDoctor(user.uid)
    setLinkedDoctor(null)
  }

  const handleRatingSubmit = async (scores) => {
    if (!ratingAppt || !linkedDoctor) return
    await submitRating({
      appointmentId: ratingAppt.id,
      providerId:    ratingAppt.providerUid,
      patientUid:    user.uid,
      ...scores,
    })
    setRatedSet(prev => new Set([...prev, ratingAppt.id]))
  }

  // Revoke a request the patient sent (pending) or cancel a confirmed booking.
  // cancelledBy lets the notification function alert the practitioner.
  const [cancelling, setCancelling] = useState(null)
  const handleCancelAppt = async (a) => {
    setCancelling(a.id)
    try {
      await updateAppointment(a.id, { status: 'cancelled', cancelledBy: 'patient' })
      setMyAppointments(prev => prev.map(x => x.id === a.id ? { ...x, status: 'cancelled', cancelledBy: 'patient' } : x))
      showToast(a.status === 'pending' ? 'Request cancelled' : 'Appointment cancelled')
    } catch {
      showToast('Could not cancel. Please try again.', { variant: 'error' })
    }
    setCancelling(null)
  }

  const filtered = providers.filter(p => {
    if (typeFilter !== 'All' && p.type !== typeFilter) return false
    if (specFilter && !(p.specialties || []).includes(specFilter)) return false
    if (provinceFilter && p.province !== provinceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name?.toLowerCase().includes(q) ||
             (p.specialties || []).some(s => s.toLowerCase().includes(q)) ||
             p.bio?.toLowerCase().includes(q) ||
             p.hpcsa?.toLowerCase().includes(q) ||
             p.city?.toLowerCase().includes(q) ||
             p.province?.toLowerCase().includes(q)
    }
    return true
  })

  const upcomingAppts = myAppointments.filter(a => a.status !== 'cancelled')

  return (
    <PageWrapper>
      <div className="relative mb-5 p-4 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 text-white overflow-hidden shadow-md shadow-primary-500/20">
        <div className="absolute -top-8 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <HeartHandshake size={16} className="opacity-80" />
            <p className="text-xs font-bold opacity-80 uppercase tracking-wider">Mental Health Journey</p>
          </div>
          <h1 className="text-xl font-bold mb-0.5">You deserve support</h1>
          <p className="text-sm opacity-80">Certified HPCSA-registered psychiatrists &amp; psychologists, available online.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {[
          { key: 'find',      label: 'Find a Doctor' },
          { key: 'my-doctor', label: 'My Doctor' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary-500 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'find' && (
        <>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, HPCSA number or specialty…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-ink-900 dark:text-ink-100 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-400" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            {['All', 'Psychiatrist', 'Psychologist'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {/* Province / location filter */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5 overflow-x-auto flex-1 pb-0.5" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => setProvinceFilter('')}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !provinceFilter ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
                }`}>
                All provinces
              </button>
              {SA_PROVINCES.map(prov => (
                <button key={prov} onClick={() => setProvinceFilter(prov === provinceFilter ? '' : prov)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    provinceFilter === prov
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
                  }`}>
                  {userProvince === prov && <MapPin size={9} className="flex-shrink-0" />}
                  {prov}
                </button>
              ))}
            </div>
            <button
              onClick={handleNearMe}
              disabled={locationLoading}
              title="Use my location"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-surface-200 dark:border-surface-700 text-ink-400 hover:text-primary-500 hover:border-primary-300 transition-colors disabled:opacity-50">
              {locationLoading
                ? <Loader size={12} className="animate-spin" />
                : <MapPin size={12} />}
              Near me
            </button>
          </div>

          <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['', ...SPECIALTIES].map((s, i) => (
              <button key={i} onClick={() => setSpecFilter(s === specFilter ? '' : s)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  specFilter === s && s !== ''
                    ? 'bg-warm-400 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
                }`}>
                {s || 'All specialties'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">{providers.length === 0 ? '🌱' : '🔍'}</p>
              <p className="text-sm text-ink-400">
                {providers.length === 0
                  ? 'No providers have joined yet. Check back soon.'
                  : 'No providers match your filters.'}
              </p>
              {providers.length > 0 && (
                <button onClick={() => { setSearch(''); setTypeFilter('All'); setSpecFilter(''); setProvinceFilter('') }}
                  className="mt-3 text-xs text-primary-500 hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-400">
                {filtered.length} provider{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== providers.length && ` of ${providers.length} loaded`}
              </p>
              <AnimatePresence>
                {filtered.map((p, i) => (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}>
                    <ProviderCard
                      provider={p}
                      onBook={handleBookClick}
                      onLink={handleLink}
                      linked={linkedDoctor?.id === p.id}
                      onViewProfile={setViewingProvider}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {hasMore && (
                <Button variant="ghost" className="w-full" onClick={loadMore} disabled={loading}>
                  {loading ? <Loader size={14} className="animate-spin" /> : 'Load more providers'}
                </Button>
              )}
            </div>
          )}

          <div className="mt-10 p-4 rounded-2xl border border-dashed border-primary-200 dark:border-primary-700/40 bg-primary-50/50 dark:bg-primary-700/10">
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-100 mb-1">Are you a psychiatrist or psychologist?</p>
            <p className="text-xs text-ink-400 mb-3">List your practice and connect with mental health clients who need your expertise.</p>
            <Button variant="soft" size="sm" onClick={() => navigate('/provider/signup')}>
              Join as a provider →
            </Button>
          </div>
        </>
      )}

      {tab === 'my-doctor' && (
        <div className="space-y-5">
          {linkLoading ? (
            <div className="h-28 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
          ) : linkedDoctor ? (
            <>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0">
                    {linkedDoctor.photoURL ? (
                      <img src={linkedDoctor.photoURL} alt={linkedDoctor.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-2xl">
                        {linkedDoctor.avatar || '🧠'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-ink-900 dark:text-ink-100 text-sm">{linkedDoctor.name}</p>
                      <BadgeCheck size={14} className="text-primary-500" />
                    </div>
                    <p className="text-xs text-ink-400">{linkedDoctor.type} · {linkedDoctor.experience} yrs exp</p>
                    {linkedDoctor.hpcsa && <p className="text-xs text-ink-400">HPCSA: {linkedDoctor.hpcsa}</p>}
                    {linkedDoctor.ratingCount > 0 && (
                      <StarDisplay value={linkedDoctor.ratingAvg?.overall} count={linkedDoctor.ratingCount} />
                    )}
                    {linkedDoctor.availability && (
                      <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {linkedDoctor.availability}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1" size="sm" onClick={() => handleBookClick(linkedDoctor)}>
                    <Calendar size={13} /> Book session
                  </Button>
                  <button onClick={handleUnlink}
                    className="px-3 py-1.5 rounded-xl text-xs text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-surface-200 dark:border-surface-700 transition-colors flex items-center gap-1.5">
                    <Unlink size={12} /> Unlink
                  </button>
                </div>
              </Card>

              {upcomingAppts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Appointments</p>
                  <div className="space-y-2">
                    {upcomingAppts.map(a => (
                      <Card key={a.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{linkedDoctor.name}</p>
                            <p className="text-xs text-ink-400">{[linkedDoctor.type, linkedDoctor.city, linkedDoctor.province].filter(Boolean).join(' · ')}</p>
                            <p className="text-sm text-ink-700 dark:text-ink-200 mt-1 flex items-center gap-1.5">
                              <Calendar size={11} className="text-ink-400 flex-shrink-0" /> {a.date} at {a.timeSlot}
                            </p>
                            <p className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1">
                              <Video size={10} className="flex-shrink-0" /> Online video session
                            </p>
                            {a.sharedDataTypes?.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {a.sharedDataTypes.map(t => {
                                  const dt = DATA_TYPES.find(d => d.id === t)
                                  return dt ? (
                                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">
                                      {dt.emoji} {dt.label}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              a.status === 'confirmed' ? 'bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400'
                              : a.status === 'completed' ? 'bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                              : a.status === 'pending' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              : a.status === 'no-show' ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                              : 'bg-surface-100 dark:bg-surface-700 text-ink-400'
                            }`}>{a.status === 'no-show' ? 'missed' : a.status}</span>

                            {['confirmed', 'completed'].includes(a.status) && sessionHasPassed(a) && !ratedSet.has(a.id) && (
                              <button
                                onClick={() => setRatingAppt(a)}
                                className="flex items-center gap-1 text-[10px] text-primary-500 hover:text-primary-600 font-medium"
                              >
                                <Star size={10} /> Rate session <span className="text-ink-400">(optional)</span>
                              </button>
                            )}
                            {ratedSet.has(a.id) && (
                              <span className="text-[10px] text-ink-400 flex items-center gap-1">
                                <Star size={10} className="text-yellow-400 fill-yellow-400" /> Rated
                              </span>
                            )}
                          </div>
                        </div>
                        {a.status === 'confirmed' && a.screeningRequired && !a.screeningSigned && (
                          <button onClick={() => setSigningAppt(a)}
                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                            <FileSignature size={14} className="flex-shrink-0" />
                            Documents ready to sign. Tap to review &amp; sign
                          </button>
                        )}
                        {a.screeningSigned && (
                          <p className="mt-2 text-[10px] text-success-600 dark:text-success-400 flex items-center gap-1">
                            <Check size={10} className="flex-shrink-0" /> Documents signed
                          </p>
                        )}
                        {a.status === 'confirmed' && (
                          <AddToCalendar
                            appt={{ ...a, meetingLink: a.meetingLink || linkedDoctor?.meetingLink || '' }}
                            role="patient"
                            className="mt-2.5 pt-2.5 border-t border-surface-100 dark:border-surface-800"
                          />
                        )}
                        {['pending', 'confirmed'].includes(a.status) && !sessionHasPassed(a) && (
                          <button onClick={() => handleCancelAppt(a)} disabled={cancelling === a.id}
                            className="mt-2.5 w-full text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 py-2 rounded-xl transition-colors disabled:opacity-50">
                            {cancelling === a.id ? 'Cancelling…' : a.status === 'pending' ? 'Cancel request' : 'Cancel appointment'}
                          </button>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {upcomingAppts.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-3xl mb-2">📅</p>
                  <p className="text-sm text-ink-400">No upcoming appointments.</p>
                  <p className="text-xs text-ink-400 mt-1">Book a session with {linkedDoctor.name} to get started.</p>
                </div>
              )}
            </>
          ) : (
            <div>
              <Card className="p-5 mb-5">
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-100 mb-1">Link your existing doctor</p>
                <p className="text-xs text-ink-400 mb-4">
                  Enter your doctor's HPCSA practice number (e.g. MP0123456) or their name to find and link them.
                </p>
                <div className="flex gap-2">
                  <input value={hpcsaQuery} onChange={e => setHpcsaQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleHpcsaSearch()}
                    placeholder="HPCSA number or doctor's name"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                  <Button size="sm" onClick={handleHpcsaSearch}>Search</Button>
                </div>
                {searchError && <p className="text-xs text-red-500 mt-2">{searchError}</p>}
                {searchResult && (
                  <div className="mt-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                        {searchResult.photoURL ? (
                          <img src={searchResult.photoURL} alt={searchResult.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-xl">
                            {searchResult.avatar || '🧠'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{searchResult.name}</p>
                          <BadgeCheck size={12} className="text-primary-500" />
                        </div>
                        <p className="text-xs text-ink-400">{searchResult.type} · HPCSA: {searchResult.hpcsa}</p>
                      </div>
                      <Button size="sm" onClick={() => handleLink(searchResult)}>
                        <Link2 size={12} /> Link
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              <p className="text-xs text-ink-400 mb-3">Or link a doctor from the directory:</p>
              <div className="space-y-3">
                {loading ? (
                  [1, 2].map(i => <div key={i} className="h-36 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)
                ) : providers.slice(0, 5).map(p => (
                  <ProviderCard key={p.id} provider={p} onBook={handleBookClick} onLink={handleLink} linked={false} onViewProfile={setViewingProvider} />
                ))}
                {!loading && providers.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-3xl mb-2">🌱</p>
                    <p className="text-sm text-ink-400">No providers yet. Check back soon.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ProviderProfileModal
        provider={viewingProvider}
        open={!!viewingProvider}
        onClose={() => setViewingProvider(null)}
        onBook={(p) => { setViewingProvider(null); handleBookClick(p) }}
        onLink={handleLink}
        linked={linkedDoctor?.id === viewingProvider?.id}
        onReport={setReportingProvider}
        onRequestFee={handleRequestFee}
        feeRequested={viewingProvider ? feeRequestedSet.has(viewingProvider.id) : false}
      />

      <ReportModal
        provider={reportingProvider}
        open={!!reportingProvider}
        onClose={() => setReportingProvider(null)}
        user={user}
      />

      <SignDocumentsModal
        appt={signingAppt}
        open={!!signingAppt}
        onClose={() => setSigningAppt(null)}
        user={user}
        userProfile={userProfile}
        onSigned={(id) => setMyAppointments(prev => prev.map(a => a.id === id ? { ...a, screeningSigned: true } : a))}
        onNothingToSign={(id) => {
          // Doctor removed their documents after confirming — clear the flag
          // so the patient isn't prompted again.
          updateAppointment(id, { screeningRequired: false }).catch(() => {})
          setMyAppointments(prev => prev.map(a => a.id === id ? { ...a, screeningRequired: false } : a))
        }}
      />

      <BookingModal
        provider={booking}
        open={!!booking}
        onClose={() => setBooking(null)}
        bookAppointment={bookAppointment}
        user={user}
        userProfile={userProfile}
        getBookingInfo={getBookingInfo}
      />

      <RatingModal
        open={!!ratingAppt}
        onClose={() => setRatingAppt(null)}
        appointment={ratingAppt}
        providerName={linkedDoctor?.name || ''}
        onSubmit={handleRatingSubmit}
      />
    </PageWrapper>
  )
}
