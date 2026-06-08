import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, updateDoc, deleteField, serverTimestamp, increment, runTransaction } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'

export function useProviders() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'providers'), where('subscriptionActive', '==', true)))
      setProviders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [])

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
      const ext = file.name.split('.').pop()
      const storageRef = ref(storage, `profile-photos/${type}/${uid}.${ext}`)
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
  // Atomically updates the provider's aggregate rating fields.
  const submitRating = async ({ appointmentId, providerId, patientUid, communication, empathy, professionalism, treatmentPlan, overall, comment }) => {
    await setDoc(doc(db, 'ratings', appointmentId), {
      appointmentId, providerId, patientUid,
      communication, empathy, professionalism, treatmentPlan, overall,
      comment: comment || '',
      createdAt: serverTimestamp(),
    })

    await runTransaction(db, async (tx) => {
      const provRef = doc(db, 'providers', providerId)
      const snap = await tx.get(provRef)
      if (!snap.exists()) return
      const data = snap.data()
      const count = (data.ratingCount || 0) + 1
      const prev = data.ratingAvg || {}
      const n = count - 1
      const newAvg = {
        communication:  +((((prev.communication  || 0) * n) + communication)  / count).toFixed(2),
        empathy:        +((((prev.empathy        || 0) * n) + empathy)        / count).toFixed(2),
        professionalism:+((((prev.professionalism|| 0) * n) + professionalism)/ count).toFixed(2),
        treatmentPlan:  +((((prev.treatmentPlan  || 0) * n) + treatmentPlan)  / count).toFixed(2),
        overall:        +((((prev.overall        || 0) * n) + overall)        / count).toFixed(2),
      }
      tx.update(provRef, { ratingCount: count, ratingAvg: newAvg })
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
    providers, loading, reload,
    getProvider, saveProvider,
    getDiary, saveDiary,
    bookAppointment, getAppointments, getPatientAppointments, updateAppointment,
    linkDoctor, getLinkedDoctor, unlinkDoctor, searchProviderByHPCSA,
    incrementProfileViews,
    uploadPhoto, getPatientProfile,
    submitRating, getRating, getProviderRatings,
  }
}
