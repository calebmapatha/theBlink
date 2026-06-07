import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, updateDoc, serverTimestamp } from 'firebase/firestore'
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

  const bookAppointment = (data) =>
    addDoc(collection(db, 'appointments'), { ...data, status: 'pending', createdAt: serverTimestamp() })

  const getAppointments = async (providerUid) => {
    const snap = await getDocs(query(collection(db, 'appointments'), where('providerUid', '==', providerUid)))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const updateAppointment = (id, data) => updateDoc(doc(db, 'appointments', id), data)

  return { providers, loading, reload, getProvider, saveProvider, bookAppointment, getAppointments, updateAppointment }
}
