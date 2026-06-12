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

// Trial length, overridable at runtime from config/platform → pricing.trialDays.
const DEFAULT_TRIAL_DAYS = 30

async function configuredTrialDays() {
  try {
    const snap = await db.doc('config/platform').get()
    const days = snap.data()?.pricing?.trialDays
    return Number.isFinite(days) && days > 0 && days <= 365 ? days : DEFAULT_TRIAL_DAYS
  } catch {
    return DEFAULT_TRIAL_DAYS
  }
}

/**
 * Activate a provider's subscription, or start their one-time free trial.
 *
 * plan: 'trial' | 'standard' | 'featured'
 *
 * All subscription/trial state lives server-side because clients are blocked
 * from writing these fields in firestore.rules — a doctor must not be able to
 * grant themselves an endless trial or an active subscription.
 *
 * Paid plans are DEMO MODE: they activate immediately on request.
 * TODO (real billing): Paystack, not Stripe — Stripe does not onboard South
 * African merchants. Replace the paid branch with Paystack transaction
 * initialization (subscription plan codes) and return the authorization_url;
 * activation then happens exclusively in `paymentWebhook` on charge.success.
 */
export const activateProvider = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.')
  const uid = request.auth.uid
  const requested = request.data?.plan

  const provRef = db.doc(`providers/${uid}`)
  const snap = await provRef.get()
  if (!snap.exists) throw new HttpsError('failed-precondition', 'Create your provider profile first.')
  const existing = snap.data() || {}

  // New providers enter the Super Admin approval queue: the subscription is
  // active, but the profile stays hidden from patients until approvalStatus
  // is set to 'approved' by an admin. Re-activations keep their status.
  const approvalStatus = existing.approvalStatus || 'pending'

  if (requested === 'trial') {
    if (existing.trialUsed) {
      throw new HttpsError('failed-precondition', 'Your free trial has already been used. Please choose a plan.')
    }
    const trialDays = await configuredTrialDays()
    const now = new Date()
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString()
    await provRef.set({
      subscriptionActive: true,
      subscriptionStatus: 'trialing',
      subscriptionPlan:   'standard', // trial = full Standard features
      trialUsed:          true,
      trialStarted:       now.toISOString(),
      trialEndsAt,
      approvalStatus,
    }, { merge: true })
    logger.info('activateProvider: trial started', { uid, trialDays, trialEndsAt, approvalStatus })
    return { activated: true, trial: true, trialEndsAt }
  }

  const plan = requested === 'featured' ? 'featured' : 'standard'
  await provRef.set({
    subscriptionActive:  true,
    subscriptionStatus:  'active',
    subscriptionPlan:    plan,
    subscriptionStarted: new Date().toISOString(),
    approvalStatus,
  }, { merge: true })

  logger.info('activateProvider: activated', { uid, plan, approvalStatus })
  return { activated: true }
})

/**
 * Daily sweep: deactivate providers whose free trial has ended.
 *
 * Their profile and data are kept — subscriptionActive: false simply hides
 * the listing from patients until they pick a paid plan, which is also the
 * reason they come back. The companion query needs the composite index on
 * (subscriptionStatus, trialEndsAt) declared in firestore.indexes.json.
 */
export const expireTrials = onSchedule('every 24 hours', async () => {
  const nowIso = new Date().toISOString()
  const snap = await db.collection('providers')
    .where('subscriptionStatus', '==', 'trialing')
    .where('trialEndsAt', '<=', nowIso)
    .get()
  if (snap.empty) {
    logger.info('expireTrials: no trials to expire')
    return
  }

  const batch = db.batch()
  snap.docs.forEach(d => batch.set(d.ref, {
    subscriptionActive: false,
    subscriptionStatus: 'trial_expired',
  }, { merge: true }))
  await batch.commit()
  logger.info(`expireTrials: expired ${snap.size} trial(s)`)
})

/**
 * Payment webhook endpoint (stub) — intended for Paystack.
 *
 * Wire-up steps when going live:
 *  1. Add `paystack` API calls (plain fetch is enough) and set the
 *     PAYSTACK_SECRET_KEY secret (firebase functions:secrets:set ...).
 *  2. Verify the x-paystack-signature header (HMAC-SHA512 of the raw body
 *     with the secret key).
 *  3. On charge.success / subscription.create: read metadata.providerUid and
 *     set subscriptionActive: true, subscriptionStatus: 'active'.
 *  4. On subscription.disable / invoice.payment_failed: set
 *     subscriptionActive: false, subscriptionStatus: 'past_due' | 'cancelled'.
 *  5. Always 200 on success, 401 on signature failure.
 */
export const paymentWebhook = onRequest({ cors: false }, async (req, res) => {
  res.status(501).send('Payment webhook not yet configured.')
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
