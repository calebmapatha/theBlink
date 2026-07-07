import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'

export function useBrainDump(userId) {
  const [entries, setEntries] = useUserLocalStorage(userId, 'adhd_braindump', [])

  const addEntry = useCallback((text) => {
    if (!text.trim()) return
    setEntries(prev => [{ id: Date.now().toString(), text: text.trim(), createdAt: new Date().toISOString() }, ...prev])
  }, [setEntries])

  const deleteEntry = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [setEntries])

  // Re-insert a previously deleted entry (for undo). Deduped so a double-undo
  // can't create two copies.
  const restoreEntry = useCallback((entry) => {
    setEntries(prev => prev.some(e => e.id === entry.id) ? prev : [entry, ...prev])
  }, [setEntries])

  return { entries, addEntry, deleteEntry, restoreEntry }
}
