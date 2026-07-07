/**
 * MentisFlow Cloud Functions (Firebase Functions v2, Node 18, ESM).
 *
 * These run with the Admin SDK, which bypasses Firestore Security Rules, so
 * they are the trusted place to own data that clients must not be able to
 * forge: rating aggregates and subscription activation. A scheduled job
 * enforces the POPIA data-retention policy.
 */
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { setGlobalOptions } from 'firebase-functions/v2'
import { logger } from 'firebase-functions'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { createHmac, timingSafeEqual } from 'node:crypto'

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

// Trial length (2 months), overridable at runtime from config/platform →
// pricing.trialDays. Must match DEFAULT_PRICING.trialDays in the web app.
const DEFAULT_TRIAL_DAYS = 60

async function configuredTrialDays() {
  try {
    const snap = await db.doc('config/platform').get()
    const days = snap.data()?.pricing?.trialDays
    return Number.isFinite(days) && days > 0 && days <= 365 ? days : DEFAULT_TRIAL_DAYS
  } catch {
    return DEFAULT_TRIAL_DAYS
  }
}

// ── Paystack billing ─────────────────────────────────────────────────────────
// Stripe does not onboard South African merchants; Paystack does. The secret
// key comes from the functions environment (functions/.env or
// `firebase functions:secrets:set` + params). When it is NOT configured, paid
// plans fall back to demo activation so the platform stays demoable before
// the merchant account exists.
//
// Go-live steps:
//  1. Create a Paystack business, get the live secret key.
//  2. Create two subscription Plans (monthly, ZAR) in the Paystack dashboard
//     and store their codes on config/platform:
//       paystack: { plans: { standard: 'PLN_...', featured: 'PLN_...' } }
//  3. Set PAYSTACK_SECRET_KEY in functions/.env and redeploy functions.
//  4. Point a Paystack webhook at the paymentWebhook function URL.
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || ''
// Where Paystack sends the customer after checkout (the deployed web app).
const PAYMENT_CALLBACK_URL = process.env.PAYMENT_CALLBACK_URL || 'https://calebmapatha.github.io/theBlink/'

async function platformConfig() {
  try {
    const snap = await db.doc('config/platform').get()
    return snap.data() || {}
  } catch {
    return {}
  }
}

// Fallback prices when config/platform carries no override. Annual = 10x
// monthly (2 months free), matching DEFAULT_PRICING in the web app.
const FALLBACK_PRICES = {
  standard: { monthly: 495, annual: 4950 },
  featured: { monthly: 895, annual: 8950 },
}

// Create a Paystack checkout for a plan/cycle and return its authorization
// URL. With a plan code Paystack creates a recurring subscription on first
// charge; without one it falls back to a once-off charge of the amount.
// Plan codes on config/platform support both shapes:
//   paystack.plans.standard = 'PLN_...'                        (monthly only)
//   paystack.plans.standard = { monthly: 'PLN_..', annual: 'PLN_..' }
async function paystackInitialize({ email, uid, plan, cycle }) {
  const cfg = await platformConfig()
  const amount = Number(cfg.pricing?.plans?.[plan]?.[cycle]) ||
    FALLBACK_PRICES[plan][cycle]
  const rawCode = cfg.paystack?.plans?.[plan]
  const planCode = typeof rawCode === 'string'
    ? (cycle === 'monthly' ? rawCode : '')
    : (rawCode?.[cycle] || '')

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100), // ZAR cents
      currency: 'ZAR',
      ...(planCode ? { plan: planCode } : {}),
      metadata: { providerUid: uid, plan, cycle },
      callback_url: PAYMENT_CALLBACK_URL,
    }),
  })
  const json = await res.json()
  if (!json.status || !json.data?.authorization_url) {
    throw new Error(json.message || 'Paystack transaction initialization failed')
  }
  return json.data.authorization_url
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
 * Trials activate immediately. Paid plans return a Paystack checkout URL and
 * are activated exclusively by `paymentWebhook` on charge.success. If no
 * Paystack key is configured yet, paid plans activate in demo mode.
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
  const cycle = request.data?.cycle === 'annual' ? 'annual' : 'monthly'

  // Real billing: hand the doctor to Paystack checkout. Activation happens in
  // paymentWebhook once Paystack reports charge.success.
  if (PAYSTACK_SECRET) {
    const email = existing.email || request.auth.token.email
    if (!email) throw new HttpsError('failed-precondition', 'Your profile has no email address for billing.')
    const authorizationUrl = await paystackInitialize({ email, uid, plan, cycle })
    await provRef.set({
      subscriptionStatus: 'pending_payment',
      subscriptionPlan:   plan,
      subscriptionCycle:  cycle,
      approvalStatus,
    }, { merge: true })
    logger.info('activateProvider: checkout created', { uid, plan, cycle })
    return { activated: false, authorizationUrl }
  }

  // Demo mode (no Paystack key configured): activate immediately.
  await provRef.set({
    subscriptionActive:  true,
    subscriptionStatus:  'active',
    subscriptionPlan:    plan,
    subscriptionCycle:   cycle,
    subscriptionStarted: new Date().toISOString(),
    approvalStatus,
  }, { merge: true })

  logger.info('activateProvider: activated (demo mode, no Paystack key)', { uid, plan, cycle, approvalStatus })
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
 * Paystack webhook. The ONLY writer that activates paid subscriptions.
 *
 * Every request must carry a valid x-paystack-signature (HMAC-SHA512 of the
 * raw body with the secret key); anything else is rejected before any data
 * is touched. Events without a resolvable provider are acknowledged with 200
 * so Paystack does not retry them forever.
 */
