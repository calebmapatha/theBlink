import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

/**
 * ThemeProvider
 *
 * Applies the real dark mode by toggling the "dark" class on <html>,
 * which flips every variable in theme.css at once. Three modes:
 *
 *   light  — always light
 *   dark   — always dark
 *   system — follows the operating system and updates live
 *
 * The choice is remembered. Wrap the app once:
 *
 *   <ThemeProvider><App /></ThemeProvider>
 *
 * Settings and the sidebar footer render <ThemeToggle />; anything else
 * can call setMode from useTheme().
 */

const ThemeContext = createContext(null)
const STORAGE_KEY = 'mentisflow:theme'
// Pre-ThemeProvider key (JSON-encoded 'light' | 'dark'), migrated on first read
// so users who explicitly chose a theme keep it.
const LEGACY_KEY = 'adhd_theme'

function systemPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function readStoredMode() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY))
    if (legacy === 'light' || legacy === 'dark') return legacy
  } catch {
    /* ignore */
  }
  return 'system'
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  /* Follow the OS live while in system mode */
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  /* Apply the class and keep the browser chrome in sync */
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = resolved === 'dark' ? '#15141A' : '#F3F3F7'
  }, [resolved])

  const setMode = useCallback((next) => {
    setModeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ mode, resolved, setMode }),
    [mode, resolved, setMode]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

/* ------------------------------------------------------------------ */

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

/** Segmented Light / Dark / System control for Settings and the sidebar. */
export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex  border border-line bg-surface p-1"
    >
      {OPTIONS.map((option) => {
        const selected = mode === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setMode(option.value)}
            className={` px-3.5 py-1.5 text-sm transition-colors motion-reduce:transition-none ${
              selected
                ? 'bg-accent font-medium text-on-accent'
                : 'text-muted hover:bg-raised'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
