import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { onProfilePhotoChange } from '../services/profilePhoto'

// Live read side of src/services/profilePhoto.js: fetches the current
// photoURL for the signed-in user and follows set/remove broadcasts, so the
// sidebar, Settings header and profile modals always agree.
export function useProfilePhoto(uid, role = 'patient') {
  const [photoURL, setPhotoURL] = useState(null)

  useEffect(() => {
    if (!uid) return
    let active = true
    getDoc(doc(db, role === 'provider' ? 'providers' : 'patients', uid))
      .then((snap) => {
        if (active && snap.exists()) setPhotoURL(snap.data().photoURL || null)
      })
      .catch(() => {})
    const unsubscribe = onProfilePhotoChange(({ uid: changedUid, url }) => {
      if (changedUid === uid) setPhotoURL(url)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [uid, role])

  return photoURL
}