export const paymentWebhook = onRequest({ cors: false }, async (req, res) => {
  if (!PAYSTACK_SECRET) {
    res.status(501).send('Payment webhook not yet configured.')
    return
  }

  const signature = req.headers['x-paystack-signature']
  const digest = createHmac('sha512', PAYSTACK_SECRET).update(req.rawBody).digest('hex')
  const valid = typeof signature === 'string' &&
    signature.length === digest.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  if (!valid) {
    logger.warn('paymentWebhook: invalid signature')
    res.status(401).send('Invalid signature')
    return
  }

  const event = req.body || {}
  const data = event.data || {}

  // Resolve the provider: transaction events carry our metadata; subscription
  // lifecycle events may only carry the customer, so fall back to email.
  let uid = data.metadata?.providerUid || null
  if (!uid && data.customer?.email) {
    const snap = await db.collection('providers')
      .where('email', '==', data.customer.email).limit(1).get()
    if (!snap.empty) uid = snap.docs[0].id
  }

  try {
    if (event.event === 'charge.success' && uid) {
      const plan = data.metadata?.plan === 'featured' ? 'featured' : 'standard'
      const cycle = data.metadata?.cycle === 'annual' ? 'annual' : 'monthly'
      await db.doc(`providers/${uid}`).set({
        subscriptionActive:  true,
        subscriptionStatus:  'active',
        subscriptionPlan:    plan,
        subscriptionCycle:   cycle,
        subscriptionStarted: new Date().toISOString(),
        paystackCustomerCode: data.customer?.customer_code || '',
      }, { merge: true })
      logger.info('paymentWebhook: subscription activated', { uid, plan, cycle })
    } else if ((event.event === 'subscription.disable' || event.event === 'invoice.payment_failed') && uid) {
      await db.doc(`providers/${uid}`).set({
        subscriptionActive: false,
        subscriptionStatus: event.event === 'subscription.disable' ? 'cancelled' : 'past_due',
      }, { merge: true })
      logger.info('paymentWebhook: subscription deactivated', { uid, event: event.event })
    } else {
      logger.info('paymentWebhook: event ignored', { event: event.event, resolved: !!uid })
    }
    res.status(200).send('ok')
  } catch (err) {
    logger.error('paymentWebhook failed', { event: event.event, error: err.message })
    res.status(500).send('error')
  }
})

/**
 * Booking-lifecycle email notifications.
 *
 * Emails are queued as documents in the `mail` collection using the format of
 * the official "Trigger Email from Firestore" extension. Install the extension
 * (firebase ext:install firebase/firestore-send-email) with your SMTP
 * credentials and set its collection to `mail`; until then, queued documents
 * simply sit unsent, so these functions deploy safely with no secrets.
 * Clients can never read or write `mail` (denied by firestore.rules); only
 * the Admin SDK writes here.
 */
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

