import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { todayKey } from '../utils/dateUtils'

export function useCheckin() {
  const [checkins, setCheckins] = useLocalStorage('adhd_checkins', {})

  const todayCheckin = checkins[todayKey()] || null

  const saveCheckin = useCallback(({ mood, energy, intention }) => {
    setCheckins(prev => ({
      ...prev,
      [todayKey()]: { mood, energy, intention, createdAt: new Date().toISOString() },
    }))
  }, [setCheckins])

  return { todayCheckin, saveCheckin, checkins }
}
