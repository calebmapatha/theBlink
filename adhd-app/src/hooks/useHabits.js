import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'
import { todayKey } from '../utils/dateUtils'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

const DEFAULT_HABITS = [
  { id: '1', name: 'Drink water',        emoji: '💧', frequency: 'daily',  weeklyTarget: 1 },
  { id: '2', name: 'Move body',          emoji: '🚶', frequency: 'daily',  weeklyTarget: 1 },
  { id: '3', name: 'Take meds',          emoji: '💊', frequency: 'daily',  weeklyTarget: 1 },
  { id: '4', name: 'Eat breakfast',      emoji: '🍳', frequency: 'daily',  weeklyTarget: 1 },
  { id: '5', name: 'Sleep by 11pm',      emoji: '🛏️', frequency: 'daily',  weeklyTarget: 1 },
  { id: '6', name: 'Breathe / meditate', emoji: '🧘', frequency: 'daily',  weeklyTarget: 1 },
]

const INITIAL = { definitions: DEFAULT_HABITS, completions: {} }

export function useHabits(userId) {
  const [state, setState] = useUserLocalStorage(userId, 'adhd_habits', INITIAL)

  const toggleHabit = useCallback((id) => {
    const key = todayKey()
    setState(prev => {
      const current = prev.completions[key] || []
      const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
      return { ...prev, completions: { ...prev.completions, [key]: updated } }
    })
  }, [setState])

  const addHabit = useCallback((name, emoji, frequency = 'daily', weeklyTarget = 1) => {
    setState(prev => {
      if (prev.definitions.length >= 10) return prev
      return {
        ...prev,
        definitions: [...prev.definitions, {
          id: Date.now().toString(), name, emoji, frequency, weeklyTarget
        }]
      }
    })
  }, [setState])

  const editHabit = useCallback((id, updates) => {
    setState(prev => ({
      ...prev,
      definitions: prev.definitions.map(h => h.id === id ? { ...h, ...updates } : h)
    }))
  }, [setState])

  const removeHabit = useCallback((id) => {
    setState(prev => ({ ...prev, definitions: prev.definitions.filter(h => h.id !== id) }))
  }, [setState])

  const isCheckedToday = (id) => (state.completions[todayKey()] || []).includes(id)

  const isCheckedOn = (id, dateKey) => (state.completions[dateKey] || []).includes(id)

  const getStreak = (id) => {
    let streak = 0
    for (let i = 1; i <= 365; i++) {
      const dateKey = format(subDays(new Date(), i), 'yyyy-MM-dd')
      if ((state.completions[dateKey] || []).includes(id)) streak++
      else break
    }
    return streak
  }

  const getWeeklyCount = (id) => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    return days.filter(d => (state.completions[format(d, 'yyyy-MM-dd')] || []).includes(id)).length
  }

  const getMonthlyData = (year, month) => {
    // Returns array of { date, completedIds, totalApplicable, ratio }
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1)
      const key = format(date, 'yyyy-MM-dd')
      const completed = state.completions[key] || []
      return { date, key, completed, total: state.definitions.length }
    })
  }

  return {
    habits: state.definitions.map(h => ({
      ...h,
      frequency: h.frequency || 'daily',
      weeklyTarget: h.weeklyTarget || 1,
    })),
    completions: state.completions,
    toggleHabit, addHabit, editHabit, removeHabit,
    isCheckedToday, isCheckedOn, getStreak, getWeeklyCount, getMonthlyData,
    todayCount: (state.completions[todayKey()] || []).length,
    totalHabits: state.definitions.length,
  }
}
