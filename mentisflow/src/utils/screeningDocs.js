// Pre-screening documents — optional documents (terms & conditions, intake
// consent, practice policies…) a doctor uploads for patients to read and sign
// before a booking request is sent.
//
// The project runs on Firebase's free (Spark) plan, so files can't go to
// Cloud Storage. Instead each document lives as a Firestore doc under
// providers/{uid}/screeningDocs — either plain text typed by the doctor, or a
// small PDF stored as a base64 data URL. Firestore caps documents at 1 MiB,
// so PDFs are limited to 600 KB raw (~800 KB after base64 encoding).
//
// When a patient books, they sign each document by ticking agreement and
// typing their full name. One immutable record per document is written to the
// top-level `consents` collection, keyed to the appointment.

import {
  collection, doc, getDocs, addDoc, deleteDoc, query, where, orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export const MAX_PDF_BYTES = 600 * 1024
export const MAX_DOCS = 5

const docsCol = (providerUid) => collection(db, 'providers', providerUid, 'screeningDocs')

export async function getScreeningDocs(providerUid) {
  try {
    const snap = await getDocs(query(docsCol(providerUid), orderBy('createdAt')))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

// Upload a PDF as a base64 data URL. Resolves to the new doc's id.
// Throws with a user-readable message on validation failure.
export async function addScreeningDocPDF(providerUid, file, title) {
  if (file.type !== 'application/pdf') throw new Error('Only PDF files are supported.')
  if (file.size > MAX_PDF_BYTES) throw new Error(`PDF too large — maximum ${Math.round(MAX_PDF_BYTES / 1024)} KB.`)
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
  const ref = await addDoc(docsCol(providerUid), {
    title: title?.trim() || file.name.replace(/\.pdf$/i, ''),
    kind: 'pdf',
    data: dataUrl,
    size: file.size,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function addScreeningDocText(providerUid, title, text) {
  if (!title?.trim()) throw new Error('Please give the document a title.')
  if (!text?.trim()) throw new Error('The document text is empty.')
  const ref = await addDoc(docsCol(providerUid), {
    title: title.trim(),
    kind: 'text',
    text: text.trim(),
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function deleteScreeningDoc(providerUid, docId) {
  return deleteDoc(doc(db, 'providers', providerUid, 'screeningDocs', docId))
}

// Open a PDF screening doc in a new tab. Data URLs can't be opened directly
// in a new tab in modern browsers, so convert to a Blob URL first.
export function openScreeningPDF(screeningDoc) {
  try {
    const base64 = screeningDoc.data.split(',')[1]
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {
    alert('Could not open this document.')
  }
}

// Record the patient's signature on every screening document for a booking.
// Written after the appointment is created; immutable by security rules.
export async function signScreeningDocs({ appointmentId, providerUid, patientUid, patientName, signatureName, docs }) {
  await Promise.all(docs.map(d =>
    addDoc(collection(db, 'consents'), {
      appointmentId,
      providerUid,
      patientUid,
      patientName: patientName || '',
      docId: d.id,
      docTitle: d.title,
      signatureName: signatureName.trim(),
      signedAt: serverTimestamp(),
    })
  ))
}

// Signatures collected for one appointment (provider or patient view).
export async function getConsentsForAppointment(appointmentId) {
  try {
    const snap = await getDocs(query(collection(db, 'consents'), where('appointmentId', '==', appointmentId)))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}