async function queueMail(to, subject, html) {
  if (!to) return
  await db.collection('mail').add({
    to: [to],
    message: { subject, html },
    createdAt: Timestamp.now(),
  })
}

// Cap each recipient's in-app notifications so the feed stays bounded ("with
// limits"): keep the newest MAX_NOTIFICATIONS and delete the rest.
const MAX_NOTIFICATIONS = 30

// Write an in-app notification for one recipient. Only Cloud Functions can
// create these (clients are denied in firestore.rules). Failures are logged,
// never thrown, so they can't break the action that triggered them.
async function writeNotification(uid, { type, title, body, link = '' }) {
  if (!uid) return
  try {
    await db.collection('notifications').add({
      uid, type, title, body, link,
      read: false,
      createdAt: Timestamp.now(),
    })
    const extra = await db.collection('notifications')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .offset(MAX_NOTIFICATIONS)
      .get()
    if (!extra.empty) {
      const batch = db.batch()
      extra.docs.forEach(d => batch.delete(d.ref))
      await batch.commit()
    }
  } catch (err) {
    logger.error('writeNotification failed', { uid, type, error: err.message })
  }
}

/** Tell the practitioner a new booking request has arrived. */
export const notifyBookingRequested = onDocumentCreated('appointments/{id}', async (event) => {
  const appt = event.data?.data()
  if (!appt?.providerUid) return
  await writeNotification(appt.providerUid, {
    type: 'booking_requested',
    title: 'New consultation request',
    body: `${appt.patientName || 'A patient'} requested ${appt.date} at ${appt.timeSlot}.`,
    link: '/',
  })
  try {
    const prov = await db.doc(`providers/${appt.providerUid}`).get()
    const email = prov.data()?.email
    if (!email) return
    await queueMail(
      email,
      `New booking request for ${esc(appt.date)} at ${esc(appt.timeSlot)}`,
      `<p>Hi ${esc(prov.data()?.name || 'there')},</p>
       <p><strong>${esc(appt.patientName || 'A patient')}</strong> has requested an appointment
       on <strong>${esc(appt.date)}</strong> at <strong>${esc(appt.timeSlot)}</strong>.</p>
       <p>Open your MentisFlow dashboard to confirm or decline the request.</p>
       <p>MentisFlow</p>`
    )
    logger.info('notifyBookingRequested: queued', { appointment: event.params.id })
  } catch (err) {
    // Never fail the booking because a notification could not be queued.
    logger.error('notifyBookingRequested failed', { error: err.message })
  }
})

