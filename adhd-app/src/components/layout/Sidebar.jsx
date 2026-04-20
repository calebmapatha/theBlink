import { NavLink } from 'react-router-dom'
import { Timer, CheckSquare, Brain, Repeat, Sun, Trophy, Moon, Zap, LogOut, BarChart2, Settings } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/timer',   icon: Timer,       label: 'Focus Timer' },
  { to: '/tasks',   icon: CheckSquare, label: 'Tasks' },
  { to: '/habits',  icon: Repeat,      label: 'Habits' },
  { to: '/monthly', icon: BarChart2,   label: 'Monthly' },
  { to: '/dump',    icon: Brain,       label: 'Brain Dump' },
  { to: '/checkin', icon: Sun,         label: 'Check-in' },
  { to: '/rewards', icon: Trophy,      label: 'Rewards' },
  { to: '/settings',icon: Settings,    label: 'Settings' },
]

// Mobile bottom bar shows these 5
const MOBILE_NAV = [
  { to: '/timer',    icon: Timer,       label: 'Focus' },
  { to: '/tasks',    icon: CheckSquare, label: 'Tasks' },
  { to: '/habits',   icon: Repeat,      label: 'Habits' },
  { to: '/monthly',  icon: BarChart2,   label: 'Monthly' },
  { to: '/settings', icon: Settings,    label: 'Settings' },
]

export function Sidebar() {
  const { theme, rewards, userProfile } = useApp()
  const { user, signOut } = useAuth()
  const avatar = userProfile?.profile?.avatarEmoji || '🧠'
  const name   = userProfile?.profile?.displayName || user?.displayName || user?.email?.split('@')[0] || ''

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 h-full bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800">
        {/* Logo + user */}
        <div className="px-5 py-5 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-ink-900 dark:text-ink-100">FocusBlink</span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-base">{avatar}</span>
              <p className="text-xs text-ink-400 truncate">{name}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                    : 'text-ink-700 dark:text-ink-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-ink-900 dark:hover:text-ink-100'
                }`
              }
            >
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-surface-200 dark:border-surface-800 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-700/15">
            <Zap size={14} className="text-primary-500" />
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{rewards.totalPoints} XP</span>
            <span className="text-xs text-ink-400 ml-auto">Lv {rewards.currentLevel.level}</span>
          </div>
          <button onClick={theme.toggleTheme}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-ink-400 hover:text-ink-700 dark:hover:text-ink-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            {theme.isDark ? <Sun size={15} /> : <Moon size={15} />}
            {theme.isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <button onClick={signOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <LogOut size={15} />Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 flex safe-bottom">
        {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                isActive ? 'text-primary-500' : 'text-ink-400'
              }`
            }
          >
            <Icon size={20} />
            <span className="leading-none">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
