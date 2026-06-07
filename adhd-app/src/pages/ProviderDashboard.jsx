import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, CheckCircle, XCircle, Clock, ExternalLink, Users, Calendar, BadgeCheck, Save } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useProviders } from '../hooks/useProviders'

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400'

function EditModal({ open, onClose, profile, onSave }) {
  const [form, setForm] = useState({
    bio:          profile?.bio || '',
    sessionFee:   profile?.sessionFee || '',
    availability: profile?.availability || '',
    meetingLink:  profile?.meetingLink || '',
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
          <label className="block text-xs font-medium text-ink-400 mb-1">Session fee (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
            <input type="number" value={form.sessionFee} onChange={e => set('sessionFee', e.target.value)} min="0" className={`${inputCls} pl-7`} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Availability</label>
          <input value={form.availability} onChange={e => set('availability', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Meeting link</label>
          <input value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)} className={inputCls} placeholder="https://zoom.us/j/…" />
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
            {appt.date} · <span className="capitalize">{appt.timeSlot}</span>
          </p>
          {appt.notes && (
            <p className="text-xs text-ink-600 dark:text-ink-300 mt-1.5 italic bg-surface-50 dark:bg-surface-900 px-2 py-1 rounded-lg">"{appt.notes}"</p>
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

export function ProviderDashboard() {
  const { user }                                                          = useAuth()
  const { getProvider, getAppointments, updateAppointment, saveProvider } = useProviders()
  const navigate                                                          = useNavigate()
  const [profile, setProfile]           = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]           = useState(true)
  const [editOpen, setEditOpen]         = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([getProvider(user.uid), getAppointments(user.uid)]).then(([p, appts]) => {
      if (!p) { navigate('/provider/signup'); return }
      setProfile(p)
      setAppointments(appts.sort((a, b) => {
        const order = { pending: 0, confirmed: 1, cancelled: 2 }
        return (order[a.status] ?? 3) - (order[b.status] ?? 3)
      }))
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

  if (loading) return (
    <PageWrapper>
      <div className="space-y-3 mt-6">
        {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}
      </div>
    </PageWrapper>
  )

  const pending   = appointments.filter(a => a.status === 'pending')
  const confirmed = appointments.filter(a => a.status === 'confirmed')
  const planLabel = profile?.subscriptionPlan === 'featured' ? '⭐ Featured' : '✓ Standard'

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

      <Card className="p-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-3xl flex-shrink-0">
            {profile?.avatar || '🧠'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-ink-900 dark:text-ink-100">{profile?.name}</p>
              <BadgeCheck size={14} className="text-primary-500" />
            </div>
            <p className="text-xs text-ink-400">{profile?.type} · {profile?.experience} yrs exp</p>
            <p className="text-xs text-ink-400 mt-0.5">${profile?.sessionFee}/session · {profile?.availability}</p>
          </div>
        </div>
        {profile?.bio && (
          <p className="mt-3 text-xs text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-3">{profile.bio}</p>
        )}
        {profile?.meetingLink && (
          <a href={profile.meetingLink} target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-xs text-primary-500 hover:underline w-fit">
            <ExternalLink size={10} /> Your meeting room
          </a>
        )}
        <div className="flex flex-wrap gap-1 mt-3">
          {(profile?.specialties || []).map(s => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">{s}</span>
          ))}
        </div>
      </Card>

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
        <div className="py-14 text-center">
          <p className="text-4xl mb-3">📭</p>
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
            <div>
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

      <EditModal open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onSave={handleSave} />
    </PageWrapper>
  )
}
