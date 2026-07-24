import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Timer, CheckSquare, Brain, Repeat, Sun, Trophy, Zap, LogOut, BarChart2, Settings, HeartHandshake, LayoutDashboard, ClipboardList, MoreHorizontal, X, Shield, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { ThemeToggle } from '../../theme/ThemeProvider'
import Avatar from '../ui/Avatar'
import { useProfilePhoto } from '../../hooks/useProfilePhoto'
import { useAuth } from '../../context/AuthContext'
import { isAdminUser } from '../../utils/admin'

const CONNECT_NAV = [
  { to: '/connect',   icon: HeartHandshake, label: 'Connect' },
  { to: '/treatment', icon: ClipboardList,  label: 'Treatment Plan' },
]

// The dashboard aggregates the FocusBlink tools, so it's shown only when at
// least one tool is enabled. Each tool item carries its `tool` key so it can
// be filtered against the user's preferences.
const HOME_NAV  = { to: '/', icon: Home, label: 'Home', end: true }
const FOCUS_NAV = [
  { to: '/checkin', icon: Sun,         label: 'Check-in',    tool: 'checkin' },
  { to: '/habits',  icon: Repeat,      label: 'Habits',      tool: 'habits' },
  { to: '/tasks',   icon: CheckSquare, label: 'Tasks',       tool: 'tasks' },
  { to: '/timer',   icon: Timer,       label: 'Focus Timer', tool: 'timer' },
  { to: '/dump',    icon: Brain,       label: 'Brain Dump',  tool: 'dump' },
  { to: '/monthly', icon: BarChart2,   label: 'Monthly',     tool: 'monthly' },
  { to: '/rewards', icon: Trophy,      label: 'Rewards',     tool: 'rewards' },
]
const TREATMENT_NAV = { to: '/treatment', icon: ClipboardList, label: 'Treatment Plan' }

