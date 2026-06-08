import { NavLink } from 'react-router-dom'
import { Home, Timer, CheckSquare, Brain, Repeat, Sun, Trophy, Moon, Zap, LogOut, BarChart2, Settings, HeartHandshake, LayoutDashboard, ClipboardList } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

const CONNECT_NAV = [
  { to: '/connect',   icon: HeartHandshake, label: 'Connect' },
  { to: '/treatment', icon: ClipboardList,  label: 'Treatment Plan' },
]

const FOCUSBLINK_NAV = [
  { to: '/',        icon: Home,        label: 'Home',       end: true },
  { to: '/timer',   icon: Timer,       label: 'Focus Timer' },
  { to: '/tasks',   icon: CheckSquare, label: 'Tasks' },
  { to: '/habits',  icon: Repeat,      label: 'Habits' },
  { to: '/monthly', icon: BarChart2,   label: 'Monthly' },
  { to: '/dump',    icon: Brain,       label: 'Brain Dump' },
  { to: '/checkin', icon: Sun,         label: 'Check-in' },
  { to: '/rewards', icon: Trophy,      label: 'Rewards' },
]

const SETTINGS_NAV = [
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const PROVIDER_NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

const PATIENT_MOBILE_NAV = [
  { to: '/connect',  icon: HeartHandshake, label: 'Connect' },
  { to: '/',         icon: Home,           label: 'Home',    end: true },
  { to: '/timer',    icon: Timer,          label: 'Focus' },
  { to: '/tasks',    icon: CheckSquare,    label: 'Tasks' },
  { to: '/settings', icon: Settings,       label: 'Settings' },
]

const PROVIDER_MOBILE_NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
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
  )
}

export function Sidebar({ isProvider }) {
  const { theme, rewards, userProfile } = useApp()
  const { user, signOut } = useAuth()
  const avatar = userProfile?.profile?.avatarEmoji || '🧠'
  const name   = userProfile?.profile?.displayName || user?.displayName || user?.email?.split('@')[0] || ''

  const mobileNav = isProvider ? PROVIDER_MOBILE_NAV : PATIENT_MOBILE_NAV

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 h-full bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800">
        <div className="px-5 py-5 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <HeartHandshake size={14} className="text-white" />
            </div>
            <span className="font-semibold text-ink-900 dark:text-ink-100">MentisFlow</span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-base">{avatar}</span>
              <p className="text-xs text-ink-400 truncate">{name}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {isProvider ? (
            <div className="space-y-0.5">
              {PROVIDER_NAV.map(item => <NavItem key={item.to} {...item} />)}
            </div>
          ) : (
            <div className="space-y-0.5">
              {CONNECT_NAV.map(item => <NavItem key={item.to} {...item} />)}

              <div className="flex items-center gap-2 px-1 py-2.5 mt-1">
                <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
                <div className="flex items-center gap-1">
                  <Zap size={9} className="text-primary-500" />
                  <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">FocusBlink</span>
                </div>
                <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
              </div>

              {FOCUSBLINK_NAV.map(item => <NavItem key={item.to} {...item} />)}

              <div className="pt-1">
                {SETTINGS_NAV.map(item => <NavItem key={item.to} {...item} />)}
              </div>
            </div>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-surface-200 dark:border-surface-800 space-y-2">
          {!isProvider && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 dark:bg-primary-700/15">
              <Zap size={14} className="text-primary-500" />
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{rewards.totalPoints} XP</span>
              <span className="text-xs text-ink-400 ml-auto">Lv {rewards.currentLevel.level}</span>
            </div>
          )}
          <button
            onClick={theme.toggleTheme}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-ink-400 hover:text-ink-700 dark:hover:text-ink-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            {theme.isDark ? <Sun size={15} /> : <Moon size={15} />}
            {theme.isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={15} />Sign out
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 flex safe-bottom">
        {mobileNav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
