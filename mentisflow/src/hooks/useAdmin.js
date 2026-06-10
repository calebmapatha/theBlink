import { useCallback } from 'react'
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc,
  query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

// Data layer for the Super Admin portal. Every mutating action is written to
// the append-only adminLogs collection for accountability.
export function useAdmin() {
  const { user } = useAuth()

  const logAction = useCallback(async (action, target, detail = '') => {
    try {
      await addDoc(collection(db, 'adminLogs'), {
        action, target, detail,
        adminEmail: user?.email || '',
        at: serverTimestamp(),
      })
    } catch (e) { console.warn('admin log failed', e) }
  }, [user])

  const fetchAll = async (col) => {
    const snap = await getDocs(collection(db, col))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  const fetchAllProviders    = () => fetchAll('providers')
  const fetchAllPatients     = () => fetchAll('patients')
  const fetchAllAppointments = () => fetchAll('appointments')
  const fetchReports         = () => fetchAll('reports')

  const setProviderFields = async (uid, fields, action, detail) => {
    await updateDoc(doc(db, 'providers', uid), { ...fields, updatedAt: serverTimestamp() })
    await logAction(action, uid, detail)
  }

  const approveProvider = (uid, name) =>
    setProviderFields(uid, { approvalStatus: 'approved' }, 'approve_provider', name)

  const rejectProvider = (uid, name, reason) =>
    setProviderFields(uid, { approvalStatus: 'rejected', rejectionReason: reason || '' }, 'reject_provider', `${name}: ${reason || ''}`)

  const suspendProvider = (uid, name, reason) =>
    setProviderFields(uid, { suspended: true, suspensionReason: reason || '' }, 'suspend_provider', `${name}: ${reason || ''}`)

  const reactivateProvider = (uid, name) =>
    setProviderFields(uid, { suspended: false, suspensionReason: '' }, 'reactivate_provider', name)

  const deleteProvider = async (uid, name) => {
    await deleteDoc(doc(db, 'providers', uid))
    await logAction('delete_provider', uid, name)
  }

  const deletePatient = async (uid) => {
    await deleteDoc(doc(db, 'patients', uid))
    await logAction('delete_patient', uid, '')
  }

  const resolveReport = async (id, resolution) => {
    await updateDoc(doc(db, 'reports', id), { status: 'resolved', resolution, resolvedAt: serverTimestamp() })
    await logAction('resolve_report', id, resolution)
  }

  const createAnnouncement = async ({ title, body, audience }) => {
    const ref = await addDoc(collection(db, 'announcements'), {
      title, body, audience, createdAt: serverTimestamp(),
    })
    await logAction('create_announcement', ref.id, title)
    return ref.id
  }

  const fetchAnnouncements = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(20)))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch { return [] }
  }

  const deleteAnnouncement = async (id) => {
    await deleteDoc(doc(db, 'announcements', id))
    await logAction('delete_announcement', id, '')
  }

  const fetchLogs = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'adminLogs'), orderBy('at', 'desc'), limit(100)))
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch { return [] }
  }

  const getConfig = async () => {
    try {
      const snap = await getDoc(doc(db, 'config', 'platform'))
      return snap.exists() ? snap.data() : {}
    } catch { return {} }
  }

  const saveConfig = async (cfg) => {
    await setDoc(doc(db, 'config', 'platform'), cfg, { merge: true })
    await logAction('update_config', 'platform', JSON.stringify(cfg))
  }

  return {
    fetchAllProviders, fetchAllPatients, fetchAllAppointments,
    approveProvider, rejectProvider, suspendProvider, reactivateProvider, deleteProvider,
    deletePatient,
    fetchReports, resolveReport,
    createAnnouncement, fetchAnnouncements, deleteAnnouncement,
    fetchLogs, getConfig, saveConfig,
  }
}

// Patient-side: file a report against a provider (any signed-in user).
export async function submitReport({ reporterUid, reporterEmail, providerUid, providerName, reason }) {
  await addDoc(collection(db, 'reports'), {
    reporterUid, reporterEmail, providerUid, providerName, reason,
    status: 'open',
    createdAt: serverTimestamp(),
  })
}

// Any signed-in client: latest announcement for a given role.
export async function fetchLatestAnnouncement(role) {
  try {
    const snap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(5)))
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return all.find(a => a.audience === 'all' || a.audience === role) || null
  } catch { return null }
}
