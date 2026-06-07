import { useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { Sidebar } from './components/layout/Sidebar'
import { Toast } from './components/ui/Toast'
import { FocusTimer } from './pages/FocusTimer'
import { TaskBoard } from './pages/TaskBoard'
import { BrainDump } from './pages/BrainDump'
import { HabitTracker } from './pages/HabitTracker'
import { MonthlyTracker } from './pages/MonthlyTracker'
import { DailyCheckin } from './pages/DailyCheckin'
import { Rewards } from './pages/Rewards'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { useApp } from './context/AppContext'
import { Zap } from 'lucide-react'

function AppShell() {
  const location = useLocation()
  const { toast } = useApp()

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950 text-ink-900 dark:text-ink-100">
      <Sidebar />
      <main className="flex-1 min-w-0 h-full pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"         element={<Navigate to="/timer" replace />} />
            <Route path="/timer"    element={<FocusTimer />} />
            <Route path="/tasks"    element={<TaskBoard />} />
            <Route path="/dump"     element={<BrainDump />} />
            <Route path="/habits"   element={<HabitTracker />} />
            <Route path="/monthly"  element={<MonthlyTracker />} />
            <Route path="/checkin"  element={<DailyCheckin />} />
            <Route path="/rewards"  element={<Rewards />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*"         element={<Navigate to="/timer" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Toast toast={toast} />
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center animate-pulse">
          <Zap size={22} className="text-white" />
        </div>
        <p className="text-sm text-ink-400">Loading…</p>
      </div>
    </div>
  )
}

function AuthGate() {
  const { user } = useAuth()
  if (user === undefined) return <LoadingScreen />
  if (user === null) return <Login />
  return (
    <AppProvider userId={user.uid}>
      <AppShell />
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
