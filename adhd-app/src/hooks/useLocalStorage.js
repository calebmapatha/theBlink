import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Plain localStorage hook — used only for non-user-scoped data (theme, notifications)
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

// User-scoped hook — syncs to Firestore so data is available on every device.
// On mount it hydrates from Firestore (falling back to localStorage as cache).
// On write it persists to both, so the app works offline too.
export function useUserLocalStorage(userId, key, initialValue) {
  const storageKey = userId ? `u_${userId}_${key}` : key

  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(storageKey)
      return item ? JSON.parse(item) : initialValue
    } catch { return initialValue }
  })

  const hasSynced = useRef(false)

  useEffect(() => {
    if (!userId || hasSynced.current) return
    hasSynced.current = true

    const ref = doc(db, 'users', userId, 'data', key)
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        const v = snap.data().value
        setState(v)
        try { window.localStorage.setItem(storageKey, JSON.stringify(v)) } catch {}
      } else {
        // First login on this account — push any existing local data up to Firestore
        try {
          const raw = window.localStorage.getItem(storageKey)
          if (raw) {
            const parsed = JSON.parse(raw)
            setDoc(ref, { value: parsed }, { merge: false }).catch(() => {})
          }
        } catch {}
      }
    }).catch(() => {})
  }, [userId, key, storageKey])

  const setValue = useCallback((value) => {
    setState(prev => {
      const v = typeof value === 'function' ? value(prev) : value
      try { window.localStorage.setItem(storageKey, JSON.stringify(v)) } catch {}
      if (userId) {
        setDoc(doc(db, 'users', userId, 'data', key), { value: v }, { merge: false }).catch(() => {})
      }
      return v
    })
  }, [userId, key, storageKey])

  return [state, setValue]
}
