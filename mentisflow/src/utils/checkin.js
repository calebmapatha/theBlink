// In-person check-in codes. Each confirmed appointment gets a scannable QR
// and a short human-typable code, both derived deterministically from the
// appointment id — no extra fields to store and existing bookings work
// retroactively. The practice scans the QR (where the browser supports it)
// or types the short code; matching happens against the provider's own
// loaded appointments, so no extra reads or rules are needed.

// Unambiguous alphabet: no 0/O, 1/I/L — codes are read out loud at reception.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export const CHECKIN_PREFIX = 'mentisflow:checkin:'

// FNV-1a 32-bit hash. `reverse` walks the id backwards so the two halves of
// the code are drawn from independent hashes.
function fnv1a(str, reverse = false) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(reverse ? str.length - 1 - i : i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

// 6-character check-in code for an appointment id, e.g. "K7MPQ4".
export function shortCodeFor(apptId) {
  const id = String(apptId || '')
  let out = ''
  let n = fnv1a(id)
  for (let i = 0; i < 3; i++) { out += ALPHABET[n % ALPHABET.length]; n = Math.floor(n / ALPHABET.length) }
  n = fnv1a(id, true)
  for (let i = 0; i < 3; i++) { out += ALPHABET[n % ALPHABET.length]; n = Math.floor(n / ALPHABET.length) }
  return out
}

// "K7MPQ4" -> "K7M-PQ4" for display.
export function formatCode(code) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code
}

// Forgiving normalisation of a typed code: uppercase, strip spaces/dashes.
export function normalizeCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// The string encoded in the QR.
export function checkInPayload(apptId) {
  return CHECKIN_PREFIX + apptId
}

// Returns the appointment id from a scanned QR payload, or null if the code
// is not a MentisFlow check-in code.
export function parseCheckInPayload(text) {
  if (typeof text !== 'string') return null
  const t = text.trim()
  return t.startsWith(CHECKIN_PREFIX) ? t.slice(CHECKIN_PREFIX.length) || null : null
}
