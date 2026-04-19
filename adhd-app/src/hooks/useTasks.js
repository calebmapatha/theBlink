import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'
import { todayKey } from '../utils/dateUtils'

export function useTasks(userId) {
  const [tasks, setTasks] = useUserLocalStorage(userId, 'adhd_tasks', [])

  const addTask = useCallback((text, urgent = false) => {
    const task = { id: Date.now().toString(), text: text.trim(), urgent, createdAt: new Date().toISOString(), scheduledDate: todayKey(), completedAt: null }
    setTasks(prev => [task, ...prev])
  }, [setTasks])

  const completeTask = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completedAt: new Date().toISOString() } : t))
  }, [setTasks])

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
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

  const today = todayKey()
  return {
    tasks,
    todayTasks:     tasks.filter(t => t.scheduledDate === today && !t.completedAt),
    completedToday: tasks.filter(t => t.scheduledDate === today && t.completedAt),
    backlogTasks:   tasks.filter(t => t.scheduledDate !== today && !t.completedAt),
    addTask, completeTask, deleteTask, moveToToday, moveToBacklog, toggleUrgent,
  }
}
