import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

export function useBrainDump() {
  const [entries, setEntries] = useLocalStorage('adhd_braindump', [])

  const addEntry = useCallback((text) => {
    if (!text.trim()) return
    const entry = {
      id: Date.now().toString(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    setEntries(prev => [entry, ...prev])
  }, [setEntries])

  const deleteEntry = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [setEntries])

  return { entries, addEntry, deleteEntry }
}
