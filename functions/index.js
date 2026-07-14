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
import { createHash, timingSafeEqual } from 'node:crypto'

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

// ── PayFast billing ──────────────────────────────────────────────────────────
// PayFast is the merchant-of-record. Credentials come from the functions
// environment (functions/.env, gitignored). Without them configured, paid
// plans fall back to demo activation so the platform stays demoable before
// the merchant account exists.
//
// Go-live steps:
//  1. Register a PayFast merchant account; note the Merchant ID + Merchant
//     Key (Settings > Integration). Set a Salt Passphrase there too — it is
//     required for recurring-billing signatures, and MUST be identical to
//     PAYFAST_PASSPHRASE below (an empty/mismatched passphrase is a
//     documented cause of every checkout failing).
//  2. Set PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE and
//     PAYFAST_MODE=sandbox in functions/.env and redeploy functions.
//  3. Test a full checkout with a PayFast sandbox card before touching the
//     live key — this function's own URL is already the ITN notify_url, no
//     separate webhook registration needed on PayFast's side.
//  4. Once a sandbox subscription activates end-to-end, switch to the LIVE
//     Merchant ID/Key/Passphrase and PAYFAST_MODE=live, then redeploy.
//
// Field order and encoding are cross-checked against PayFast's classic
// "Custom Integration" checkout + ITN flow — NOT PayFast's separate,
// alphabetically-sorted REST API (a different signature scheme; don't mix
// the two). Two specifics could not be confirmed against primary docs
// (blocked to automated fetches) and are flagged inline: the exact
// `cycles`/`billing_date` semantics for indefinite recurring billing, and the
// precise shape of the optional server-to-server ITN "validate" echo-back.
// Both are implemented on the best cross-referenced understanding available;
// reconfirm in a live PayFast sandbox run before relying on them. The
// signature and source-IP checks are the two hard security gates and are
// independently solid regardless of those two open items.
const PAYFAST_MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID || ''
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || ''
const PAYFAST_PASSPHRASE   = process.env.PAYFAST_PASSPHRASE || ''
const PAYFAST_MODE = process.env.PAYFAST_MODE === 'live' ? 'live' : 'sandbox'
const PAYFAST_HOST = PAYFAST_MODE === 'live' ? 'www.payfast.co.za' : 'sandbox.payfast.co.za'
// Where PayFast sends the customer after checkout (the deployed web app).
const PAYMENT_CALLBACK_URL = process.env.PAYMENT_CALLBACK_URL || 'https://calebmapatha.github.io/theBlink/'
// This function's own deployed URL — PayFast POSTs ITNs here directly.
const PAYFAST_NOTIFY_URL = process.env.PAYFAST_NOTIFY_URL ||
  `https://${REGION}-focusblink-2c1e9.cloudfunctions.net/paymentWebhook`

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

// PayFast's classic checkout signs a PHP http_build_query()-style string:
// spaces become '+', and a handful of characters JS's encodeURIComponent
// leaves unescaped that PHP's urlencode() does not (! ' ( ) * ~). Using this
// encoder for every outgoing value — and never re-encoding incoming ITN bytes
// (see verifyItnSignature below) — keeps both sides byte-identical to
// PayFast's own PHP-based signing, sidestepping the classic JS/PHP mismatch.
export function phpUrlEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E')
}

