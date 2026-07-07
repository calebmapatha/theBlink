import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'

// The FocusBlink tools a patient can turn off individually. Care tools
// (Connect, Treatment Plan) are always available and not listed here.
export const FOCUSBLINK_TOOLS = [
  { key: 'checkin', route: '/checkin', label: 'Daily Check-in' },
  { key: 'habits',  route: '/habits',  label: 'Habits' },
  { key: 'tasks',   route: '/tasks',   label: 'Tasks' },
  { key: 'timer',   route: '/timer',   label: 'Focus Timer' },
  { key: 'dump',    route: '/dump',    label: 'Brain Dump' },
  { key: 'monthly', route: '/monthly', label: 'Monthly Tracker' },
  { key: 'rewards', route: '/rewards', label: 'Rewards' },
]

const ALL_KEYS = FOCUSBLINK_TOOLS.map(t => t.key)
const DEFAULTS  = Object.fromEntries(ALL_KEYS.map(k => [k, true]))

// A tool is enabled unless explicitly turned off, so tools added in a future
// version default to on for existing users. Disabling only hides the UI and
// stops reminders — the underlying data is never deleted.
export function useToolPrefs(userId) {
  const [prefs, setPrefs] = useUserLocalStorage(userId, 'tool_prefs', DEFAULTS)

  const isEnabled = useCallback((key) => prefs?.[key] !== false, [prefs])
  const setEnabled = useCallback((key, on) => setPrefs(p => ({ ...p, [key]: on })), [setPrefs])
  const setAll = useCallback((on) => setPrefs(Object.fromEntries(ALL_KEYS.map(k => [k, on]))), [setPrefs])

  const enabledKeys   = ALL_KEYS.filter(k => prefs?.[k] !== false)
  const enabledRoutes = FOCUSBLINK_TOOLS.filter(t => prefs?.[t.key] !== false).map(t => t.route)

  return {
    isEnabled, setEnabled, setAll,
    enabledKeys, enabledRoutes,
    anyEnabled: enabledKeys.length > 0,
    allEnabled: enabledKeys.length === ALL_KEYS.length,
  }
}
