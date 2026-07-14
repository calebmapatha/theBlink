import { collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage'
import { db, storage } from '../lib/firebase'

// Firestore/Storage plumbing for the encrypted client-file vault. Everything
// stored here is ciphertext produced by utils/vault.js — this hook never
// sees plaintext or the vault key. Data lives under the provider's own
// document (providers/{uid}/vault) and vault/{uid}/ in Storage, both locked
// to the owner in the security rules.

const vaultCol  = (uid) => collection(db, 'providers', uid, 'vault')
const vaultDoc  = (uid, id) => doc(db, 'providers', uid, 'vault', id)
const META_ID   = '_meta'

export function useVault() {
  // --- vault lifecycle ---
  const getVaultMeta = async (uid) => {
    const snap = await getDoc(vaultDoc(uid, META_ID))
    return snap.exists() ? snap.data() : null
  }

  // One-time setup: store the PBKDF2 salt and the encrypted check value.
  const createVaultMeta = async (uid, { salt, check }) => {
    await setDoc(vaultDoc(uid, META_ID), { salt, check, createdAt: serverTimestamp() })
  }

  // --- encrypted documents (clients, notes, file metadata) ---
  const listVaultDocs = async (uid) => {
    const snap = await getDocs(vaultCol(uid))
    return snap.docs
      .filter(d => d.id !== META_ID)
      .map(d => ({ id: d.id, ...d.data() }))
  }

  const addVaultDoc = async (uid, { kind, clientId = null, data, storagePath = null }) => {
    const res = await addDoc(vaultCol(uid), {
      kind, clientId, data, storagePath,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    return res.id
  }

  const updateVaultDoc = async (uid, id, data) => {
    await updateDoc(vaultDoc(uid, id), { data, updatedAt: serverTimestamp() })
  }

  const deleteVaultDoc = async (uid, id) => {
    await deleteDoc(vaultDoc(uid, id))
  }

  // --- encrypted file blobs ---
  const uploadVaultFile = async (uid, fileId, encryptedBytes) => {
    const path = `vault/${uid}/${fileId}`
    await uploadBytes(ref(storage, path), encryptedBytes, { contentType: 'application/octet-stream' })
    return path
  }

  const downloadVaultFile = async (path) => {
    // 15 MB ceiling comfortably above the 10 MB rules cap plus IV overhead.
    return getBytes(ref(storage, path), 15 * 1024 * 1024)
  }

  const deleteVaultFile = async (path) => {
    try { await deleteObject(ref(storage, path)) } catch { /* already gone */ }
  }

  return {
    getVaultMeta, createVaultMeta,
    listVaultDocs, addVaultDoc, updateVaultDoc, deleteVaultDoc,
    uploadVaultFile, downloadVaultFile, deleteVaultFile,
  }
}
