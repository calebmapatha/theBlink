// Firestore security-rules tests. Run against the emulator:
//   npm run test:rules
// (started automatically by `firebase emulators:exec` — see package.json)
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'

const __dir = dirname(fileURLToPath(import.meta.url))
const ADMIN_EMAIL = 'calebmapatha@gmail.com'

let env

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mentisflow',
    firestore: { rules: readFileSync(resolve(__dir, '../../firestore.rules'), 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const patient  = () => env.authenticatedContext('patient1',  { email: 'patient1@example.com' }).firestore()
const provider = () => env.authenticatedContext('provider1', { email: 'doc@example.com' }).firestore()
const stranger = () => env.authenticatedContext('attacker',  { email: 'attacker@example.com' }).firestore()
const admin    = () => env.authenticatedContext('adminuid',  { email: ADMIN_EMAIL }).firestore()
const anon     = () => env.unauthenticatedContext().firestore()

// Seed data while bypassing rules.
const seed = (path, data) =>
  env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), path), data))

const VALID_SCORES = { communication: 5, empathy: 4, professionalism: 5, treatmentPlan: 4, overall: 5 }
const APPT = { patientUid: 'patient1', providerUid: 'provider1', date: '2026-06-09', timeSlot: '09:00', status: 'completed' }

describe('ratings', () => {
  it('lets the appointment patient rate a held session with 1–5 scores', async () => {
    await seed('appointments/appt1', APPT)
    await assertSucceeds(setDoc(doc(patient(), 'ratings/appt1'), {
      patientUid: 'patient1', providerId: 'provider1', ...VALID_SCORES, comment: 'great',
    }))
  })

  it('blocks rating an appointment that does not exist', async () => {
    await assertFails(setDoc(doc(patient(), 'ratings/ghost'), {
      patientUid: 'patient1', providerId: 'provider1', ...VALID_SCORES,
    }))
  })

  it("blocks rating another patient's appointment", async () => {
    await seed('appointments/appt1', APPT)
    await assertFails(setDoc(doc(stranger(), 'ratings/appt1'), {
      patientUid: 'attacker', providerId: 'provider1', ...VALID_SCORES,
    }))
  })

  it('blocks a rating whose providerId does not match the appointment', async () => {
    await seed('appointments/appt1', APPT)
    await assertFails(setDoc(doc(patient(), 'ratings/appt1'), {
      patientUid: 'patient1', providerId: 'someOtherProvider', ...VALID_SCORES,
    }))
  })

  it('blocks out-of-range or non-numeric scores', async () => {
    await seed('appointments/appt1', APPT)
    for (const bad of [{ overall: 1000000 }, { overall: 0 }, { overall: -5 }, { overall: 'five' }]) {
      await assertFails(setDoc(doc(patient(), 'ratings/appt1'), {
        patientUid: 'patient1', providerId: 'provider1', ...VALID_SCORES, ...bad,
      }))
    }
  })

  it('blocks rating a pending/cancelled session', async () => {
    await seed('appointments/appt1', { ...APPT, status: 'pending' })
    await assertFails(setDoc(doc(patient(), 'ratings/appt1'), {
      patientUid: 'patient1', providerId: 'provider1', ...VALID_SCORES,
    }))
  })

  it('ratings are immutable', async () => {
    await seed('appointments/appt1', APPT)
    await seed('ratings/appt1', { patientUid: 'patient1', providerId: 'provider1', ...VALID_SCORES })
    await assertFails(updateDoc(doc(patient(), 'ratings/appt1'), { overall: 1 }))
    await assertFails(deleteDoc(doc(patient(), 'ratings/appt1')))
  })
})

