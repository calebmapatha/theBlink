import { useState } from 'react'
import { User, Palette, Moon, Sun, LogOut, Trash2, Check, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

const AVATAR_OPTIONS = ['🧠','😊','⚡','🎯','🦁','🐢','🦊','🌟','🔥','💎','🏔️','🌊','🎨','🎵','🚀']

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
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors text-left ${danger ? 'text-red-500' : ''}`}
    >
      <Icon size={17} className={danger ? 'text-red-400' : 'text-ink-400'} />
      <span className={`flex-1 text-sm font-medium ${danger ? '' : 'text-ink-900 dark:text-ink-100'}`}>{label}</span>
      {value && <span className="text-sm text-ink-400">{value}</span>}
      {!danger && <ChevronRight size={14} className="text-ink-400" />}
    </button>
  )
}

function ProfileModal({ open, onClose, profile, onSave, authUser }) {
  const [name, setName]     = useState(profile.displayName || authUser?.displayName || '')
  const [avatar, setAvatar] = useState(profile.avatarEmoji || '🧠')

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-4xl">
            {avatar}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-400 mb-2">Avatar</label>
          <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 max-h-28 overflow-y-auto">
            {AVATAR_OPTIONS.map(e => (
              <button key={e} onClick={() => setAvatar(e)}
                className={`text-2xl p-1.5 rounded-xl transition-colors ${avatar === e ? 'bg-primary-100 dark:bg-primary-700/30 ring-1 ring-primary-400' : 'hover:bg-surface-100 dark:hover:bg-surface-700'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Display name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Your name"
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

function ClearDataModal({ open, onClose, onConfirm }) {
  const [typed, setTyped] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Clear All Data">
      <div className="space-y-4">
        <p className="text-sm text-ink-700 dark:text-ink-300">
          This will permanently delete all your tasks, habits, brain dumps, check-ins, and rewards. This cannot be undone.
        </p>
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Type <strong>DELETE</strong> to confirm</label>
          <input value={typed} onChange={e => setTyped(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600"
            disabled={typed !== 'DELETE'}
            onClick={() => { onConfirm(); onClose() }}>
            Delete everything
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function Settings() {
  const { theme, userProfile, userId } = useApp()
  const { user, signOut } = useAuth()
  const [profileOpen, setProfileOpen]   = useState(false)
  const [clearOpen, setClearOpen]       = useState(false)

  const displayName = userProfile.profile.displayName || user?.displayName || user?.email?.split('@')[0] || 'You'
  const avatar      = userProfile.profile.avatarEmoji || '🧠'

  const handleClearData = () => {
    const prefix = `u_${userId}_`
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Settings</h1>
      </div>

      {/* Profile card */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-3xl flex-shrink-0">
            {avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink-900 dark:text-ink-100 truncate">{displayName}</p>
            <p className="text-xs text-ink-400 truncate">{user?.email}</p>
          </div>
          <Button variant="soft" size="sm" onClick={() => setProfileOpen(true)}>Edit</Button>
        </div>
      </Card>

      <Section title="Appearance">
        <SettingsRow
          icon={theme.isDark ? Moon : Sun}
          label={theme.isDark ? 'Dark mode' : 'Light mode'}
          value={theme.isDark ? 'On' : 'Off'}
          onClick={theme.toggleTheme}
        />
      </Section>

      <Section title="Account">
        <SettingsRow icon={User} label="Edit profile" onClick={() => setProfileOpen(true)} />
        <SettingsRow icon={LogOut} label="Sign out" onClick={signOut} />
      </Section>

      <Section title="Data">
        <SettingsRow icon={Trash2} label="Clear all data" danger onClick={() => setClearOpen(true)} />
      </Section>

      <p className="text-center text-xs text-ink-400 mt-4">FocusBlink · Your data stays on your device</p>

      <ProfileModal
        open={profileOpen} onClose={() => setProfileOpen(false)}
        profile={userProfile.profile} authUser={user}
        onSave={userProfile.updateProfile} />

      <ClearDataModal open={clearOpen} onClose={() => setClearOpen(false)} onConfirm={handleClearData} />
    </PageWrapper>
  )
}
