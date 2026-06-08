import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, CheckCircle, XCircle, Clock, ExternalLink, Users, Calendar, BadgeCheck, Save, X, Eye, TrendingUp, Camera, Loader, Star } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useProviders } from '../hooks/useProviders'

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

const DATA_LABELS = { habits: '🔄 Habits', checkin: '😊 Mood', focus: '⏱️ Focus', tasks: '✅ Tasks' }
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
    </div>
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

function EditModal({ open, onClose, profile, onSave }) {
  const [form, setForm] = useState({
    bio:             profile?.bio || '',
    sessionFee:      profile?.sessionFee || '',
    availability:    profile?.availability || '',
    meetingPlatform: profile?.meetingPlatform || '',
    meetingLink:     profile?.meetingLink || '',
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

function AppointmentCard({ appt, onConfirm, onDecline }) {
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
        {appt.status === 'confirmed' && (
          <span className="flex items-center gap-1 text-xs text-success-600 dark:text-success-400 font-medium flex-shrink-0">
            <CheckCircle size={13} /> Confirmed
          </span>
        )}
        {appt.status === 'cancelled' && (
          <span className="text-xs text-ink-400 flex-shrink-0">Declined</span>
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

  const addSlot = async () => {
    if (!newTime) return
    const slots = diary[selectedDay] || []
    if (slots.includes(newTime)) return
    const updated = { ...diary, [selectedDay]: [...slots, newTime].sort() }
    setSaving(true)
    setDiary(updated)
    await saveDiary(providerUid, updated)
    setSaving(false)
  }

  const removeSlot = async (day, time) => {
    const updated = { ...diary, [day]: (diary[day] || []).filter(t => t !== time) }
    setDiary(updated)
    await saveDiary(providerUid, updated)
  }

  if (diaryLoading) return <div className="h-20 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />

  return (
    <div className="space-y-4">
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

      <div className="space-y-2.5">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="flex items-start gap-3">
            <p className="text-xs font-medium text-ink-400 w-8 flex-shrink-0 pt-1.5">{label.slice(0, 3)}</p>
            <div className="flex-1 flex flex-wrap gap-1.5">
              {(diary[key] || []).length === 0 ? (
                <span className="text-xs text-ink-400 italic">—</span>
              ) : (
                (diary[key] || []).map(time => (
                  <span key={time}
                    className="flex items-center gap-1 text-xs bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg">
                    {time}
                    <button onClick={() => removeSlot(key, time)} className="hover:text-red-500 transition-colors">
                      <X size={9} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProviderDashboard() {
  const { user }                                                                                                    = useAuth()
  const { getProvider, getAppointments, updateAppointment, saveProvider, getDiary, saveDiary, uploadPhoto, getProviderRatings } = useProviders()
  const navigate                                                                                                    = useNavigate()
  const [profile, setProfile]           = useState(null)
  const [appointments, setAppointments] = useState([])
  const [ratings, setRatings]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [editOpen, setEditOpen]         = useState(false)
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
    await updateAppointment(id, { status })
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
  const resolved       = appointments.filter(a => a.status !== 'pending')
  const acceptanceRate = resolved.length > 0
    ? Math.round((confirmed.length / resolved.length) * 100)
    : null
  const uniquePatients = new Set(appointments.map(a => a.patientUid)).size
  const profileViews   = profile?.profileViews || 0
  const planLabel      = profile?.subscriptionPlan === 'featured' ? '⭐ Featured' : '✓ Standard'
  const platformLabel  = PLATFORMS.find(p => p.value === profile?.meetingPlatform)?.label || null

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
          <p className="text-sm text-ink-400 mt-0.5">{planLabel} plan · Active</p>
        </div>
        <Button variant="soft" size="sm" onClick={() => setEditOpen(true)}>
          <Edit2 size={13} /> Edit profile
        </Button>
      </div>

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
        {profile?.meetingLink && (
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

      {/* Activity stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="p-3 text-center">
          <Eye size={17} className="text-primary-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{profileViews}</p>
          <p className="text-xs text-ink-400">Profile views</p>
        </Card>
        <Card className="p-3 text-center">
          <Users size={17} className="text-success-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{uniquePatients}</p>
          <p className="text-xs text-ink-400">Unique patients</p>
        </Card>
        <Card className="p-3 text-center">
          <TrendingUp size={17} className="text-warm-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-ink-900 dark:text-ink-100">
            {acceptanceRate !== null ? `${acceptanceRate}%` : '—'}
          </p>
          <p className="text-xs text-ink-400">Accept rate</p>
        </Card>
      </div>

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
          { label: 'Pending',   value: pending.length,      icon: Clock,       color: 'text-warm-500' },
          { label: 'Confirmed', value: confirmed.length,    icon: CheckCircle, color: 'text-success-500' },
          { label: 'Total',     value: appointments.length, icon: Users,       color: 'text-primary-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3 text-center">
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
          <p className="text-xs text-ink-400 mt-1">Your profile is live — patients can book you from the Connect page.</p>
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
                  <AppointmentCard key={a.id} appt={a} onConfirm={() => {}} onDecline={() => {}} />
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
    </PageWrapper>
  )
}
