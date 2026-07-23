import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Trash2, Check, ChevronRight, Bell, BellOff, RotateCcw, Camera, Loader, Database, Send, Shield, Lock, CheckCircle } from 'lucide-react'
import { ThemeToggle } from '../theme/ThemeProvider'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
import { TimePicker } from '../components/ui/TimePicker'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { CalendarSync } from '../components/CalendarSync'
import { seedDemoProviders } from '../utils/seedProviders'
import { isAdminUser } from '../utils/admin'
import { FOCUSBLINK_TOOLS } from '../hooks/useToolPrefs'
import Avatar from '../components/ui/Avatar'
import { setProfilePhoto, removeProfilePhoto } from '../services/profilePhoto'
import { useProfilePhoto } from '../hooks/useProfilePhoto'

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint mb-2 px-1">{title}</p>
      <Card className="divide-y divide-line overflow-hidden p-0">
        {children}
      </Card>
    </div>
  )
}

function SettingsRow({ icon: Icon, label, value, onClick, danger }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-raised transition-colors text-left ${danger ? 'text-danger' : ''}`}>
      <Icon size={17} className={danger ? 'text-danger' : 'text-faint'} />
      <span className={`flex-1 text-sm font-medium ${danger ? '' : 'text-ink'}`}>{label}</span>
      {value && <span className="text-sm text-faint">{value}</span>}
      {!danger && <ChevronRight size={14} className="text-faint" />}
    </button>
  )
}

// Photo or silhouette, nothing else — tapping opens the file picker.
function PhotoAvatar({ photoURL, name, size = 'md', onClick, uploading }) {
  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 overflow-hidden rounded-full group"
      disabled={uploading}
      title="Change photo"
    >
      <Avatar photoUrl={photoURL} name={name} size={size} />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
        {uploading
          ? <Loader size={16} className="text-white animate-spin" />
          : <Camera size={16} className="text-white" />
        }
      </div>
    </button>
  )
}

function ProfileModal({ open, onClose, profile, onSave, authUser, photoURL, onPhotoUpload, onPhotoRemove }) {
  const [name, setName]       = useState(profile.displayName || authUser?.displayName || '')
  const [pharmacy, setPharmacy] = useState(profile.pharmacy || '')
  const [uploading, setUploading] = useState(false)
  const fileRef               = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    await onPhotoUpload(file)
    setUploading(false)
  }

  const handleRemove = async () => {
    setUploading(true)
    await onPhotoRemove()
    setUploading(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2">
          <PhotoAvatar photoURL={photoURL} name={name} size="xl" onClick={() => fileRef.current.click()} uploading={uploading} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-faint">Tap photo to change</p>
          {photoURL && (
            <button onClick={handleRemove} disabled={uploading}
              className="text-xs font-medium text-faint underline-offset-2 hover:text-ink hover:underline">
              Remove photo
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-faint mb-1">Display name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Preferred pharmacy <span className="font-normal">(optional)</span></label>
          <input value={pharmacy} onChange={e => setPharmacy(e.target.value)} placeholder="e.g. Clicks Rosebank, or your local pharmacy"
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          <p className="text-[10px] text-faint mt-1">Where you'd like prescriptions sent. You can share this with your doctor.</p>
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-raised">
          <p className="text-xs text-faint mb-0.5">Email (from account)</p>
          <p className="text-sm text-ink">{authUser?.email || 'N/A'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={() => { onSave({ displayName: name, pharmacy: pharmacy.trim() }); onClose() }}>
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
        <p className="text-sm text-ink">
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
        <p className="text-sm text-ink">
          This will permanently delete all your tasks, habits, brain dumps, check-ins, rewards, and profile. This cannot be undone.
        </p>
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Type <strong>DELETE</strong> to confirm</label>
          <input value={typed} onChange={e => setTyped(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
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

function ReminderRow({ label, pref, onToggle, onTimeChange, onTest }) {
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm font-medium text-ink">{label}</span>
        {pref.enabled && (
          <button onClick={onTest} title="Send test notification"
            className="p-1.5 rounded-lg text-faint hover:text-accent hover:bg-accent-soft transition-colors flex-shrink-0">
            <Send size={14} />
          </button>
        )}
        {/* Toggle — overflow-hidden clips the nub so it never bleeds past the track */}
        <button onClick={onToggle} aria-pressed={pref.enabled}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 overflow-hidden ${pref.enabled ? 'bg-accent' : 'bg-line'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${pref.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      {pref.enabled && (
        <div className="mt-2.5">
          <TimePicker value={pref.time} onChange={onTimeChange} />
        </div>
      )}
    </div>
  )
}

function RemindersSection({ notifications }) {
  // permission is unavailable means the browser doesn't support the API at all
  if (notifications.permission === 'unavailable') return null
  const { permission, prefs, requestPermission, updatePref, notifyNow } = notifications
  const isStandalone = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint mb-2 px-1">Reminders</p>
      <Card className="divide-y divide-line overflow-hidden p-0">
        {permission !== 'granted' ? (
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center gap-3">
              <BellOff size={17} className="text-faint flex-shrink-0" />
              <span className="flex-1 text-sm text-ink">
                {permission === 'denied' ? 'Notifications are blocked' : 'Notifications are disabled'}
              </span>
              {permission !== 'denied' && (
                <Button size="sm" variant="soft" onClick={requestPermission}>Enable</Button>
              )}
            </div>
            {permission === 'denied' && (
              <p className="text-xs text-faint pl-7">
                Open your browser/phone settings and allow notifications for this site, then reload.
              </p>
            )}
            {!isStandalone && permission !== 'denied' && (
              <p className="text-xs text-faint pl-7">
                For reliable background reminders, add MentisFlow to your home screen first.
              </p>
            )}
          </div>
        ) : (
          <>
            <ReminderRow label="Habit reminder" pref={prefs.habitReminder}
              onToggle={() => updatePref('habitReminder', { enabled: !prefs.habitReminder.enabled })}
              onTimeChange={time => updatePref('habitReminder', { time })}
              onTest={() => notifyNow('MentisFlow: Habit time!', 'Test: Check in on your habits for today 🌱')} />
            <ReminderRow label="Focus reminder" pref={prefs.focusReminder}
              onToggle={() => updatePref('focusReminder', { enabled: !prefs.focusReminder.enabled })}
              onTimeChange={time => updatePref('focusReminder', { time })}
              onTest={() => notifyNow('MentisFlow: Focus session', "Test: Time to start a focus session. You’ve got this! 🎯")} />
            {!isStandalone && (
              <div className="px-4 py-2.5 flex items-start gap-2">
                <Bell size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-faint">
                  Reminders fire while the app is open. Add to home screen for background notifications.
                </p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

const pwInputCls = 'w-full px-3 py-2.5 rounded-xl border border-line bg-raised text-ink text-sm placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent'

function ChangePasswordModal({ open, onClose }) {
  const { changePassword, authError, clearAuthError } = useAuth()
  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)

  const mismatch = confirm.length > 0 && next !== confirm
  const canSave  = current && next.length >= 6 && next === confirm && !saving

  const handleClose = () => {
    setCurrent(''); setNext(''); setConfirm(''); setDone(false)
    clearAuthError()
    onClose()
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await changePassword(current, next)
    setSaving(false)
    if (ok) setDone(true)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Change password">
      {done ? (
        <div className="flex flex-col items-center text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-success-100 dark:bg-success-500/20 flex items-center justify-center">
            <CheckCircle size={22} className="text-success-600 dark:text-success-400" />
          </div>
          <p className="text-sm font-semibold text-ink">Password updated</p>
          <p className="text-xs text-faint">Use your new password the next time you sign in.</p>
          <Button className="w-full" onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-faint mb-1">Current password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
              autoComplete="current-password" className={pwInputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-faint mb-1">New password</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)}
              autoComplete="new-password" placeholder="At least 6 characters" className={pwInputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-faint mb-1">Confirm new password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password" className={pwInputCls} />
            {mismatch && <p className="text-xs text-danger mt-1">Passwords do not match.</p>}
          </div>
          {authError && (
            <p className="text-xs text-danger px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">{authError}</p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button className="flex-1" disabled={!canSave} onClick={handleSave}>
              {saving ? 'Saving…' : 'Update password'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ToggleSwitch({ on, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 overflow-hidden ${on ? 'bg-accent' : 'bg-line'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function ToolsSection({ tools }) {
  return (
    <Section title="FocusBlink tools">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">Show FocusBlink tools</p>
          <p className="text-[11px] text-faint">Turn everything off to keep only Connect &amp; Treatment.</p>
        </div>
        <ToggleSwitch on={tools.anyEnabled} onClick={() => tools.setAll(!tools.anyEnabled)} />
      </div>
      {FOCUSBLINK_TOOLS.map(t => (
        <div key={t.key} className="flex items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm text-ink pl-1">{t.label}</span>
          <ToggleSwitch on={tools.isEnabled(t.key)} onClick={() => tools.setEnabled(t.key, !tools.isEnabled(t.key))} />
        </div>
      ))}
      <p className="px-4 py-2.5 text-[11px] text-faint leading-relaxed">
        Turning a tool off hides it from your menu and dashboard. Your data is kept and reappears when you switch it back on.
      </p>
    </Section>
  )
}

export function Settings() {
  const { userProfile, userId, notifications, showToast, tools } = useApp()
  const { user, signOut }    = useAuth()
  const navigate             = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [pwOpen, setPwOpen]           = useState(false)
  const [resetOpen, setResetOpen]     = useState(false)
  const [clearOpen, setClearOpen]     = useState(false)
  const photoURL = useProfilePhoto(user?.uid, 'patient')
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

  const handlePhotoUpload = async (file) => {
    try {
      await setProfilePhoto(user.uid, file, 'patient')
      showToast('Photo updated')
    } catch (e) {
      showToast(e.message || 'Could not upload photo. Use an image under 5MB and try again.', { variant: 'error' })
    }
  }

  const handlePhotoRemove = async () => {
    try {
      await removeProfilePhoto(user.uid, 'patient')
      showToast('Photo removed')
    } catch {
      showToast('Could not remove photo. Try again.', { variant: 'error' })
    }
  }

  const displayName = userProfile.profile.displayName || user?.displayName || user?.email?.split('@')[0] || 'You'

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
      <PageHeader title="Settings" />

      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <PhotoAvatar photoURL={photoURL} name={displayName} size="md" onClick={() => setProfileOpen(true)} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink truncate">{displayName}</p>
            <p className="text-xs text-faint truncate">{user?.email}</p>
            <span className="inline-flex gap-3">
              <p className="text-xs text-accent mt-0.5 cursor-pointer hover:underline" onClick={() => setProfileOpen(true)}>
                Change photo
              </p>
              {photoURL && (
                <p className="text-xs text-faint mt-0.5 cursor-pointer hover:underline" onClick={handlePhotoRemove}>
                  Remove photo
                </p>
              )}
            </span>
          </div>
          <Button variant="soft" size="sm" onClick={() => setProfileOpen(true)}>Edit</Button>
        </div>
      </Card>

      <Section title="Appearance">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">Theme</p>
            <p className="text-[11px] text-faint">Light, dark, or follow your device.</p>
          </div>
          <ThemeToggle />
        </div>
      </Section>

      <ToolsSection tools={tools} />

      <RemindersSection notifications={notifications} />

      <Section title="Calendar">
        <CalendarSync uid={user?.uid} showToast={showToast} />
      </Section>

      <Section title="Account">
        <SettingsRow icon={User} label="Edit profile" onClick={() => setProfileOpen(true)} />
        {user?.providerData?.some(p => p.providerId === 'password') && (
          <SettingsRow icon={Lock} label="Change password" onClick={() => setPwOpen(true)} />
        )}
        <SettingsRow icon={LogOut} label="Sign out" onClick={signOut} />
      </Section>

      <Section title="Data">
        <SettingsRow icon={RotateCcw} label="Reset to defaults" onClick={() => setResetOpen(true)} />
        <SettingsRow icon={Trash2} label="Clear all data" danger onClick={() => setClearOpen(true)} />
      </Section>

      {isAdminUser(user) && (
        <Section title="Admin">
          <SettingsRow icon={Shield} label="Open Admin Portal" onClick={() => navigate('/admin')} />
          <div className="px-4 py-3.5 space-y-2">
            <div className="flex items-center gap-3">
              <Database size={17} className="text-faint" />
              <span className="flex-1 text-sm font-medium text-ink">Seed test providers</span>
              <Button size="sm" variant="soft" onClick={handleSeedProviders} disabled={seeding}>
                {seeding ? <Loader size={13} className="animate-spin" /> : null}
                {seeding ? 'Seeding…' : 'Seed 6 doctors'}
              </Button>
            </div>
            {seedMsg && <p className="text-xs text-accent pl-8">{seedMsg}</p>}
          </div>
        </Section>
      )}

      <p className="text-center text-xs text-faint mt-4">MentisFlow v1.0.0 · Private by design</p>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)}
        profile={userProfile.profile} authUser={user}
        onSave={(u) => { userProfile.updateProfile(u); showToast('Profile updated') }}
        photoURL={photoURL} onPhotoUpload={handlePhotoUpload} onPhotoRemove={handlePhotoRemove} />
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <ResetModal open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={handleResetDefaults} />
      <ClearDataModal open={clearOpen} onClose={() => setClearOpen(false)} onConfirm={handleClearData} />
    </PageWrapper>
  )
}
