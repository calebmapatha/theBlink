import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'
import { todayKey } from '../utils/dateUtils'

export function useTasks(userId) {
  const [tasks, setTasks] = useUserLocalStorage(userId, 'adhd_tasks', [])

  const addTask = useCallback((text, urgent = false, dueDate = null) => {
    const task = { id: Date.now().toString(), text: text.trim(), urgent, dueDate, createdAt: new Date().toISOString(), scheduledDate: todayKey(), completedAt: null }
    setTasks(prev => [task, ...prev])
  }, [setTasks])

  const completeTask = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completedAt: new Date().toISOString() } : t))
  }, [setTasks])

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [setTasks])

  // Re-insert a deleted task at its original position (for undo). Deduped.
  const restoreTask = useCallback((task, index = 0) => {
    setTasks(prev => {
      if (prev.some(t => t.id === task.id)) return prev
      const next = [...prev]
      next.splice(Math.min(Math.max(index, 0), next.length), 0, task)
      return next
    })
  }, [setTasks])

  const moveToToday = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, scheduledDate: todayKey() } : t))
  }, [setTasks])

  const moveToBacklog = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, scheduledDate: null } : t))
  }, [setTasks])

  const toggleUrgent = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, urgent: !t.urgent } : t))
  }, [setTasks])

  const reorderTask = useCallback((fromId, toId) => {
    setTasks(prev => {
      const fi = prev.findIndex(t => t.id === fromId)
      const ti = prev.findIndex(t => t.id === toId)
      if (fi === -1 || ti === -1 || fi === ti) return prev
      const next = [...prev]
      const [moved] = next.splice(fi, 1)
      next.splice(ti, 0, moved)
      return next
    })
  }, [setTasks])

  const today = todayKey()
  return {
    tasks,
    todayTasks:     tasks.filter(t => t.scheduledDate === today && !t.completedAt),
    completedToday: tasks.filter(t => t.scheduledDate === today && t.completedAt),
    backlogTasks:   tasks.filter(t => t.scheduledDate !== today && !t.completedAt),
    addTask, completeTask, deleteTask, restoreTask, moveToToday, moveToBacklog, toggleUrgent, reorderTask,
  }
}
