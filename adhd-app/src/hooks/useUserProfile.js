import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'

const DEFAULT_PROFILE = { displayName: '', avatarEmoji: '🧠' }

export function useUserProfile(userId) {
  const [profile, setProfile] = useUserLocalStorage(userId, 'adhd_profile', DEFAULT_PROFILE)

  const updateProfile = useCallback((updates) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }, [setProfile])

  return { profile, updateProfile }
}
