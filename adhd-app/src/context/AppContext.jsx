import { createContext, useContext, useState, useCallback } from 'react'
import { useTimer } from '../hooks/useTimer'
import { useTasks } from '../hooks/useTasks'
import { useBrainDump } from '../hooks/useBrainDump'
import { useHabits } from '../hooks/useHabits'
import { useCheckin } from '../hooks/useCheckin'
import { useRewards } from '../hooks/useRewards'
import { useTheme } from '../hooks/useTheme'
import { useUserProfile } from '../hooks/useUserProfile'

const AppContext = createContext(null)

export function AppProvider({ userId, children }) {
  const rewards = useRewards(userId)
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

  const timer   = useTimer(() => awardAndToast('FOCUS_SESSION', 'Focus session complete!'))
  const tasks   = useTasks(userId)
  const dump    = useBrainDump(userId)
  const habits  = useHabits(userId)
  const checkin = useCheckin(userId)
  const theme   = useTheme()
  const userProfile = useUserProfile(userId)

  return (
    <AppContext.Provider value={{ timer, tasks, dump, habits, checkin, rewards, theme, toast, awardAndToast, userProfile, userId }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
