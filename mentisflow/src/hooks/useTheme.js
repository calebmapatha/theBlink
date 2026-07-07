import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export function useTheme() {
  // Light by default for everyone; only users who explicitly switch get dark.
  const [theme, setTheme] = useLocalStorage('adhd_theme', 'light')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  return { isDark: theme === 'dark', toggleTheme }
}
