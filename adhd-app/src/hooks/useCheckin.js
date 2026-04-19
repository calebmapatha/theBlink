import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'
import { todayKey } from '../utils/dateUtils'

export function useCheckin(userId) {
  const [checkins, setCheckins] = useUserLocalStorage(userId, 'adhd_checkins', {})

  const saveCheckin = useCallback(({ mood, energy, intention }) => {
    setCheckins(prev => ({
      ...prev,
      [todayKey()]: { mood, energy, intention, createdAt: new Date().toISOString() },
    }))
  }, [setCheckins])

  return { todayCheckin: checkins[todayKey()] || null, saveCheckin, checkins }
}
