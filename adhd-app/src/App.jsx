import { useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import { Sidebar } from './components/layout/Sidebar'
import { Toast } from './components/ui/Toast'
import { FocusTimer } from './pages/FocusTimer'
import { TaskBoard } from './pages/TaskBoard'
import { BrainDump } from './pages/BrainDump'
import { HabitTracker } from './pages/HabitTracker'
import { DailyCheckin } from './pages/DailyCheckin'
import { Rewards } from './pages/Rewards'
import { useApp } from './context/AppContext'

function AppShell() {
  const location = useLocation()
  const { toast } = useApp()

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950 text-ink-900 dark:text-ink-100">
      <Sidebar />
      <main className="flex-1 min-w-0 h-full pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/timer" replace />} />
            <Route path="/timer"   element={<FocusTimer />} />
            <Route path="/tasks"   element={<TaskBoard />} />
            <Route path="/dump"    element={<BrainDump />} />
            <Route path="/habits"  element={<HabitTracker />} />
            <Route path="/checkin" element={<DailyCheckin />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="*"        element={<Navigate to="/timer" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Toast toast={toast} />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