const PROVIDER_NAV = [
  { to: '/',                   icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/provider/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/settings',           icon: Settings,        label: 'Settings' },
]

const PROVIDER_MOBILE_NAV = [
  { to: '/',                   icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/provider/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/settings',           icon: Settings,        label: 'Settings' },
]

const CONNECT_ITEM = { to: '/connect', icon: HeartHandshake, label: 'Connect' }

function SectionLabel({ children }) {
  return (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-faint">
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
        `group flex items-center gap-3 px-3 py-2.5  text-sm transition-all duration-150 ${
          isActive
            ? 'bg-accent-soft text-accent-soft-text font-semibold shadow-sm'
            : 'font-medium text-muted hover:bg-raised hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={17} className={isActive ? 'text-accent-soft-text' : 'text-faint group-hover:text-ink'} />
          {label}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ isProvider }) {
  const { rewards, userProfile, tools } = useApp()
  const { user, signOut } = useAuth()
  const name      = userProfile?.profile?.displayName || user?.displayName || user?.email?.split('@')[0] || ''
  const photoURL  = useProfilePhoto(user?.uid, isProvider ? 'provider' : 'patient')
  const [moreOpen, setMoreOpen] = useState(false)

  // Only the FocusBlink tools the patient has kept enabled.
  const enabledFocus = FOCUS_NAV.filter(i => tools.isEnabled(i.tool))
  const anyFocus     = tools.anyEnabled

  // Mobile bottom bar: Connect + Home + up to two enabled tools when any tool
  // is on; otherwise just the two Care destinations.
  const patientBar = anyFocus
    ? [CONNECT_ITEM, HOME_NAV, ...enabledFocus.slice(0, 2)]
    : [CONNECT_ITEM, TREATMENT_NAV]
  const barRoutes  = new Set(patientBar.map(i => i.to))
  const patientMore = [...enabledFocus, TREATMENT_NAV, { to: '/settings', icon: Settings, label: 'Settings' }]
    .filter(i => !barRoutes.has(i.to))

  const mobileNav  = isProvider ? PROVIDER_MOBILE_NAV : patientBar
  // Providers reach their FocusBlink tools through the same More sheet.
  const moreItems  = isProvider ? enabledFocus : patientMore

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 h-full bg-surface border-r border-line">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9  bg-accent flex items-center justify-center shadow-sm">
              <HeartHandshake size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-ink">MentisFlow</span>
          </div>
          {user && (
            <NavLink to="/settings"
              className="flex items-center gap-2.5 px-3 py-2.5  bg-raised border border-line hover:border-accent/40 transition-colors group"
              title="View your profile">
              <Avatar photoUrl={photoURL} name={name} seed={user?.uid} role={isProvider ? 'provider' : 'patient'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink truncate">{name}</p>
                <p className="text-[10px] text-faint">{isProvider ? 'Practitioner' : 'Patient'} · View profile</p>
              </div>
              <ChevronRight size={13} className="text-faint group-hover:text-accent flex-shrink-0 transition-colors" />
            </NavLink>
          )}
        </div>

        <nav className="flex-1 px-3 pb-4 overflow-y-auto">
          {isProvider ? (
            <div className="space-y-0.5">
              <SectionLabel>Practice</SectionLabel>
              {PROVIDER_NAV.map(item => <NavItem key={item.to} {...item} />)}

              {/* Same toggles as the patient side (Settings > FocusBlink):
                  the section reacts immediately when a tool is switched. */}
              {anyFocus && (
                <>
                  <SectionLabel>
                    <span className="inline-flex items-center gap-1">
                      <Zap size={9} className="text-accent" />
                      FocusBlink
                    </span>
                  </SectionLabel>
                  {enabledFocus.map(item => <NavItem key={item.to} {...item} />)}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              <SectionLabel>Care</SectionLabel>
              {CONNECT_NAV.map(item => <NavItem key={item.to} {...item} />)}

              {anyFocus && (
                <>
                  <SectionLabel>
                    <span className="inline-flex items-center gap-1">
                      <Zap size={9} className="text-accent" />
                      FocusBlink
                    </span>
                  </SectionLabel>
                  <NavItem {...HOME_NAV} />
                  {enabledFocus.map(item => <NavItem key={item.to} {...item} />)}
                </>
              )}

              <SectionLabel>Account</SectionLabel>
              <NavItem to="/settings" icon={Settings} label="Settings" />
              {isAdminUser(user) && <NavItem to="/admin" icon={Shield} label="Admin Portal" />}
            </div>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-line space-y-2">
          {!isProvider && (
            <div className="flex items-center gap-2 px-3 py-2.5  bg-gradient-to-r from-accent to-accent-strong text-white shadow-sm">
              <Zap size={14} />
              <span className="text-xs font-bold">{rewards.totalPoints} XP</span>
              <span className="text-[11px] text-white/80 ml-auto font-medium">Level {rewards.currentLevel.level}</span>
            </div>
          )}
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
          <button
            onClick={signOut}
            className="focus-ring flex items-center gap-2.5 w-full px-3 py-2  text-sm text-faint hover:text-danger hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={15} />Sign out
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line flex safe-bottom">
        {mobileNav.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
                isActive ? 'text-accent-soft-text font-semibold' : 'text-faint font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`px-3.5 py-1  transition-colors ${isActive ? 'bg-accent-soft' : ''}`}>
                  <Icon size={19} />
                </span>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        {moreItems.length > 0 && (
          <button onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-faint">
            <span className="px-3.5 py-1"><MoreHorizontal size={19} /></span>
            <span className="leading-none">More</span>
          </button>
        )}
      </nav>

      {moreOpen && moreItems.length > 0 && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface  border-t border-line">
            <div className="mx-auto mt-2.5 h-1 w-10  bg-line" />
            <div className="flex items-center justify-between px-5 pt-2.5 pb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-faint">More</p>
              <button onClick={() => setMoreOpen(false)} className="p-1  text-faint hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-8">
              {moreItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 py-3.5 px-2  text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-accent-soft text-accent-soft-text'
                        : 'bg-raised text-muted'
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
