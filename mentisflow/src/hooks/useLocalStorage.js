import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Persist a value to Firestore with retry + backoff. Health data must not be
// silently lost on a transient network failure. On final failure we log and
// emit a window event so the UI can warn the user (see App-level listener).
async function persistWithRetry(ref, value, key, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      await setDoc(ref, { value }, { merge: false })
      return true
    } catch (err) {
      if (i === attempts - 1) {
        console.error(`Sync failed for "${key}" after ${attempts} attempts`, err)
        try {
          window.dispatchEvent(new CustomEvent('mf-sync-error', { detail: { key } }))
        } catch { /* non-browser env */ }
        return false
      }
      await new Promise(r => setTimeout(r, 500 * 2 ** i)) // 500ms, 1s, 2s
    }
  }
  return false
}

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
  // True once the Firestore hydrate has resolved (either way). Lets callers
  // avoid acting on the default value before cloud data has arrived, e.g.
  // showing onboarding to a long-time user on a brand-new device.
  const [hydrated, setHydrated] = useState(false)

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
            persistWithRetry(ref, parsed, key)
          }
        } catch {}
      }
    }).catch(err => console.warn(`Hydrate failed for "${key}"`, err))
      .finally(() => setHydrated(true))
  }, [userId, key, storageKey])

  const setValue = useCallback((value) => {
    setState(prev => {
      const v = typeof value === 'function' ? value(prev) : value
      try { window.localStorage.setItem(storageKey, JSON.stringify(v)) } catch {}
      if (userId) {
        persistWithRetry(doc(db, 'users', userId, 'data', key), v, key)
      }
      return v
    })
  }, [userId, key, storageKey])

  return [state, setValue, hydrated]
}
