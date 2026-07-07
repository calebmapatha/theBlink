import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword,
         createUserWithEmailAndPassword, sendPasswordResetEmail,
         EmailAuthProvider, reauthenticateWithCredential, updatePassword,
         signOut as firebaseSignOut } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined) // undefined = loading
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null))
    return unsub
  }, [])

  const signInWithGoogle = async () => {
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setAuthError(e.code === 'auth/popup-closed-by-user' ? null : 'Sign-in failed. Try again.')
    }
  }

  const signInWithEmail = async (email, password) => {
    setAuthError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setAuthError(friendlyError(e.code))
    }
  }

  const signUpWithEmail = async (email, password) => {
    setAuthError(null)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setAuthError(friendlyError(e.code))
    }
  }

  // Returns true on success so the caller can show a "check your inbox"
  // confirmation. Firebase deliberately succeeds for unknown emails
  // (enumeration protection), so success does not confirm the account exists.
  const resetPassword = async (email) => {
    setAuthError(null)
    try {
      await sendPasswordResetEmail(auth, email)
      return true
    } catch (e) {
      setAuthError(friendlyError(e.code))
      return false
    }
  }

  // In-app password change for email/password accounts. Requires the current
  // password (recent re-authentication is a Firebase requirement) so a stolen
  // unlocked session cannot silently take over the account.
  const changePassword = async (currentPassword, newPassword) => {
    setAuthError(null)
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updatePassword(auth.currentUser, newPassword)
      return true
    } catch (e) {
      setAuthError(friendlyError(e.code))
      return false
    }
  }

  const clearAuthError = () => setAuthError(null)

  const signOut = async () => {
    // Wipe the unencrypted, user-scoped data cache (habits, tasks, brain dump,
    // treatment plan, etc.) so sensitive health data does not linger on a
    // shared device after logout. Firestore remains the source of truth.
    try {
      Object.keys(window.localStorage)
        .filter(k => k.startsWith('u_') || k === 'mf_role')
        .forEach(k => window.localStorage.removeItem(k))
    } catch { /* ignore */ }
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, authError, clearAuthError, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, changePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

function friendlyError(code) {
  const map = {
    'auth/invalid-email':          'Invalid email address.',
    'auth/user-not-found':         'No account with that email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/email-already-in-use':   'An account already exists with this email.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/too-many-requests':      'Too many attempts. Please wait a moment.',
    'auth/invalid-credential':     'Incorrect email or password.',
  }
  return map[code] || 'Something went wrong. Please try again.'
}
