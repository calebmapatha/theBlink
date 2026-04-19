import { createContext, useContext, useState, useCallback } from 'react'
import { useTimer } from '../hooks/useTimer'
import { useTasks } from '../hooks/useTasks'
import { useBrainDump } from '../hooks/useBrainDump'
import { useHabits } from '../hooks/useHabits'
import { useCheckin } from '../hooks/useCheckin'
import { useRewards } from '../hooks/useRewards'
import { useTheme } from '../hooks/useTheme'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const rewards = useRewards()
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, pts) => {
    setToast({ message, pts, id: Date.now() })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const awardAndToast = useCallback((action, label) => {
    const pts = rewards.awardPoints(action, label)
    if (pts > 0) showToast(label || action, pts)
    return pts
  }, [rewards, showToast])

  const timer = useTimer(() => awardAndToast('FOCUS_SESSION', 'Focus session complete!'))
  const tasks   = useTasks()
  const dump    = useBrainDump()
  const habits  = useHabits()
  const checkin = useCheckin()
  const theme   = useTheme()

  return (
    <AppContext.Provider value={{ timer, tasks, dump, habits, checkin, rewards, theme, toast, awardAndToast }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
