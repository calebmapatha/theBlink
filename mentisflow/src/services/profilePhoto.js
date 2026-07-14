import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, storage } from '../lib/firebase'

/**
 * profilePhoto.js
 *
 * The single write path for profile photos. The Settings header
 * ("Change photo" / "Remove photo"), the Edit Profile modal and the
 * practitioner profile all call these two functions. Because every
 * surface renders <Avatar> from the same photoURL field, a change or
 * removal shows up in the sidebar, Settings, cards and admin tables
 * at the same moment (onProfilePhotoChange broadcasts it).
 *
 * Storage layout (matches storage.rules): profile-photos/{role}/{uid}.{ext}
 * Profile field: photoURL on providers/{uid} or patients/{uid}.
 */

const MAX_BYTES = 5 * 1024 * 1024
// Extension comes from the MIME type — never trust the filename.
const EXT_BY_TYPE = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
const ALL_EXTS = ['png', 'jpg', 'webp', 'gif']

const roleFolder = (role) => (role === 'provider' ? 'provider' : 'patient')
const profileDoc = (uid, role) => doc(db, role === 'provider' ? 'providers' : 'patients', uid)
const photoRef = (uid, role, ext) => ref(storage, `profile-photos/${roleFolder(role)}/${uid}.${ext}`)

/* Broadcast so every mounted <Avatar> surface refreshes together. */
const EVENT = 'mf-profile-photo'
function announce(uid, url) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { uid, url } }))
}
export function onProfilePhotoChange(handler) {
  const listener = (e) => handler(e.detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}

/* Best-effort delete; "already gone" is fine, anything else should surface. */
async function deletePhotoObject(uid, role, ext) {
  try {
    await deleteObject(photoRef(uid, role, ext))
  } catch (error) {
    if (error?.code !== 'storage/object-not-found') throw error
  }
}

/** Upload a new photo and point the profile at it. Returns the URL. */
export async function setProfilePhoto(uid, file, role = 'patient') {
  const ext = EXT_BY_TYPE[file.type]
  if (!ext) {
    throw new Error('Choose an image file (PNG, JPG, WebP or GIF).')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Photo must be smaller than 5 MB.')
  }

  const storageRef = photoRef(uid, role, ext)
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=3600',
  })
  const url = await getDownloadURL(storageRef)

  await setDoc(
    profileDoc(uid, role),
    { photoURL: url, photoUpdatedAt: serverTimestamp() },
    { merge: true }
  )

  // A new upload replaces the old photo even when the format changed.
  await Promise.all(
    ALL_EXTS.filter((e) => e !== ext).map((e) => deletePhotoObject(uid, role, e).catch(() => {}))
  )

  announce(uid, url)
  return url
}

/** Remove the photo: delete the file(s) and clear the profile field. */
export async function removeProfilePhoto(uid, role = 'patient') {
  for (const ext of ALL_EXTS) {
    await deletePhotoObject(uid, role, ext)
  }

  await setDoc(
    profileDoc(uid, role),
    { photoURL: null, photoUpdatedAt: serverTimestamp() },
    { merge: true }
  )

  announce(uid, null)
}