describe('providers', () => {
  it('owner can create a profile but cannot self-grant trusted fields', async () => {
    await assertSucceeds(setDoc(doc(provider(), 'providers/provider1'), { name: 'Dr X' }))
    await assertFails(setDoc(doc(provider(), 'providers/provider1'), { name: 'Dr X', subscriptionActive: true }))
    await assertFails(setDoc(doc(provider(), 'providers/provider1'), { name: 'Dr X', ratingAvg: { overall: 5 } }))
    await assertFails(setDoc(doc(provider(), 'providers/provider1'), { name: 'Dr X', approvalStatus: 'approved' }))
  })

  it('owner cannot approve, un-suspend or activate themselves via update', async () => {
    await seed('providers/provider1', { name: 'Dr X', approvalStatus: 'pending', suspended: true })
    await assertFails(updateDoc(doc(provider(), 'providers/provider1'), { approvalStatus: 'approved' }))
    await assertFails(updateDoc(doc(provider(), 'providers/provider1'), { suspended: false }))
    await assertFails(updateDoc(doc(provider(), 'providers/provider1'), { subscriptionActive: true }))
    await assertSucceeds(updateDoc(doc(provider(), 'providers/provider1'), { bio: 'hello' }))
  })

  it('anyone signed in may bump profileViews by exactly one — nothing else', async () => {
    await seed('providers/provider1', { name: 'Dr X', subscriptionActive: true, profileViews: 10 })
    await assertSucceeds(updateDoc(doc(stranger(), 'providers/provider1'), { profileViews: 11 }))
    await assertFails(updateDoc(doc(stranger(), 'providers/provider1'), { profileViews: 0 }))
    await assertFails(updateDoc(doc(stranger(), 'providers/provider1'), { profileViews: 999999 }))
    await assertFails(updateDoc(doc(stranger(), 'providers/provider1'), { profileViews: 11, name: 'Hacked' }))
  })

  it('profileViews bump works when the field does not exist yet', async () => {
    await seed('providers/provider1', { name: 'Dr X', subscriptionActive: true })
    await assertSucceeds(updateDoc(doc(stranger(), 'providers/provider1'), { profileViews: 1 }))
  })

  it('inactive profiles are hidden from other users but visible to owner/admin', async () => {
    await seed('providers/provider1', { name: 'Dr X', subscriptionActive: false })
    await assertFails(getDoc(doc(stranger(), 'providers/provider1')))
    await assertSucceeds(getDoc(doc(provider(), 'providers/provider1')))
    await assertSucceeds(getDoc(doc(admin(), 'providers/provider1')))
  })

  it('the HPCSA search query is allowed when filtered to active providers', async () => {
    await seed('providers/provider1', { name: 'Dr X', hpcsa: 'MP123', subscriptionActive: true })
    await assertSucceeds(getDocs(query(
      collection(patient(), 'providers'),
      where('hpcsa', '==', 'MP123'),
      where('subscriptionActive', '==', true),
    )))
    // without the filter the query is unprovable and must be rejected
    await assertFails(getDocs(query(collection(patient(), 'providers'), where('hpcsa', '==', 'MP123'))))
  })
})

describe('appointments', () => {
  it('patient may create an appointment only as themselves', async () => {
    await assertSucceeds(setDoc(doc(patient(), 'appointments/a1'), APPT))
    await assertFails(setDoc(doc(stranger(), 'appointments/a2'), APPT)) // forged patientUid
  })

  it('either party may update status through the allowed lifecycle', async () => {
    await seed('appointments/a1', { ...APPT, status: 'pending' })
    await assertSucceeds(updateDoc(doc(provider(), 'appointments/a1'), { status: 'confirmed' }))
    await assertSucceeds(updateDoc(doc(patient(), 'appointments/a1'), { status: 'cancelled' }))
    await assertFails(updateDoc(doc(provider(), 'appointments/a1'), { status: 'totally-bogus' }))
  })

  it('neither party may reassign the appointment to someone else', async () => {
    await seed('appointments/a1', APPT)
    await assertFails(updateDoc(doc(patient(), 'appointments/a1'), { providerUid: 'someoneElse' }))
    await assertFails(updateDoc(doc(provider(), 'appointments/a1'), { patientUid: 'someoneElse' }))
  })

  it('third parties may not read or update an appointment', async () => {
    await seed('appointments/a1', APPT)
    await assertFails(getDoc(doc(stranger(), 'appointments/a1')))
    await assertFails(updateDoc(doc(stranger(), 'appointments/a1'), { status: 'cancelled' }))
    await assertSucceeds(getDoc(doc(admin(), 'appointments/a1')))
  })
})

describe('user data, reports, admin collections', () => {
  it('users/{uid}/data is strictly owner-only', async () => {
    await assertSucceeds(setDoc(doc(patient(), 'users/patient1/data/tasks'), { value: [] }))
    await assertFails(getDoc(doc(stranger(), 'users/patient1/data/tasks')))
    await assertFails(getDoc(doc(anon(), 'users/patient1/data/tasks')))
  })

  it('reports: creator must be the reporter; only admin reads', async () => {
    await assertSucceeds(setDoc(doc(patient(), 'reports/r1'), { reporterUid: 'patient1', reason: 'spam' }))
    await assertFails(setDoc(doc(stranger(), 'reports/r2'), { reporterUid: 'patient1', reason: 'forged' }))
    await assertFails(getDoc(doc(patient(), 'reports/r1')))
    await assertSucceeds(getDoc(doc(admin(), 'reports/r1')))
  })

  it('adminLogs are append-only, admin-only', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'adminLogs/l1'), { action: 'x' }))
    await assertFails(setDoc(doc(stranger(), 'adminLogs/l2'), { action: 'x' }))
    await assertFails(updateDoc(doc(admin(), 'adminLogs/l1'), { action: 'edited' }))
    await assertFails(deleteDoc(doc(admin(), 'adminLogs/l1')))
  })

  it('unknown collections are denied by default', async () => {
    await assertFails(setDoc(doc(admin(), 'whatever/x'), { a: 1 }))
    await assertFails(getDoc(doc(patient(), 'whatever/x')))
  })
})
