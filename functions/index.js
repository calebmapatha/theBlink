/**
 * MentisFlow Cloud Functions (Firebase Functions v2, Node 18, ESM).
 *
 * These run with the Admin SDK, which bypasses Firestore Security Rules, so
 * they are the trusted place to own data that clients must not be able to
 * forge: rating aggregates and subscription activation. A scheduled job
 * enforces the POPIA data-retention policy.
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { setGlobalOptions } from 'firebase-functions/v2'
import { logger } from 'firebase-functions'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// europe-west1 is the closest Functions v2 region to South Africa (no af-south1
// for gen-2 yet) — keeps latency reasonable and data in-region for POPIA.
const REGION = 'europe-west1'
setGlobalOptions({ region: REGION, maxInstances: 10 })

initializeApp()
const db = getFirestore()

const RATING_KEYS = ['communication', 'empathy', 'professionalism', 'treatmentPlan', 'overall']

/**
 * Recompute a provider's rating aggregates whenever a new rating is created.
 *
 * We recompute from the full set of ratings (rather than incrementing) so the
 * function is idempotent and self-healing: a retry, or a backfill, always
 * converges to the correct value. Clients can no longer write ratingAvg/
 * ratingCount directly (enforced in firestore.rules), so these are trusted.
 */
export const aggregateRating = onDocumentCreated('ratings/{appointmentId}', async (event) => {
  const rating = event.data?.data()
  const providerId = rating?.providerId
  if (!providerId) {
    logger.warn('aggregateRating: rating has no providerId', { id: event.params.appointmentId })
    return
  }

  try {
    const snap = await db.collection('ratings').where('providerId', '==', providerId).get()
    const ratings = snap.docs.map(d => d.data())
    const count = ratings.length
    if (count === 0) return

    // Scores are validated to 1–5 in firestore.rules; clamp here as well so a
    // single bad legacy document can never skew an aggregate out of range.
    const clamp = (v) => Math.min(5, Math.max(0, Number(v) || 0))
    const ratingAvg = {}
    for (const key of RATING_KEYS) {
      const sum = ratings.reduce((s, r) => s + clamp(r[key]), 0)
      ratingAvg[key] = +(sum / count).toFixed(2)
    }

    await db.doc(`providers/${providerId}`).set({ ratingCount: count, ratingAvg }, { merge: true })
    logger.info('aggregateRating: updated provider', { providerId, count })
  } catch (err) {
    logger.error('aggregateRating failed', { providerId, error: err.message })
    throw err // let Functions retry
  }
})

/**
 * Activate a provider's subscription.
 *
 * DEMO MODE: activates immediately on request. This exists so that
 * subscriptionActive is set by trusted server code (Admin SDK) instead of the
 * client — clients are blocked from writing that field in firestore.rules.
 *
 * TODO (real billing): replace the body with Stripe Checkout session creation
 * and return the checkout URL. Activation then happens exclusively in
 * `stripeWebhook` on `checkout.session.completed`. No client change needed
 * beyond redirecting to the returned URL.
 */
export const activateProvider = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.')
  const uid = request.auth.uid
  const plan = request.data?.plan === 'featured' ? 'featured' : 'standard'

  const provRef = db.doc(`providers/${uid}`)
  const snap = await provRef.get()
  if (!snap.exists) throw new HttpsError('failed-precondition', 'Create your provider profile first.')

  // New providers enter the Super Admin approval queue: the subscription is
  // active, but the profile stays hidden from patients until approvalStatus
  // is set to 'approved' by an admin. Re-activations keep their status.
  const existingStatus = snap.data()?.approvalStatus
  await provRef.set({
    subscriptionActive:  true,
    subscriptionPlan:    plan,
    subscriptionStarted: new Date().toISOString(),
    approvalStatus:      existingStatus || 'pending',
  }, { merge: true })

  logger.info('activateProvider: activated', { uid, plan, approvalStatus: existingStatus || 'pending' })
  return { activated: true }
})

/**
 * Stripe webhook endpoint (stub).
 *
 * Wire-up steps when going live:
 *  1. Add `stripe` to functions/package.json and set the STRIPE_SECRET_KEY and
 *     STRIPE_WEBHOOK_SECRET secrets (firebase functions:secrets:set ...).
 *  2. Verify the Stripe-Signature header with stripe.webhooks.constructEvent.
 *  3. On checkout.session.completed / invoice.paid: read metadata.providerUid
 *     and set subscriptionActive: true.
 *  4. On customer.subscription.deleted: set subscriptionActive: false.
 *  5. Always 200 on success, 400 on signature failure.
 */
export const stripeWebhook = onRequest({ cors: false }, async (req, res) => {
  res.status(501).send('Stripe webhook not yet configured.')
})

/**
 * POPIA data-retention enforcement.
 *
 * Deletes appointment documents (which embed shared health snapshots) older
 * than two years. Runs daily so backlogs never build up. Batches are capped at
 * 500 writes per Firestore limit.
 */
export const purgeOldAppointments = onSchedule('every 24 hours', async () => {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000))
  const snap = await db.collection('appointments').where('createdAt', '<', cutoff).get()
  if (snap.empty) {
    logger.info('purgeOldAppointments: nothing to purge')
    return
  }

  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch()
    docs.slice(i, i + 500).forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
  logger.info(`purgeOldAppointments: deleted ${docs.length} appointments older than 2 years`)
})
