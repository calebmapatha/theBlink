import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

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

  return {
    providers, loading, reload,
    getProvider, saveProvider,
    getDiary, saveDiary,
    bookAppointment, getAppointments, getPatientAppointments, updateAppointment,
    linkDoctor, getLinkedDoctor, unlinkDoctor, searchProviderByHPCSA,
  }
}
