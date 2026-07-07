import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Timer, CheckSquare, Brain, Repeat, Sun, Trophy, Moon, Zap, LogOut, BarChart2, Settings, HeartHandshake, LayoutDashboard, ClipboardList, MoreHorizontal, X, Shield } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { isAdminUser } from '../../utils/admin'

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

const PROVIDER_NAV = [
  { to: '/',                   icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/provider/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/settings',           icon: Settings,        label: 'Settings' },
]

const PATIENT_MOBILE_NAV = [
  { to: '/connect', icon: HeartHandshake, label: 'Connect' },
  { to: '/',        icon: Home,           label: 'Home',    end: true },
  { to: '/tasks',   icon: CheckSquare,    label: 'Tasks' },
  { to: '/habits',  icon: Repeat,         label: 'Habits' },
]

const PATIENT_MORE_NAV = [
  { to: '/dump',      icon: Brain,         label: 'Brain Dump' },
  { to: '/timer',     icon: Timer,         label: 'Focus Timer' },
  { to: '/monthly',   icon: BarChart2,     label: 'Monthly' },
  { to: '/checkin',   icon: Sun,           label: 'Check-in' },
  { to: '/rewards',   icon: Trophy,        label: 'Rewards' },
  { to: '/treatment', icon: ClipboardList, label: 'Treatment Plan' },
  { to: '/settings',  icon: Settings,      label: 'Settings' },
]

const PROVIDER_MOBILE_NAV = [
  { to: '/',                   icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/provider/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/settings',           icon: Settings,        label: 'Settings' },
]

function SectionLabel({ children }) {
  return (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-400">
      {children}
    </p>
  )
}

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-700/20 text-primary-700 dark:text-primary-300 font-semibold shadow-sm shadow-primary-500/5'
            : 'font-medium text-ink-700 dark:text-ink-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-ink-900 dark:hover:text-ink-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={17} className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-ink-400 group-hover:text-ink-700 dark:group-hover:text-ink-200'} />
          {label}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ isProvider }) {
  const { theme, rewards, userProfile } = useApp()
  const { user, signOut } = useAuth()
  const avatar    = userProfile?.profile?.avatarEmoji || '🧠'
  const name      = userProfile?.profile?.displayName || user?.displayName || user?.email?.split('@')[0] || ''
  const [moreOpen, setMoreOpen] = useState(false)

  const mobileNav = isProvider ? PROVIDER_MOBILE_NAV : PATIENT_MOBILE_NAV

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 h-full bg-white dark:bg-surface-900 border-r border-surface-100 dark:border-surface-800">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm">
              <HeartHandshake size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-ink-900 dark:text-ink-100">MentisFlow</span>
          </div>
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-100 dark:border-surface-700/60">
              <span className="text-lg leading-none">{avatar}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-900 dark:text-ink-100 truncate">{name}</p>
                <p className="text-[10px] text-ink-400">{isProvider ? 'Practitioner' : 'Patient'}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 pb-4 overflow-y-auto">
          {isProvider ? (
            <div className="space-y-0.5">
              <SectionLabel>Practice</SectionLabel>
              {PROVIDER_NAV.map(item => <NavItem key={item.to} {...item} />)}
            </div>
          ) : (
            <div className="space-y-0.5">
              <SectionLabel>Care</SectionLabel>
              {CONNECT_NAV.map(item => <NavItem key={item.to} {...item} />)}

              <SectionLabel>
                <span className="inline-flex items-center gap-1">
                  <Zap size={9} className="text-primary-500" />
                  FocusBlink
                </span>
              </SectionLabel>
              {FOCUSBLINK_NAV.map(item => <NavItem key={item.to} {...item} />)}

              <SectionLabel>Account</SectionLabel>
              <NavItem to="/settings" icon={Settings} label="Settings" />
              {isAdminUser(user) && <NavItem to="/admin" icon={Shield} label="Admin Portal" />}
            </div>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-surface-100 dark:border-surface-800 space-y-2">
          {!isProvider && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm">
              <Zap size={14} />
              <span className="text-xs font-bold">{rewards.totalPoints} XP</span>
              <span className="text-[11px] text-white/80 ml-auto font-medium">Level {rewards.currentLevel.level}</span>
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-surface-900/95 backdrop-blur-md border-t border-surface-100 dark:border-surface-800 flex safe-bottom">
        {mobileNav.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
                isActive ? 'text-primary-600 dark:text-primary-400 font-semibold' : 'text-ink-400 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`px-3.5 py-1 rounded-full transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-700/20' : ''}`}>
                  <Icon size={19} />
                </span>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        {!isProvider && (
          <button onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-ink-400">
            <span className="px-3.5 py-1"><MoreHorizontal size={19} /></span>
            <span className="leading-none">More</span>
          </button>
        )}
      </nav>

      {moreOpen && !isProvider && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-surface-900 rounded-t-3xl border-t border-surface-100 dark:border-surface-700">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
            <div className="flex items-center justify-between px-5 pt-2.5 pb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400">More</p>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-ink-100">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-8">
              {PATIENT_MORE_NAV.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-700/20 text-primary-700 dark:text-primary-300'
                        : 'bg-surface-50 dark:bg-surface-800 text-ink-600 dark:text-ink-300'
                    }`
                  }
                >
                  <Icon size={22} />
                  <span className="text-center leading-tight">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
