import { useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (e) {
      console.warn('useLocalStorage set error', e)
    }
  }

  return [storedValue, setValue]
}

// Prefix key with userId so each user has isolated data
export function useUserLocalStorage(userId, key, initialValue) {
  return useLocalStorage(userId ? `u_${userId}_${key}` : key, initialValue)
}
