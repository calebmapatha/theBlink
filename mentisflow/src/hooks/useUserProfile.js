import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'

// avatarEmoji is gone: avatars are now a photo or the silhouette (see
// components/ui/Avatar.jsx); any stored emoji is simply no longer read.
const DEFAULT_PROFILE = { displayName: '' }

export function useUserProfile(userId) {
  const [profile, setProfile, hydrated] = useUserLocalStorage(userId, 'adhd_profile', DEFAULT_PROFILE)

  const updateProfile = useCallback((updates) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }, [setProfile])

  return { profile, updateProfile, hydrated }
}
