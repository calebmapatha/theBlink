import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, orderBy, limit, startAfter, updateDoc, deleteField, serverTimestamp, increment } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'

const PAGE_SIZE = 10

export function useProviders() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  // Cursor-based pagination: load PAGE_SIZE active providers at a time.
  // Pass the previous page's last document to fetch the next page.
  const loadProviders = useCallback(async (afterDoc = null) => {
    setLoading(true)
    try {
      let q = query(
        collection(db, 'providers'),
        where('subscriptionActive', '==', true),
        orderBy('__name__'),
        limit(PAGE_SIZE),
      )
      if (afterDoc) q = query(q, startAfter(afterDoc))
      const snap = await getDocs(q)
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProviders(prev => afterDoc ? [...prev, ...docs] : docs)
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
      setHasMore(snap.docs.length === PAGE_SIZE)
    } catch {
      if (!afterDoc) setProviders([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const reload   = useCallback(() => loadProviders(null), [loadProviders])
  const loadMore = useCallback(() => {
    if (lastDoc && hasMore && !loading) loadProviders(lastDoc)
  }, [lastDoc, hasMore, loading, loadProviders])

  useEffect(() => { reload() }, [reload])

  const getProvider = async (uid) => {
    const snap = await getDoc(doc(db, 'providers', uid))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }

  const saveProvider = async (uid, data) => {
    await setDoc(doc(db, 'providers', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true })
    await reload()
  }

  const getDiary = async (providerUid) => {
    const snap = await getDoc(doc(db, 'providers', providerUid))
    return snap.exists() ? (snap.data().diary || {}) : {}
  }

  const saveDiary = async (providerUid, diary) => {
    await updateDoc(doc(db, 'providers', providerUid), { diary, updatedAt: serverTimestamp() })
  }

  const bookAppointment = (data) =>
    addDoc(collection(db, 'appointments'), { ...data, status: 'pending', createdAt: serverTimestamp() })

  const getAppointments = async (providerUid) => {
    const snap = await getDocs(query(collection(db, 'appointments'), where('providerUid', '==', providerUid)))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const getPatientAppointments = async (patientUid) => {
    const snap = await getDocs(query(collection(db, 'appointments'), where('patientUid', '==', patientUid)))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const updateAppointment = (id, data) => updateDoc(doc(db, 'appointments', id), data)

  const linkDoctor = async (patientUid, providerUid) => {
    await setDoc(doc(db, 'patients', patientUid), { linkedDoctorUid: providerUid, linkedAt: serverTimestamp() }, { merge: true })
  }

  const getLinkedDoctor = async (patientUid) => {
    try {
      const snap = await getDoc(doc(db, 'patients', patientUid))
      if (!snap.exists() || !snap.data().linkedDoctorUid) return null
      return getProvider(snap.data().linkedDoctorUid)
    } catch {
      return null
    }
  }

  const unlinkDoctor = async (patientUid) => {
    try {
      await updateDoc(doc(db, 'patients', patientUid), { linkedDoctorUid: deleteField() })
    } catch {}
  }

  const searchProviderByHPCSA = async (hpcsa) => {
    try {
      const snap = await getDocs(query(collection(db, 'providers'), where('hpcsa', '==', hpcsa)))
      if (snap.empty) return null
      const d = snap.docs[0]
      return { id: d.id, ...d.data() }
    } catch {
      return null
    }
  }

  const incrementProfileViews = async (providerUid) => {
    try {
      await updateDoc(doc(db, 'providers', providerUid), { profileViews: increment(1) })
    } catch {}
  }

  // Upload a profile photo for a provider or patient.
  // Returns the download URL on success, null on failure.
  const uploadPhoto = async (uid, file, type = 'provider') => {
    try {
      // Derive a safe extension from the MIME type — never trust the filename
      // (which could contain path separators or a misleading extension).
      const EXT_BY_TYPE = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
      const ext = EXT_BY_TYPE[file.type]
      if (!ext) return null
      if (file.size > 5 * 1024 * 1024) return null
      const safeType = type === 'provider' ? 'provider' : 'patient'
      const storageRef = ref(storage, `profile-photos/${safeType}/${uid}.${ext}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      const col = type === 'provider' ? 'providers' : 'patients'
      await setDoc(doc(db, col, uid), { photoURL: url }, { merge: true })
      return url
    } catch {
      return null
    }
  }

  // Fetch a patient's Firestore profile (photoURL, etc.)
  const getPatientProfile = async (patientUid) => {
    try {
      const snap = await getDoc(doc(db, 'patients', patientUid))
      return snap.exists() ? snap.data() : null
    } catch { return null }
  }

  // Submit a patient rating for a completed appointment.
  // The provider's aggregate rating fields (ratingCount / ratingAvg) are
  // recomputed server-side by the `aggregateRating` Cloud Function, which is
  // the only writer trusted to touch them. Throws on failure so the caller
  // can surface an error to the patient.
  const submitRating = async ({ appointmentId, providerId, patientUid, communication, empathy, professionalism, treatmentPlan, overall, comment }) => {
    await setDoc(doc(db, 'ratings', appointmentId), {
      appointmentId, providerId, patientUid,
      communication, empathy, professionalism, treatmentPlan, overall,
      comment: comment || '',
      createdAt: serverTimestamp(),
    })
  }

  // Check if an appointment has already been rated.
  const getRating = async (appointmentId) => {
    try {
      const snap = await getDoc(doc(db, 'ratings', appointmentId))
      return snap.exists() ? snap.data() : null
    } catch { return null }
  }

  // Fetch all ratings for a provider (for the provider dashboard).
  const getProviderRatings = async (providerUid) => {
    try {
      const snap = await getDocs(query(collection(db, 'ratings'), where('providerId', '==', providerUid)))
      return snap.docs.map(d => d.data())
    } catch { return [] }
  }

  return {
    providers, loading, reload, loadMore, hasMore,
    getProvider, saveProvider,
    getDiary, saveDiary,
    bookAppointment, getAppointments, getPatientAppointments, updateAppointment,
    linkDoctor, getLinkedDoctor, unlinkDoctor, searchProviderByHPCSA,
    incrementProfileViews,
    uploadPhoto, getPatientProfile,
    submitRating, getRating, getProviderRatings,
  }
}
