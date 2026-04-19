import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { todayKey } from '../utils/dateUtils'

const INITIAL = []

export function useTasks() {
  const [tasks, setTasks] = useLocalStorage('adhd_tasks', INITIAL)

  const addTask = useCallback((text, urgent = false) => {
    const task = {
      id: Date.now().toString(),
      text: text.trim(),
      urgent,
      createdAt: new Date().toISOString(),
      scheduledDate: todayKey(),
      completedAt: null,
    }
    setTasks(prev => [task, ...prev])
  }, [setTasks])

  const completeTask = useCallback((id) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completedAt: new Date().toISOString() } : t
    ))
  }, [setTasks])

  const uncompleteTask = useCallback((id) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completedAt: null } : t
    ))
  }, [setTasks])

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [setTasks])

  const moveToToday = useCallback((id) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, scheduledDate: todayKey() } : t
    ))
  }, [setTasks])

  const moveToBacklog = useCallback((id) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, scheduledDate: null } : t
    ))
  }, [setTasks])

  const toggleUrgent = useCallback((id) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, urgent: !t.urgent } : t
    ))
  }, [setTasks])

  const today = todayKey()
  const todayTasks    = tasks.filter(t => t.scheduledDate === today && !t.completedAt)
  const completedToday = tasks.filter(t => t.scheduledDate === today && t.completedAt)
  const backlogTasks  = tasks.filter(t => t.scheduledDate !== today && !t.completedAt)

  return {
    tasks,
    todayTasks,
    completedToday,
    backlogTasks,
    addTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    moveToToday,
    moveToBacklog,
    toggleUrgent,
  }
}
