import { useCallback, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'

const DEFAULT_PREFS = {
  habitReminder: { enabled: false, time: '09:00' },
  focusReminder:  { enabled: false, time: '10:00' },
}

export function useNotifications() {
  const [prefs, setPrefs] = useLocalStorage('adhd_notifications', DEFAULT_PREFS)
  const timersRef = useRef([])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'not-supported'
    return Notification.requestPermission()
  }, [])

  const notify = useCallback((title, body) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    new Notification(title, { body, icon: '/theBlink/icon-192.png' })
  }, [])

  const scheduleForTime = useCallback((timeStr, title, body) => {
    const [h, m] = timeStr.split(':').map(Number)
    const now = new Date()
    const target = new Date()
    target.setHours(h, m, 0, 0)
    // If the time has already passed today, schedule for the same time tomorrow
    // rather than silently dropping the reminder.
    if (target <= now) target.setDate(target.getDate() + 1)
    return setTimeout(() => notify(title, body), target - now)
  }, [notify])

  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (prefs.habitReminder?.enabled) {
      const id = scheduleForTime(prefs.habitReminder.time, 'FocusBlink: Habit time!', 'Check in on your habits for today 🌱')
      if (id) timersRef.current.push(id)
    }
    if (prefs.focusReminder?.enabled) {
      const id = scheduleForTime(prefs.focusReminder.time, 'FocusBlink: Focus session', "Time to start a focus session. You've got this! 🎯")
      if (id) timersRef.current.push(id)
    }
    return () => timersRef.current.forEach(clearTimeout)
  }, [prefs, scheduleForTime])

  const updatePref = useCallback((key, updates) => {
    setPrefs(p => ({ ...p, [key]: { ...p[key], ...updates } }))
  }, [setPrefs])

  return { prefs, requestPermission, updatePref }
}
