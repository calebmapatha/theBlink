// Zero-knowledge client-file vault built on the browser's Web Crypto API.
// The vault password never leaves the device: PBKDF2 (SHA-256, 310k
// iterations — OWASP guidance) stretches it into an AES-256-GCM key, and only
// ciphertext is stored in Firestore/Storage. Nobody without the password —
// including admins and Firebase — can read the contents. The flip side, made
// clear in the UI: a forgotten vault password cannot be recovered.
//
// No crypto is implemented by hand here; this file only composes the
// standard, browser-audited WebCrypto primitives in their documented form.

const PBKDF2_ITERATIONS = 310000
const CHECK_PLAINTEXT   = 'mentisflow-vault-v1'

const subtle = () => globalThis.crypto.subtle

// --- base64 helpers (binary-safe) ---
export function bytesToB64(bytes) {
  let bin = ''
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
  return btoa(bin)
}

export function b64ToBytes(b64) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

export function generateSaltB64() {
  return bytesToB64(globalThis.crypto.getRandomValues(new Uint8Array(16)))
}

// Stretch the vault password into an AES-GCM key. Deliberately slow.
export async function deriveVaultKey(password, saltB64) {
  const material = await subtle().importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
  )
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// --- JSON payloads (notes, client names, file metadata) ---
export async function encryptJSON(key, obj) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ct = await subtle().encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)),
  )
  return { iv: bytesToB64(iv), ct: bytesToB64(ct) }
}

// Returns the object, or null when the key is wrong / data is corrupt
// (AES-GCM authenticates, so tampering also fails here).
export async function decryptJSON(key, payload) {
  try {
    const pt = await subtle().decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.ct),
    )
    return JSON.parse(new TextDecoder().decode(pt))
  } catch {
    return null
  }
}

// --- binary payloads (file attachments) ---
// Encrypted file format: 12-byte IV followed by the ciphertext, in one blob.
export async function encryptBytes(key, buffer) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, buffer))
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv, 0)
  out.set(ct, iv.length)
  return out
}

export async function decryptBytes(key, buffer) {
  try {
    const arr = new Uint8Array(buffer)
    const iv = arr.slice(0, 12)
    const ct = arr.slice(12)
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv }, key, ct))
  } catch {
    return null
  }
}

// --- password verification ---
// A known constant encrypted at vault creation; a successful decrypt on
// unlock proves the derived key (and therefore the password) is right.
export async function makeCheck(key) {
  return encryptJSON(key, { v: CHECK_PLAINTEXT })
}

export async function verifyCheck(key, checkPayload) {
  const res = await decryptJSON(key, checkPayload)
  return res?.v === CHECK_PLAINTEXT
}
