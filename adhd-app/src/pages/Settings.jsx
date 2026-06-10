import { useState, useEffect, useRef } from 'react'
import { User, Moon, Sun, LogOut, Trash2, Check, ChevronRight, Bell, BellOff, RotateCcw, Camera, Loader, Database } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useProviders } from '../hooks/useProviders'
import { seedDemoProviders } from '../utils/seedProviders'

const AVATAR_OPTIONS = ['🧠','😊','⚡','🎯','🦁','🐢','🦊','🌟','🔥','💎','🏔️','🌊','🎨','🎥','🚀']

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2 px-1">{title}</p>
      <Card className="divide-y divide-surface-100 dark:divide-surface-700 overflow-hidden p-0">
        {children}
      </Card>
    </div>
  )
}

function SettingsRow({ icon: Icon, label, value, onClick, danger }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors text-left ${danger ? 'text-red-500' : ''}`}>
      <Icon size={17} className={danger ? 'text-red-400' : 'text-ink-400'} />
      <span className={`flex-1 text-sm font-medium ${danger ? '' : 'text-ink-900 dark:text-ink-100'}`}>{label}</span>
      {value && <span className="text-sm text-ink-400">{value}</span>}
      {!danger && <ChevronRight size={14} className="text-ink-400" />}
    </button>
  )
}

function PhotoAvatar({ photoURL, avatar, size = 'lg', onClick, uploading }) {
  const sz = size === 'lg' ? 'w-16 h-16 text-3xl' : 'w-14 h-14 text-2xl'
  return (
    <button
      onClick={onClick}
      className={`relative ${sz} rounded-2xl flex-shrink-0 overflow-hidden group`}
      disabled={uploading}
      title="Change photo"
    >
      {photoURL ? (
        <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>
          {avatar}
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
        {uploading
          ? <Loader size={16} className="text-white animate-spin" />
          : <Camera size={16} className="text-white" />
        }
      </div>
    </button>
  )
}

function ProfileModal({ open, onClose, profile, onSave, authUser, photoURL, onPhotoUpload }) {
  const [name, setName]       = useState(profile.displayName || authUser?.displayName || '')
  const [avatar, setAvatar]   = useState(profile.avatarEmoji || '🧠')
  const [uploading, setUploading] = useState(false)
  const fileRef               = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await onPhotoUpload(file)
    setUploading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <PhotoAvatar photoURL={photoURL} avatar={avatar} size="lg" onClick={() => fileRef.current.click()} uploading={uploading} />
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-ink-400">Tap photo to change</p>
        </div>

        {!photoURL && (
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-2">Avatar emoji</label>
            <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 max-h-28 overflow-y-auto">
              {AVATAR_OPTIONS.map(e => (
                <button key={e} onClick={() => setAvatar(e)}
                  className={`text-2xl p-1.5 rounded-xl transition-colors ${avatar === e ? 'bg-primary-100 dark:bg-primary-700/30 ring-1 ring-primary-400' : 'hover:bg-surface-100 dark:hover:bg-surface-700'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Display name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900">
          <p className="text-xs text-ink-400 mb-0.5">Email (from account)</p>
          <p className="text-sm text-ink-700 dark:text-ink-300">{authUser?.email || '—'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={() => { onSave({ displayName: name, avatarEmoji: avatar }); onClose() }}>
            <Check size={14} /> Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ResetModal({ open, onClose, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title="Reset to Defaults">
      <div className="space-y-4">
        <p className="text-sm text-ink-700 dark:text-ink-300">
          This will clear all tasks, habits, brain dumps, check-ins, and rewards. The original default habits will be restored. Your profile and theme will be kept.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={() => { onConfirm(); onClose() }}>
            Reset
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ClearDataModal({ open, onClose, onConfirm }) {
  const [typed, setTyped] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Clear All Data">
      <div className="space-y-4">
        <p className="text-sm text-ink-700 dark:text-ink-300">
          This will permanently delete all your tasks, habits, brain dumps, check-ins, rewards, and profile. This cannot be undone.
        </p>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Type <strong>DELETE</strong> to confirm</label>
          <input value={typed} onChange={e => setTyped(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600" disabled={typed !== 'DELETE'}
            onClick={() => { onConfirm(); onClose() }}>Delete everything</Button>
        </div>
      </div>
    </Modal>
  )
}

function ReminderRow({ label, pref, onToggle, onTimeChange }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex-1 text-sm font-medium text-ink-900 dark:text-ink-100">{label}</span>
      <input type="time" value={pref.time} onChange={e => onTimeChange(e.target.value)} disabled={!pref.enabled}
        className="text-sm text-ink-700 dark:text-ink-300 bg-transparent border border-surface-200 dark:border-surface-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-40" />
      <button onClick={onToggle} aria-pressed={pref.enabled}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${pref.enabled ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${pref.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function RemindersSection({ notifications }) {
  if (typeof Notification === 'undefined') return null
  const granted = Notification.permission === 'granted'
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2 px-1">Reminders</p>
      <Card className="divide-y divide-surface-100 dark:divide-surface-700 overflow-hidden p-0">
        {!granted ? (
          <div className="px-4 py-4 flex items-center gap-3">
            <BellOff size={17} className="text-ink-400 flex-shrink-0" />
            <span className="flex-1 text-sm text-ink-700 dark:text-ink-300">Notifications are disabled</span>
            <Button size="sm" variant="soft" onClick={notifications.requestPermission}>Enable</Button>
          </div>
        ) : (
          <>
            <ReminderRow label="Habit reminder" pref={notifications.prefs.habitReminder}
              onToggle={() => notifications.updatePref('habitReminder', { enabled: !notifications.prefs.habitReminder.enabled })}
              onTimeChange={time => notifications.updatePref('habitReminder', { time })} />
            <ReminderRow label="Focus reminder" pref={notifications.prefs.focusReminder}
              onToggle={() => notifications.updatePref('focusReminder', { enabled: !notifications.prefs.focusReminder.enabled })}
              onTimeChange={time => notifications.updatePref('focusReminder', { time })} />
          </>
        )}
      </Card>
    </div>
  )
}

export function Settings() {
  const { theme, userProfile, userId, notifications } = useApp()
  const { user, signOut }    = useAuth()
  const { uploadPhoto, getPatientProfile } = useProviders()
  const [profileOpen, setProfileOpen] = useState(false)
  const [resetOpen, setResetOpen]     = useState(false)
  const [clearOpen, setClearOpen]     = useState(false)
  const [photoURL, setPhotoURL]       = useState(null)
  const [seeding, setSeeding]         = useState(false)
  const [seedMsg, setSeedMsg]         = useState('')

  const handleSeedProviders = async () => {
    setSeeding(true)
    setSeedMsg('')
    try {
      const results = await seedDemoProviders()
      const ok  = results.filter(r => r.success).length
      const fail = results.filter(r => !r.success).length
      setSeedMsg(fail === 0 ? `${ok} demo providers seeded successfully.` : `${ok} seeded, ${fail} failed.`)
    } catch (e) {
      setSeedMsg(`Error: ${e.message}`)
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    if (!user) return
    getPatientProfile(user.uid).then(p => {
      if (p?.photoURL) setPhotoURL(p.photoURL)
    })
  }, [user])

  const handlePhotoUpload = async (file) => {
    const url = await uploadPhoto(user.uid, file, 'patient')
    if (url) setPhotoURL(url)
  }

  const displayName = userProfile.profile.displayName || user?.displayName || user?.email?.split('@')[0] || 'You'
  const avatar      = userProfile.profile.avatarEmoji || '🧠'

  const KEEP_KEYS = ['adhd_profile', 'adhd_theme']

  const handleResetDefaults = () => {
    const prefix = `u_${userId}_`
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix) && !KEEP_KEYS.some(s => k.endsWith(s)))
      .forEach(k => localStorage.removeItem(k))
    // Reminder preferences are device-global; reset them too so a reset never
    // leaves behind evidence of prior health-related reminders.
    localStorage.removeItem('adhd_notifications')
    window.location.reload()
  }

  const handleClearData = () => {
    const prefix = `u_${userId}_`
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k))
    localStorage.removeItem('adhd_notifications')
    window.location.reload()
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Settings</h1>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <PhotoAvatar photoURL={photoURL} avatar={avatar} size="lg" onClick={() => setProfileOpen(true)} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink-900 dark:text-ink-100 truncate">{displayName}</p>
            <p className="text-xs text-ink-400 truncate">{user?.email}</p>
            <p className="text-xs text-primary-500 mt-0.5 cursor-pointer hover:underline" onClick={() => setProfileOpen(true)}>
              Change photo
            </p>
          </div>
          <Button variant="soft" size="sm" onClick={() => setProfileOpen(true)}>Edit</Button>
        </div>
      </Card>

      <Section title="Appearance">
        <SettingsRow icon={theme.isDark ? Moon : Sun}
          label={theme.isDark ? 'Dark mode' : 'Light mode'} value={theme.isDark ? 'On' : 'Off'}
          onClick={theme.toggleTheme} />
      </Section>

      <RemindersSection notifications={notifications} />

      <Section title="Account">
        <SettingsRow icon={User} label="Edit profile" onClick={() => setProfileOpen(true)} />
        <SettingsRow icon={LogOut} label="Sign out" onClick={signOut} />
      </Section>

      <Section title="Data">
        <SettingsRow icon={RotateCcw} label="Reset to defaults" onClick={() => setResetOpen(true)} />
        <SettingsRow icon={Trash2} label="Clear all data" danger onClick={() => setClearOpen(true)} />
      </Section>

      {user?.email === 'calebmapatha@gmail.com' && (
        <Section title="Admin">
          <div className="px-4 py-3.5 space-y-2">
            <div className="flex items-center gap-3">
              <Database size={17} className="text-ink-400" />
              <span className="flex-1 text-sm font-medium text-ink-900 dark:text-ink-100">Seed test providers</span>
              <Button size="sm" variant="soft" onClick={handleSeedProviders} disabled={seeding}>
                {seeding ? <Loader size={13} className="animate-spin" /> : null}
                {seeding ? 'Seeding…' : 'Seed 6 doctors'}
              </Button>
            </div>
            {seedMsg && <p className="text-xs text-primary-500 pl-8">{seedMsg}</p>}
          </div>
        </Section>
      )}

      <p className="text-center text-xs text-ink-400 mt-4">MentisFlow v1.0.0 · Your data stays on your device</p>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)}
        profile={userProfile.profile} authUser={user} onSave={userProfile.updateProfile}
        photoURL={photoURL} onPhotoUpload={handlePhotoUpload} />
      <ResetModal open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={handleResetDefaults} />
      <ClearDataModal open={clearOpen} onClose={() => setClearOpen(false)} onConfirm={handleClearData} />
    </PageWrapper>
  )
}
