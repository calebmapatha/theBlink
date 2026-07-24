import { useState, useEffect } from 'react'
import { useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { getDoc, doc } from 'firebase/firestore'
import { db } from './lib/firebase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './theme/ThemeProvider'
import { AppProvider } from './context/AppContext'
import { Sidebar } from './components/layout/Sidebar'
import { Toast } from './components/ui/Toast'
import { Onboarding } from './components/Onboarding'
import { Notifications } from './components/Notifications'
import { Dashboard } from './pages/Dashboard'
import { FocusTimer } from './pages/FocusTimer'
import { TaskBoard } from './pages/TaskBoard'
import { BrainDump } from './pages/BrainDump'
import { HabitTracker } from './pages/HabitTracker'
import { MonthlyTracker } from './pages/MonthlyTracker'
import { DailyCheckin } from './pages/DailyCheckin'
import { Rewards } from './pages/Rewards'
import { Settings } from './pages/Settings'
import { Connect } from './pages/Connect'
import { TreatmentPlan } from './pages/TreatmentPlan'
import { ProviderSignup } from './pages/ProviderSignup'
import { ProviderDashboard } from './pages/ProviderDashboard'
import { ProviderAnalytics } from './pages/ProviderAnalytics'
import { ProviderVault } from './pages/ProviderVault'
import { AdminPortal } from './pages/AdminPortal'
import { fetchLatestAnnouncement } from './hooks/useAdmin'
import { Login } from './pages/Login'
import { Landing } from './pages/Landing'
import { Practitioners } from './pages/Practitioners'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { useApp } from './context/AppContext'
import { HeartHandshake } from 'lucide-react'

function AppShell({ isProvider }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { toast, dismissToast, tools } = useApp()
  const [syncError, setSyncError] = useState(false)
  const [announcement, setAnnouncement] = useState(null)

  // Users can disable FocusBlink tools; a disabled tool's route (and Home,
  // when every tool is off) falls back so the URL is never a dead end.
  // Guards a route element behind its tool preference. The same toggles now
  // drive BOTH roles: practitioners get the tools too (Settings > FocusBlink).
  const homeFallback = isProvider || tools.anyEnabled ? '/' : '/connect'
  const gate = (key, element) =>
    tools.isEnabled(key) ? element : <Navigate to={homeFallback} replace />

  useEffect(() => {
    if (!isProvider && localStorage.getItem('mf_role') === 'provider') {
      navigate('/provider/signup', { replace: true })
    }
  }, [isProvider])

  // Platform announcements published from the Super Admin portal.
  useEffect(() => {
    fetchLatestAnnouncement(isProvider ? 'provider' : 'patient').then(a => {
      if (!a) return
      const dismissed = JSON.parse(localStorage.getItem('mf_dismissed_announcements') || '[]')
      if (!dismissed.includes(a.id)) setAnnouncement(a)
    })
  }, [isProvider])

  const dismissAnnouncement = () => {
    const dismissed = JSON.parse(localStorage.getItem('mf_dismissed_announcements') || '[]')
    localStorage.setItem('mf_dismissed_announcements', JSON.stringify([...dismissed, announcement.id].slice(-20)))
    setAnnouncement(null)
  }

  // Warn the user if a Firestore sync ultimately fails, so data loss is visible.
  useEffect(() => {
    const onSyncError = () => setSyncError(true)
    window.addEventListener('mf-sync-error', onSyncError)
    return () => window.removeEventListener('mf-sync-error', onSyncError)
  }, [])

  return (
    <div className="flex h-dvh bg-bg text-ink">
      {syncError && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-3">
          <span>Some changes couldn’t be saved to the cloud. Check your connection. Your data is safe on this device.</span>
          <button onClick={() => setSyncError(false)} className="underline flex-shrink-0">Dismiss</button>
        </div>
      )}
      {announcement && !syncError && (
        <div className="fixed top-0 inset-x-0 z-50 bg-accent text-on-accent text-xs px-4 py-2 flex items-center justify-center gap-3">
          <span><strong>{announcement.title}</strong>: {announcement.body}</span>
          <button onClick={dismissAnnouncement} className="underline flex-shrink-0">Dismiss</button>
        </div>
      )}
      <Sidebar isProvider={isProvider} />
      {/* First-run tour for patients; providers get the signup wizard instead. */}
      {!isProvider && <Onboarding />}
      <main className="flex-1 min-w-0 h-full pb-16 md:pb-0 overflow-y-auto overscroll-contain">
        <Notifications />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {isProvider ? (
              <>
                <Route path="/"                   element={<ProviderDashboard />} />
                <Route path="/provider/dashboard" element={<ProviderDashboard />} />
                <Route path="/provider/analytics" element={<ProviderAnalytics />} />
                <Route path="/provider/files"     element={<ProviderVault />} />
                {/* FocusBlink tools, driven by the same Settings toggles as the patient side. */}
                <Route path="/timer"              element={gate('timer', <FocusTimer />)} />
                <Route path="/tasks"              element={gate('tasks', <TaskBoard />)} />
                <Route path="/dump"               element={gate('dump', <BrainDump />)} />
                <Route path="/habits"             element={gate('habits', <HabitTracker />)} />
                <Route path="/monthly"            element={gate('monthly', <MonthlyTracker />)} />
                <Route path="/checkin"            element={gate('checkin', <DailyCheckin />)} />
                <Route path="/rewards"            element={gate('rewards', <Rewards />)} />
                <Route path="/settings"           element={<Settings />} />
                <Route path="/admin"              element={<AdminPortal />} />
                <Route path="*"                   element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                <Route path="/"                   element={tools.anyEnabled ? <Dashboard /> : <Navigate to="/connect" replace />} />
                <Route path="/connect"            element={<Connect />} />
                <Route path="/treatment"          element={<TreatmentPlan />} />
                <Route path="/timer"              element={gate('timer', <FocusTimer />)} />
                <Route path="/tasks"              element={gate('tasks', <TaskBoard />)} />
                <Route path="/dump"               element={gate('dump', <BrainDump />)} />
                <Route path="/habits"             element={gate('habits', <HabitTracker />)} />
                <Route path="/monthly"            element={gate('monthly', <MonthlyTracker />)} />
                <Route path="/checkin"            element={gate('checkin', <DailyCheckin />)} />
                <Route path="/rewards"            element={gate('rewards', <Rewards />)} />
                <Route path="/settings"           element={<Settings />} />
                <Route path="/provider/signup"    element={<ProviderSignup />} />
                <Route path="/admin"              element={<AdminPortal />} />
                <Route path="*"                   element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </AnimatePresence>
      </main>
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12  bg-accent flex items-center justify-center animate-pulse">
          <HeartHandshake size={22} className="text-white" />
        </div>
        <p className="text-sm text-faint">Loading MentisFlow…</p>
      </div>
    </div>
  )
}

// Public front door for logged-out visitors: marketing landing page with a
// switch into the sign-in flow. Plain state (no router) keeps this robust to
// the GitHub Pages base path (/theBlink/), same as the /privacy check below.
// The landing page is ALWAYS the default; the login form only appears after
// an explicit tap on a sign-in / get-started button.
function PublicSite() {
  // The dedicated /practitioners page links here with ?role=provider so a
  // visitor lands straight in the practitioner sign-up flow.
  const queryRole = new URLSearchParams(window.location.search).get('role')
  const startRole = queryRole === 'provider' || queryRole === 'patient' ? queryRole : null
  const [view, setView] = useState(startRole ? 'login' : 'landing')
  const [role, setRole] = useState(startRole)

  // Persist the role from ?role= so the post-sign-up redirect (which reads
  // mf_role) routes a practitioner arriving from /practitioners correctly.
  useEffect(() => {
    if (startRole) localStorage.setItem('mf_role', startRole)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openLogin = (r = null) => {
    if (r) localStorage.setItem('mf_role', r)
    setRole(r)
    setView('login')
    window.scrollTo(0, 0)
  }

  if (view === 'login') return <Login onBack={() => setView('landing')} initialRole={role} />
  return <Landing onSignIn={() => openLogin()} onGetStarted={openLogin} />
}

function AuthGate() {
  const { user } = useAuth()
  const [isProvider, setIsProvider] = useState(undefined)

  useEffect(() => {
    if (user === undefined) return
    if (!user) { setIsProvider(false); return }
    getDoc(doc(db, 'providers', user.uid))
      .then(snap => setIsProvider(!!(snap.exists() && snap.data()?.subscriptionActive)))
      .catch(() => setIsProvider(false))
  }, [user?.uid])

  // Legal pages are public — viewable without authentication. Robust to the
  // deploy base path (/theBlink/) since we match on the path suffix.
  const publicPath = window.location.pathname.replace(/\/$/, '')
  if (publicPath.endsWith('/privacy')) return <Privacy />
  if (publicPath.endsWith('/terms')) return <Terms />
  if (publicPath.endsWith('/practitioners')) return <Practitioners />

  if (user === undefined || (user !== null && isProvider === undefined)) return <LoadingScreen />
  if (!user) return <PublicSite />
  return (
    <AppProvider userId={user.uid}>
      <AppShell isProvider={isProvider} />
    </AppProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  )
}
