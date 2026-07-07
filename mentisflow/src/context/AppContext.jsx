import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useTimer } from '../hooks/useTimer'
import { useTasks } from '../hooks/useTasks'
import { useBrainDump } from '../hooks/useBrainDump'
import { useHabits } from '../hooks/useHabits'
import { useCheckin } from '../hooks/useCheckin'
import { useRewards } from '../hooks/useRewards'
import { useTheme } from '../hooks/useTheme'
import { useUserProfile } from '../hooks/useUserProfile'
import { useNotifications } from '../hooks/useNotifications'
import { useToolPrefs } from '../hooks/useToolPrefs'

const AppContext = createContext(null)

export function AppProvider({ userId, children }) {
  const rewards = useRewards(userId)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef()

  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  // General toast. Second arg is either a number (XP points, back-compat) or
  // an options object: { pts, variant: 'success'|'error'|'info', action:
  // { label, onClick } }. Toasts with an action linger longer so it's tappable.
  const showToast = useCallback((message, opts = {}) => {
    const o = typeof opts === 'number' ? { pts: opts } : opts
    clearTimeout(toastTimer.current)
    setToast({
      message,
      pts: o.pts ?? null,
      variant: o.variant || (o.pts != null ? 'reward' : 'success'),
      action: o.action || null,
      id: Date.now(),
    })
    toastTimer.current = setTimeout(() => setToast(null), o.action ? 5000 : 2500)
  }, [])

  const awardAndToast = useCallback((action, label) => {
    const pts = rewards.awardPoints(action, label)
    if (pts > 0) showToast(label || action, { pts })
    return pts
  }, [rewards, showToast])

  const timer         = useTimer(() => awardAndToast('FOCUS_SESSION', 'Focus session complete!'))
  const tasks         = useTasks(userId)
  const dump          = useBrainDump(userId)
  const habits        = useHabits(userId)
  const checkin       = useCheckin(userId)
  const theme         = useTheme()
  const userProfile   = useUserProfile(userId)
  const notifications = useNotifications()
  const tools         = useToolPrefs(userId)

  return (
    <AppContext.Provider value={{ timer, tasks, dump, habits, checkin, rewards, theme, toast, showToast, dismissToast, awardAndToast, userProfile, userId, notifications, tools }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
