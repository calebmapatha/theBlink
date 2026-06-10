import { useState, useEffect } from 'react'
import { useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { getDoc, doc } from 'firebase/firestore'
import { db } from './lib/firebase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { Sidebar } from './components/layout/Sidebar'
import { Toast } from './components/ui/Toast'
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
import { Login } from './pages/Login'
import { Privacy } from './pages/Privacy'
import { useApp } from './context/AppContext'
import { HeartHandshake } from 'lucide-react'

function AppShell({ isProvider }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { toast } = useApp()
  const [syncError, setSyncError] = useState(false)

  useEffect(() => {
    if (!isProvider && localStorage.getItem('mf_role') === 'provider') {
      navigate('/provider/signup', { replace: true })
    }
  }, [isProvider])

  // Warn the user if a Firestore sync ultimately fails, so data loss is visible.
  useEffect(() => {
    const onSyncError = () => setSyncError(true)
    window.addEventListener('mf-sync-error', onSyncError)
    return () => window.removeEventListener('mf-sync-error', onSyncError)
  }, [])

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950 text-ink-900 dark:text-ink-100">
      {syncError && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-3">
          <span>Some changes couldn’t be saved to the cloud. Check your connection — your data is safe on this device.</span>
          <button onClick={() => setSyncError(false)} className="underline flex-shrink-0">Dismiss</button>
        </div>
      )}
      <Sidebar isProvider={isProvider} />
      <main className="flex-1 min-w-0 h-full pb-16 md:pb-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {isProvider ? (
              <>
                <Route path="/"                   element={<ProviderDashboard />} />
                <Route path="/provider/dashboard" element={<ProviderDashboard />} />
                <Route path="/settings"           element={<Settings />} />
                <Route path="*"                   element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                <Route path="/"                   element={<Dashboard />} />
                <Route path="/connect"            element={<Connect />} />
                <Route path="/treatment"          element={<TreatmentPlan />} />
                <Route path="/timer"              element={<FocusTimer />} />
                <Route path="/tasks"              element={<TaskBoard />} />
                <Route path="/dump"               element={<BrainDump />} />
                <Route path="/habits"             element={<HabitTracker />} />
                <Route path="/monthly"            element={<MonthlyTracker />} />
                <Route path="/checkin"            element={<DailyCheckin />} />
                <Route path="/rewards"            element={<Rewards />} />
                <Route path="/settings"           element={<Settings />} />
                <Route path="/provider/signup"    element={<ProviderSignup />} />
                <Route path="*"                   element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </AnimatePresence>
      </main>
      <Toast toast={toast} />
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center animate-pulse">
          <HeartHandshake size={22} className="text-white" />
        </div>
        <p className="text-sm text-slate-400">Loading MentisFlow…</p>
      </div>
    </div>
  )
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

  // Privacy policy is public — viewable without authentication. Robust to the
  // deploy base path (/theBlink/) since we match on the path suffix.
  if (window.location.pathname.replace(/\/$/, '').endsWith('/privacy')) return <Privacy />

  if (user === undefined || (user !== null && isProvider === undefined)) return <LoadingScreen />
  if (!user) return <Login />
  return (
    <AppProvider userId={user.uid}>
      <AppShell isProvider={isProvider} />
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