/** Notify the right party when an appointment is confirmed or cancelled. */
export const notifyBookingStatus = onDocumentUpdated('appointments/{id}', async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after || before.status === after.status) return

  if (after.status === 'confirmed') {
    await writeNotification(after.patientUid, {
      type: 'booking_confirmed',
      title: 'Appointment confirmed',
      body: after.screeningRequired
        ? `Your appointment on ${after.date} at ${after.timeSlot} was confirmed. Please review and sign the documents your practitioner requires.`
        : `Your appointment on ${after.date} at ${after.timeSlot} was confirmed.`,
      link: '/connect',
    })
  } else if (after.status === 'cancelled') {
    if (after.cancelledBy === 'patient') {
      // The patient revoked — tell the practitioner.
      await writeNotification(after.providerUid, {
        type: 'booking_cancelled',
        title: 'Appointment cancelled',
        body: `${after.patientName || 'A patient'} cancelled the ${after.date} at ${after.timeSlot} appointment.`,
        link: '/',
      })
    } else {
      await writeNotification(after.patientUid, {
        type: 'booking_cancelled',
        title: 'Appointment cancelled',
        body: `Your appointment on ${after.date} at ${after.timeSlot} was cancelled.`,
        link: '/connect',
      })
    }
  }

  // Email the patient on confirm/cancel, but not when they cancelled it
  // themselves (they already know).
  if (!after.patientEmail || (after.status === 'cancelled' && after.cancelledBy === 'patient')) return
  try {
    if (after.status === 'confirmed') {
      const link = /^https?:\/\//i.test(after.meetingLink || '')
        ? `<p>Join here at the scheduled time: <a href="${esc(after.meetingLink)}">${esc(after.meetingLink)}</a></p>`
        : '<p>Your practitioner will share the session link with you.</p>'
      await queueMail(
        after.patientEmail,
        `Appointment confirmed: ${esc(after.date)} at ${esc(after.timeSlot)}`,
        `<p>Hi ${esc(after.patientName || 'there')},</p>
         <p>Your appointment on <strong>${esc(after.date)}</strong> at
         <strong>${esc(after.timeSlot)}</strong> has been <strong>confirmed</strong>.</p>
         ${link}
         <p>MentisFlow</p>`
      )
    } else if (after.status === 'cancelled') {
      await queueMail(
        after.patientEmail,
        `Appointment cancelled: ${esc(after.date)} at ${esc(after.timeSlot)}`,
        `<p>Hi ${esc(after.patientName || 'there')},</p>
         <p>Your appointment on <strong>${esc(after.date)}</strong> at
         <strong>${esc(after.timeSlot)}</strong> has been <strong>cancelled</strong>.
         You can request a new time from the Connect page.</p>
         <p>MentisFlow</p>`
      )
    } else {
      return
    }
    logger.info('notifyBookingStatus: queued', { appointment: event.params.id, status: after.status })
  } catch (err) {
    logger.error('notifyBookingStatus failed', { error: err.message })
  }
})

/** A patient asked a practitioner to disclose their (hidden) session fee. */
export const notifyFeeRequested = onDocumentCreated('feeRequests/{id}', async (event) => {
  const r = event.data?.data()
  if (!r?.providerUid) return
  await writeNotification(r.providerUid, {
    type: 'fee_requested',
    title: 'Session fee requested',
    body: `${r.patientName || 'A patient'} asked you to share your session fee. Open the request to disclose it.`,
    link: '/',
  })
})

/** The practitioner disclosed their fee — tell the patient the amount. */
export const notifyFeeDisclosed = onDocumentUpdated('feeRequests/{id}', async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!after || before?.status === after.status || after.status !== 'disclosed') return
  try {
    const prov = await db.doc(`providers/${after.providerUid}`).get()
    const fee = prov.data()?.sessionFee
    const name = prov.data()?.name || 'Your practitioner'
    await writeNotification(after.patientUid, {
      type: 'fee_disclosed',
      title: 'Session fee shared',
      body: fee
        ? `${name}'s session fee is R${fee} per session.`
        : `${name} has shared their session fee — open their profile to view it.`,
      link: '/connect',
    })
  } catch (err) {
    logger.error('notifyFeeDisclosed failed', { error: err.message })
  }
})

/**
 * Notify a practitioner when moderation changes their account state:
 * verified (approved), rejected, or suspended. Fires server-side on the
 * providers doc so the message can't be forged from a client.
 */
export const notifyProviderModeration = onDocumentUpdated('providers/{uid}', async (event) => {
  const before = event.data?.before.data() || {}
  const after = event.data?.after.data() || {}
  const uid = event.params.uid

  if (before.approvalStatus !== 'approved' && after.approvalStatus === 'approved') {
    await writeNotification(uid, {
      type: 'account_verified',
      title: 'Your account has been verified',
      body: 'Your practice has been approved and is now visible to patients on MentisFlow.',
      link: '/',
    })
  } else if (before.approvalStatus !== 'rejected' && after.approvalStatus === 'rejected') {
    await writeNotification(uid, {
      type: 'account_rejected',
      title: 'Verification unsuccessful',
      body: 'We could not verify your practice. Please contact support to resolve this.',
      link: '/',
    })
  }

  if (!before.suspended && after.suspended) {
    await writeNotification(uid, {
      type: 'account_suspended',
      title: 'Account suspended',
      body: 'Your profile has been suspended and is hidden from patients. Contact support.',
      link: '/',
    })
  }
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
