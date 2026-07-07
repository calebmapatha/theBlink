import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, query, where, orderBy, limit, startAfter, updateDoc, deleteField, serverTimestamp, increment } from 'firebase/firestore'
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
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        // Hide doctors awaiting/denied admin approval or suspended by
        // moderation. Docs without approvalStatus predate the approval
        // system and are grandfathered in.
        .filter(p => !p.suspended && p.approvalStatus !== 'pending' && p.approvalStatus !== 'rejected')
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

  // Personal meeting-room links (Zoom/Meet rooms are often static URLs) must
  // never sit on the world-readable provider doc: any signed-in user could
  // read them and disrupt sessions. They live in providers/{uid}/private/
  // (owner + admin only, enforced in firestore.rules) and are stamped onto
  // the appointment when the provider confirms it.
  const PRIVATE_KEYS = ['meetingLink']

  const getPrivateProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'providers', uid, 'private', 'meeting'))
      return snap.exists() ? snap.data() : {}
    } catch { return {} }
  }

  const saveProvider = async (uid, data) => {
    const pub = { ...data }
    const priv = {}
    for (const k of PRIVATE_KEYS) {
      if (k in pub) {
        priv[k] = pub[k] ?? ''
        // Also migrates legacy docs: any copy still on the public profile is
        // removed the next time the provider saves.
        pub[k] = deleteField()
      }
    }
    await setDoc(doc(db, 'providers', uid), { ...pub, updatedAt: serverTimestamp() }, { merge: true })
    if (Object.keys(priv).length > 0) {
      await setDoc(doc(db, 'providers', uid, 'private', 'meeting'), priv, { merge: true })
    }
    await reload()
  }

  const getDiary = async (providerUid) => {
    const snap = await getDoc(doc(db, 'providers', providerUid))
    return snap.exists() ? (snap.data().diary || {}) : {}
  }

  // Diary + confirmed-booking map in one read, for the booking flow.
  const getBookingInfo = async (providerUid) => {
    const snap = await getDoc(doc(db, 'providers', providerUid))
    if (!snap.exists()) return { diary: {}, bookedSlots: {} }
    const d = snap.data()
    return { diary: d.diary || {}, bookedSlots: d.bookedSlots || {} }
  }

  const saveDiary = async (providerUid, diary) => {
    await updateDoc(doc(db, 'providers', providerUid), { diary, updatedAt: serverTimestamp() })
  }

  // Confirm an appointment and mark its slot as booked on the provider's own
  // doc so the slot disappears from every patient's booking view. Must be
  // called by the provider (only the owner may write their provider doc).
  // If the provider has pre-screening documents, the appointment is flagged
  // screeningRequired so the patient is prompted to sign them.
  const confirmAppointment = async (appt) => {
    let screeningRequired = false
    try {
      const docsSnap = await getDocs(collection(db, 'providers', appt.providerUid, 'screeningDocs'))
      screeningRequired = !docsSnap.empty
    } catch {}
    // Stamp the meeting link onto the appointment: the patient cannot read the
    // provider's private profile, so the confirmed appointment is the only
    // place they receive it (falls back to the legacy public-doc location).
    let meetingLink = ''
    try {
      const priv = await getPrivateProfile(appt.providerUid)
      meetingLink = priv.meetingLink || ''
      if (!meetingLink) {
        const snap = await getDoc(doc(db, 'providers', appt.providerUid))
        meetingLink = snap.exists() ? (snap.data().meetingLink || '') : ''
      }
    } catch {}
    await updateDoc(doc(db, 'appointments', appt.id), {
      status: 'confirmed', screeningRequired,
      ...(meetingLink ? { meetingLink } : {}),
    })
    try {
      const snap = await getDoc(doc(db, 'providers', appt.providerUid))
      const current = snap.exists() ? (snap.data().bookedSlots || {}) : {}
      const { addBookedSlot } = await import('../utils/availability')
      await updateDoc(doc(db, 'providers', appt.providerUid), {
        bookedSlots: addBookedSlot(current, appt.date, appt.timeSlot),
      })
    } catch (e) {
      // The appointment is confirmed even if the slot-map write fails;
      // the worst case is a double-request the provider can decline.
      console.warn('bookedSlots update failed', e)
    }
    return { screeningRequired }
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
      // The subscriptionActive filter is required for the query to be provable
      // against firestore.rules (non-admins may only read active profiles);
      // without it Firestore rejects the whole query.
      const snap = await getDocs(query(
        collection(db, 'providers'),
        where('hpcsa', '==', hpcsa),
        where('subscriptionActive', '==', true),
      ))
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

  // ── Prescriptions ("future scripts") ──────────────────────────────────────
  // A practitioner writes these FOR a linked patient; the patient reads them
  // (see firestore.rules). Patients keep their *current* medications
  // separately in their own treatment plan.
  const byNewest = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)

  const createPrescription = ({ patientUid, patientName, providerUid, providerName, items, notes }) =>
    addDoc(collection(db, 'prescriptions'), {
      patientUid, patientName: patientName || '',
      providerUid, providerName: providerName || '',
      items, notes: notes || '',
      createdAt: serverTimestamp(),
    })

  // A patient's received prescriptions (single equality filter — rule-safe).
  const getMyPrescriptions = async (patientUid) => {
    try {
      const snap = await getDocs(query(collection(db, 'prescriptions'), where('patientUid', '==', patientUid)))
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest)
    } catch { return [] }
  }

  // Everything the doctor has authored (filter by patient client-side to avoid
  // a two-equality query / composite index).
  const getAuthoredPrescriptions = async (providerUid) => {
    try {
      const snap = await getDocs(query(collection(db, 'prescriptions'), where('providerUid', '==', providerUid)))
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest)
    } catch { return [] }
  }

  const deletePrescription = (id) => deleteDoc(doc(db, 'prescriptions', id))

  return {
    providers, loading, reload, loadMore, hasMore,
    getProvider, saveProvider, getPrivateProfile,
    getDiary, saveDiary, getBookingInfo, confirmAppointment,
    bookAppointment, getAppointments, getPatientAppointments, updateAppointment,
    linkDoctor, getLinkedDoctor, unlinkDoctor, searchProviderByHPCSA,
    incrementProfileViews,
    uploadPhoto, getPatientProfile,
    submitRating, getRating, getProviderRatings,
    createPrescription, getMyPrescriptions, getAuthoredPrescriptions, deletePrescription,
  }
}
