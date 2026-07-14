import { describe, it, expect } from 'vitest'
import { shortCodeFor, formatCode, normalizeCode, checkInPayload, parseCheckInPayload, CHECKIN_PREFIX } from '../checkin'

describe('shortCodeFor', () => {
  it('is deterministic for the same appointment id', () => {
    expect(shortCodeFor('abc123XYZ')).toBe(shortCodeFor('abc123XYZ'))
  })

  it('produces 6 characters from the unambiguous alphabet', () => {
    const ids = ['a', 'firestore-auto-id-1', 'ZZ99', 'appointment/xyz', '']
    for (const id of ids) {
      const code = shortCodeFor(id)
      expect(code).toHaveLength(6)
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
    }
  })

  it('differs for different ids (including reversals)', () => {
    expect(shortCodeFor('abc123')).not.toBe(shortCodeFor('321cba'))
    expect(shortCodeFor('appt-A')).not.toBe(shortCodeFor('appt-B'))
  })
})

describe('formatCode', () => {
  it('splits a 6-char code with a dash', () => {
    expect(formatCode('K7MPQ4')).toBe('K7M-PQ4')
  })
  it('leaves other lengths alone', () => {
    expect(formatCode('K7M')).toBe('K7M')
  })
})

describe('normalizeCode', () => {
  it('uppercases and strips separators and spaces', () => {
    expect(normalizeCode(' k7m-pq4 ')).toBe('K7MPQ4')
    expect(normalizeCode('k7m pq4')).toBe('K7MPQ4')
  })
  it('handles empty and null input', () => {
    expect(normalizeCode('')).toBe('')
    expect(normalizeCode(null)).toBe('')
  })
})

describe('QR payload round trip', () => {
  it('encodes and parses an appointment id', () => {
    expect(parseCheckInPayload(checkInPayload('appt42'))).toBe('appt42')
  })
  it('rejects foreign QR contents', () => {
    expect(parseCheckInPayload('https://example.com')).toBe(null)
    expect(parseCheckInPayload('')).toBe(null)
    expect(parseCheckInPayload(null)).toBe(null)
    expect(parseCheckInPayload(CHECKIN_PREFIX)).toBe(null)
  })
})
