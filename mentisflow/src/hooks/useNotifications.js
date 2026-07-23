import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'

const DEFAULT_PREFS = {
  habitReminder: { enabled: false, time: '09:00' },
  focusReminder:  { enabled: false, time: '10:00' },
}

// Use SW showNotification when available — it's more reliable on mobile and
// works even when the page is in the background (but not when fully closed
// without push server support).
async function sendNotification(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        body,
        icon: `${import.meta.env.BASE_URL}icon-192.png`,
        badge: `${import.meta.env.BASE_URL}icon-192.png`,
      })
      return
    } catch { /* fall through to direct API */ }
  }
  new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icon-192.png` })
}

export function useNotifications() {
  const [prefs, setPrefs] = useLocalStorage('adhd_notifications', DEFAULT_PREFS)
  // Reactive permission state so the UI re-renders when the user grants access.
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unavailable'
  )
  const timersRef = useRef([])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'not-supported'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const notifyNow = useCallback((title, body) => {
    sendNotification(title, body)
  }, [])

  const scheduleForTime = useCallback((timeStr, title, body) => {
    const [h, m] = timeStr.split(':').map(Number)
    const now = new Date()
    const target = new Date()
    target.setHours(h, m, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    return setTimeout(() => sendNotification(title, body), target - now)
  }, [])

  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (permission !== 'granted') return
    if (prefs.habitReminder?.enabled) {
      const id = scheduleForTime(
        prefs.habitReminder.time,
        'MentisFlow: Habit time!',
        'Check in on your habits for today 🌱',
      )
      if (id) timersRef.current.push(id)
    }
    if (prefs.focusReminder?.enabled) {
      const id = scheduleForTime(
        prefs.focusReminder.time,
        'MentisFlow: Focus session',
        "Time to start a focus session. You’ve got this! 🎯",
      )
      if (id) timersRef.current.push(id)
    }
    return () => timersRef.current.forEach(clearTimeout)
  }, [prefs, permission, scheduleForTime])

  const updatePref = useCallback((key, updates) => {
    setPrefs(p => ({ ...p, [key]: { ...p[key], ...updates } }))
  }, [setPrefs])

  return { prefs, permission, requestPermission, notifyNow, updatePref }
}
