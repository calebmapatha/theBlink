import { describe, it, expect } from 'vitest'
import {
  bytesToB64, b64ToBytes, generateSaltB64, deriveVaultKey,
  encryptJSON, decryptJSON, encryptBytes, decryptBytes,
  makeCheck, verifyCheck,
} from '../vault'

describe('base64 helpers', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255, 42])
    expect(b64ToBytes(bytesToB64(bytes))).toEqual(bytes)
  })
})

describe('vault crypto', () => {
  it('generates distinct salts', () => {
    expect(generateSaltB64()).not.toBe(generateSaltB64())
  })

  it('encrypts and decrypts JSON with the right key', async () => {
    const salt = generateSaltB64()
    const key = await deriveVaultKey('correct horse battery', salt)
    const payload = await encryptJSON(key, { name: 'Thandi M.', note: 'Session 3 notes' })
    expect(payload.iv).toBeTruthy()
    expect(payload.ct).toBeTruthy()
    const back = await decryptJSON(key, payload)
    expect(back).toEqual({ name: 'Thandi M.', note: 'Session 3 notes' })
  })

  it('fails to decrypt with the wrong password', async () => {
    const salt = generateSaltB64()
    const right = await deriveVaultKey('right-password', salt)
    const wrong = await deriveVaultKey('wrong-password', salt)
    const payload = await encryptJSON(right, { secret: true })
    expect(await decryptJSON(wrong, payload)).toBe(null)
  })

  it('uses a fresh IV per encryption', async () => {
    const key = await deriveVaultKey('pw', generateSaltB64())
    const a = await encryptJSON(key, { x: 1 })
    const b = await encryptJSON(key, { x: 1 })
    expect(a.iv).not.toBe(b.iv)
    expect(a.ct).not.toBe(b.ct)
  })

  it('round-trips binary files and rejects the wrong key', async () => {
    const salt = generateSaltB64()
    const key = await deriveVaultKey('pw', salt)
    const original = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55, 0, 255])
    const sealed = await encryptBytes(key, original)
    expect(sealed.length).toBeGreaterThan(original.length)
    expect(await decryptBytes(key, sealed)).toEqual(original)
    const other = await deriveVaultKey('other', salt)
    expect(await decryptBytes(other, sealed)).toBe(null)
  })

  it('verifies the password check value', async () => {
    const salt = generateSaltB64()
    const key = await deriveVaultKey('vault-pass', salt)
    const check = await makeCheck(key)
    expect(await verifyCheck(key, check)).toBe(true)
    const impostor = await deriveVaultKey('not-it', salt)
    expect(await verifyCheck(impostor, check)).toBe(false)
  })
})