// Signs a set of OUTGOING checkout fields: join in the given (documented,
// non-alphabetical) order, skip blanks, then append the passphrase — but
// ONLY if one is configured. A blank `passphrase=` parameter is a documented
// cause of every payment failing, so it must be omitted, never sent empty.
export function payfastSignature(orderedFields) {
  const parts = orderedFields
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${phpUrlEncode(v)}`)
  if (PAYFAST_PASSPHRASE) parts.push(`passphrase=${phpUrlEncode(PAYFAST_PASSPHRASE)}`)
  return createHash('md5').update(parts.join('&')).digest('hex')
}

// Create a PayFast checkout URL for a plan/cycle. subscription_type=1 tells
// PayFast to bill recurring_amount every `frequency` (3=monthly, 6=annual)
// until cancelled (cycles=0 = indefinite). The doctor pays the first
// instalment on this checkout page; the ITN below confirms it and every
// renewal after.
async function payfastCheckoutUrl({ email, uid, plan, cycle, name }) {
  const cfg = await platformConfig()
  const amount = Number(cfg.pricing?.plans?.[plan]?.[cycle]) || FALLBACK_PRICES[plan][cycle]
  const amountStr = amount.toFixed(2)
  const today = new Date().toISOString().split('T')[0]

  // Order matters here: this is PayFast's documented checkout field order,
  // not alphabetical (alphabetical sorting applies only to PayFast's
  // separate REST API, a different signature scheme entirely).
  const fields = [
    ['merchant_id',  PAYFAST_MERCHANT_ID],
    ['merchant_key', PAYFAST_MERCHANT_KEY],
    ['return_url',   PAYMENT_CALLBACK_URL],
    ['cancel_url',   PAYMENT_CALLBACK_URL],
    ['notify_url',   PAYFAST_NOTIFY_URL],
    ['name_first',   (name || 'MentisFlow Provider').slice(0, 100)],
    ['email_address', email],
    ['m_payment_id', `${uid}-${Date.now()}`],
    ['amount',       amountStr],
    ['item_name',    `MentisFlow - ${plan === 'featured' ? 'Featured' : 'Standard'} (${cycle})`],
    ['custom_str1',  uid],
    ['custom_str2',  plan],
    ['custom_str3',  cycle],
    ['subscription_type', '1'],
    ['billing_date',      today],
    ['recurring_amount',  amountStr],
    ['frequency',         cycle === 'annual' ? '6' : '3'],
    ['cycles',            '0'],
  ]

  const signature = payfastSignature(fields)
  const query = fields
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${phpUrlEncode(v)}`)
    .join('&')
  return `https://${PAYFAST_HOST}/eng/process?${query}&signature=${signature}`
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
 * Trials activate immediately. Paid plans return a PayFast checkout URL and
 * are activated exclusively by `paymentWebhook` on payment_status COMPLETE.
 * If no PayFast credentials are configured yet, paid plans activate in demo
 * mode.
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

  // Real billing: hand the doctor to PayFast checkout. Activation happens in
  // paymentWebhook once PayFast's ITN reports payment_status COMPLETE.
  if (PAYFAST_MERCHANT_ID && PAYFAST_MERCHANT_KEY) {
    const email = existing.email || request.auth.token.email
    if (!email) throw new HttpsError('failed-precondition', 'Your profile has no email address for billing.')
    const authorizationUrl = await payfastCheckoutUrl({ email, uid, plan, cycle, name: existing.name })
    await provRef.set({
      subscriptionStatus: 'pending_payment',
      subscriptionPlan:   plan,
      subscriptionCycle:  cycle,
      approvalStatus,
    }, { merge: true })
    logger.info('activateProvider: checkout created', { uid, plan, cycle })
    return { activated: false, authorizationUrl }
  }

  // Demo mode (no PayFast credentials configured): activate immediately.
  await provRef.set({
    subscriptionActive:  true,
    subscriptionStatus:  'active',
    subscriptionPlan:    plan,
    subscriptionCycle:   cycle,
    subscriptionStarted: new Date().toISOString(),
    approvalStatus,
  }, { merge: true })

  logger.info('activateProvider: activated (demo mode, no PayFast credentials)', { uid, plan, cycle, approvalStatus })
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

// Small, purpose-built CIDR check for PayFast's two published ITN IP ranges
// (per PayFast's "What IP addresses does PayFast use?" support article).
// Just two fixed blocks, so a hand-rolled octet comparison avoids pulling in
// a general-purpose CIDR-matching dependency for this alone.
const PAYFAST_IP_RANGES = [
  { base: '197.97.145.144', bits: 28 }, // 197.97.145.145 – .158
  { base: '41.74.179.192',  bits: 27 }, // 41.74.179.193 – .222
]
function ipToInt(ip) {
  const parts = String(ip).split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null
  return parts.reduce((acc, n) => (acc << 8) + n, 0) >>> 0
}
export function isPayfastIp(ip) {
  const n = ipToInt(ip)
  if (n === null) return false
  return PAYFAST_IP_RANGES.some(({ base, bits }) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return (n & mask) === (ipToInt(base) & mask)
  })
}

