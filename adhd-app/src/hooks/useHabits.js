import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { todayKey } from '../utils/dateUtils'
import { format, subDays } from 'date-fns'

const DEFAULT_HABITS = [
  { id: '1', name: 'Drink water',      emoji: '💧' },
  { id: '2', name: 'Move body',        emoji: '🚶' },
  { id: '3', name: 'Take meds',        emoji: '💊' },
  { id: '4', name: 'Eat breakfast',    emoji: '🍳' },
  { id: '5', name: 'Sleep by 11pm',    emoji: '🛏️' },
  { id: '6', name: 'Breathe / meditate', emoji: '🧘' },
]

const INITIAL = { definitions: DEFAULT_HABITS, completions: {} }

export function useHabits() {
  const [state, setState] = useLocalStorage('adhd_habits', INITIAL)

  const toggleHabit = useCallback((id) => {
    const key = todayKey()
    setState(prev => {
      const current = prev.completions[key] || []
      const updated = current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id]
      return { ...prev, completions: { ...prev.completions, [key]: updated } }
    })
  }, [setState])

  const addHabit = useCallback((name, emoji) => {
    setState(prev => {
      if (prev.definitions.length >= 7) return prev
      const newHabit = { id: Date.now().toString(), name, emoji }
      return { ...prev, definitions: [...prev.definitions, newHabit] }
    })
  }, [setState])

  const removeHabit = useCallback((id) => {
    setState(prev => ({ ...prev, definitions: prev.definitions.filter(h => h.id !== id) }))
  }, [setState])

  const isCheckedToday = (id) => {
    const todayCompletions = state.completions[todayKey()] || []
    return todayCompletions.includes(id)
  }

  const getStreak = (id) => {
    let streak = 0
    for (let i = 1; i <= 365; i++) {
      const dateKey = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const dayCompletions = state.completions[dateKey] || []
      if (dayCompletions.includes(id)) streak++
      else break
    }
    return streak
  }

  const todayCount = (state.completions[todayKey()] || []).length
  const totalHabits = state.definitions.length

  return {
    habits: state.definitions,
    completions: state.completions,
    toggleHabit,
    addHabit,
    removeHabit,
    isCheckedToday,
    getStreak,
    todayCount,
    totalHabits,
  }
}