// Verifies an incoming ITN's signature WITHOUT re-encoding any of PayFast's
// own bytes: string-split the raw body on '&', drop the `signature` pair,
// rejoin, append the passphrase (only if configured). This sidesteps the
// entire JS/PHP re-encoding mismatch class of bug, since PayFast's
// already-encoded bytes are never decoded then re-encoded by us.
export function verifyItnSignature(rawBodyText, providedSignature) {
  const pairs = rawBodyText.split('&').filter(p => !p.startsWith('signature='))
  let base = pairs.join('&')
  if (PAYFAST_PASSPHRASE) base += `&passphrase=${phpUrlEncode(PAYFAST_PASSPHRASE)}`
  const expected = createHash('md5').update(base).digest('hex')
  return typeof providedSignature === 'string' &&
    providedSignature.length === expected.length &&
    timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expected))
}

/**
 * PayFast ITN (Instant Transaction Notification). The ONLY writer that
 * activates paid subscriptions.
 *
 * Two hard security gates, checked before any data is touched: a valid MD5
 * signature computed from PayFast's own request bytes, and a source IP
 * within PayFast's published ITN ranges. A best-effort server-to-server
 * "validate" echo-back to PayFast is also attempted and logged as
 * defense-in-depth, but is not itself a hard gate — see the go-live comment
 * above the PayFast config constants for why.
 */
export const paymentWebhook = onRequest({ cors: false }, async (req, res) => {
  if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
    res.status(501).send('Payment webhook not yet configured.')
    return
  }

  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const sourceIp = forwarded || req.ip || ''
  if (!isPayfastIp(sourceIp)) {
    logger.warn('paymentWebhook: rejected — source IP not in PayFast ranges', { sourceIp })
    res.status(403).send('Forbidden')
    return
  }

  const rawBodyText = req.rawBody.toString('utf8')
  const params = new URLSearchParams(rawBodyText)
  if (!verifyItnSignature(rawBodyText, params.get('signature'))) {
    logger.warn('paymentWebhook: invalid signature')
    res.status(400).send('Invalid signature')
    return
  }

  // Best-effort echo-back confirmation (see doc comment above) — logged only,
  // never blocks activation on its own.
  try {
    const validateRes = await fetch(`https://${PAYFAST_HOST}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rawBodyText,
    })
    const validateText = (await validateRes.text()).trim()
    if (validateText !== 'VALID') {
      logger.warn('paymentWebhook: validate echo-back did not confirm', { validateText })
    }
  } catch (err) {
    logger.warn('paymentWebhook: validate echo-back failed', { error: err.message })
  }

  const paymentStatus = params.get('payment_status') || ''
  const uid            = params.get('custom_str1') || ''
  const plan            = params.get('custom_str2') === 'featured' ? 'featured' : 'standard'
  const cycle           = params.get('custom_str3') === 'annual' ? 'annual' : 'monthly'
  const pfPaymentId     = params.get('pf_payment_id') || ''

  try {
    if (paymentStatus === 'COMPLETE' && uid) {
      await db.doc(`providers/${uid}`).set({
        subscriptionActive:  true,
        subscriptionStatus:  'active',
        subscriptionPlan:    plan,
        subscriptionCycle:   cycle,
        subscriptionStarted: new Date().toISOString(),
        paymentReference:    pfPaymentId,
      }, { merge: true })
      logger.info('paymentWebhook: subscription activated', { uid, plan, cycle, pfPaymentId })
    } else {
      // PayFast does not publish a confirmed ITN status for "recurring
      // subscription cancelled/failed" the way some gateways do — rather
      // than guess at one, non-COMPLETE statuses are logged only for now.
      // Verify actual cancellation/failure behaviour against sandbox before
      // relying on automatic deactivation here.
      logger.info('paymentWebhook: event not activated', { paymentStatus, resolved: !!uid })
    }
    res.status(200).send('ok')
  } catch (err) {
    logger.error('paymentWebhook failed', { paymentStatus, error: err.message })
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
