# MentisFlow

South Africa's mental health care platform. Find and book HPCSA-registered psychiatrists and psychologists, track your wellbeing every day, sharpen your focus with FocusBlink tools, and share your progress with your doctor, all in one secure app. Built as a Progressive Web App (PWA) optimised for mobile.

**Live app:** [calebmapatha.github.io/theBlink](https://calebmapatha.github.io/theBlink)

---

## What it does

MentisFlow is a dual-role web app for patients and mental health providers.

**Patients can:**
- Find and book appointments with HPCSA-registered psychiatrists/psychologists (filtered by province or location)
- Cancel or revoke booking requests, and rate a practitioner after a session (optional, mental-health-focused metrics)
- Check in at the practice with a QR pass or short code for in-person sessions
- Ask a practitioner to disclose their session fee, and get notified when they do
- Read and digitally sign the practitioner's pre-screening documents before a session
- Receive prescriptions from their doctor under a Scripts tab, and save a preferred pharmacy
- Track daily mood and mental health check-ins
- Sharpen their focus with the FocusBlink toolkit: Pomodoro-style focus timer, task board, habit tracker, monthly goals, and Brain Dump (each tool can be switched off in Settings)
- Earn rewards for completing activities
- View their treatment plan and share a consented progress snapshot with their doctor
- See booking updates in the in-app notification bell

**Providers can:**
- Sign up and list their practice (HPCSA number required, verification documents uploaded during the trial)
- Manage their profile (bio, fee with optional hide, consultation type, practice address, all 12 official SA languages), an interactive weekly availability grid, and appointments
- Check patients in at reception by scanning their QR pass or typing their code
- Keep an encrypted client-file vault: per-client session notes and documents behind a separate vault password (see below)
- Write prescriptions for linked patients
- Upload pre-screening documents for patients to sign when a booking is confirmed
- Access patient data snapshots shared during bookings, plus practice analytics
- Disclose their session fee on request; patients are notified automatically

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite 8 |
| Styling | Tailwind CSS 3, Framer Motion |
| Backend | Firebase (Auth, Firestore, Storage) |
| Functions | Firebase Cloud Functions v2 (Node 20, ESM) |
| PWA | vite-plugin-pwa (Workbox, auto-update) |
| Hosting | GitHub Pages (web app) + Firebase Hosting |
| CI/CD | GitHub Actions |

---

## Project structure

```
theBlink/
├── mentisflow/               # React PWA
│   ├── src/
│   │   ├── pages/          # Route-level components
│   │   ├── components/     # Shared UI and layout
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # App-wide state (Auth, App)
│   │   ├── lib/            # Firebase initialisation
│   │   └── utils/          # Helpers and seed data
│   ├── public/             # Static assets and icons
│   └── vite.config.js
├── functions/              # Firebase Cloud Functions
│   └── index.js            # aggregateRating, activateProvider, purgeOldAppointments
├── firestore.rules         # Firestore security rules
├── storage.rules           # Cloud Storage security rules
├── firestore.indexes.json  # Composite index definitions
└── firebase.json           # Firebase project config
```

---

## Getting started

### Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Auth, Firestore, and Storage enabled

### 1. Clone and install

```bash
git clone https://github.com/calebmapatha/theBlink.git
cd theBlink/mentisflow
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your Firebase config values in `.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Optional — enables Firebase App Check (reCAPTCHA v3)
VITE_RECAPTCHA_SITE_KEY=
```

### 3. Run locally

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

---

## Deployment

### Web app (GitHub Pages)

Pushes to `master` automatically trigger the **Deploy FocusBlink to GitHub Pages** workflow. No manual steps needed.

Add these secrets to your GitHub repository:

| Secret | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase config |
| `VITE_FIREBASE_APP_ID` | Firebase config |
| `VITE_RECAPTCHA_SITE_KEY` | Optional — App Check |

### Firebase (functions, rules, indexes)

Deploy manually after cloning:

```bash
# Install function dependencies
cd functions && npm install && cd ..

# Deploy everything
firebase deploy --only functions,firestore,storage,firestore:indexes --project YOUR_PROJECT_ID
```

> **Important:** Deploy functions and rules together. The Firestore rules block client-side writes to `subscriptionActive` — new provider signups require the `activateProvider` Cloud Function to be live.

For automated Firebase deploys, add a `FIREBASE_TOKEN` secret (from `firebase login:ci`) and trigger the **Deploy Firebase** workflow manually from the Actions tab.

---

## Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `aggregateRating` | Firestore `onCreate` on `ratings/{id}` | Recomputes `ratingCount` and `ratingAvg` on the provider document — idempotent, race-condition safe |
| `activateProvider` | HTTPS Callable | Starts the 2-month free trial or activates a plan on a provider document using the Admin SDK (bypasses client rules); returns a PayFast checkout URL when merchant credentials are configured |
| `expireTrials` | Scheduled (every 24 h) | Deactivates providers whose free trial has ended |
| `notifyBookingRequested` | Firestore `onCreate` on `appointments/{id}` | In-app notification + queued email to the practitioner about a new booking request |
| `notifyBookingStatus` | Firestore `onUpdate` on `appointments/{id}` | In-app notification + queued email when an appointment is confirmed or cancelled (routed to whichever party did not act) |
| `notifyFeeRequested` | Firestore `onCreate` on `feeRequests/{id}` | Notifies the practitioner that a patient asked them to disclose their session fee |
| `notifyFeeDisclosed` | Firestore `onUpdate` on `feeRequests/{id}` | Notifies the patient when the practitioner discloses the fee |
| `notifyProviderModeration` | Firestore `onUpdate` on `providers/{uid}` | Notifies a practitioner when their account is verified, rejected, or suspended |
| `purgeOldAppointments` | Scheduled (every 24 h) | Deletes appointments older than 2 years — POPIA data retention compliance |
| `paymentWebhook` | HTTPS Request | Verifies PayFast ITN signatures (MD5) and source IPs, then activates subscriptions on `payment_status=COMPLETE` |

In-app notifications are written to the `notifications` collection (bell icon in the app; pruned to the newest 30 per user). Booking emails are queued into the `mail` collection in the format used by the official **Trigger Email from Firestore** extension. Install it once with your SMTP credentials (`firebase ext:install firebase/firestore-send-email`, collection `mail`) and the queued emails start sending; until then they sit unsent.

### Payments (PayFast)

Paid practitioner plans use PayFast's classic checkout + ITN (Instant Transaction Notification) flow. Without merchant credentials configured, paid plans activate in **demo mode** (no charge) so the platform stays demoable. To go live:

1. Register a PayFast merchant account. Note the Merchant ID and Merchant Key (Settings → Integration), and set a Salt Passphrase there — required for recurring billing.
2. Copy `functions/.env.example` to `functions/.env`, set `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, and `PAYFAST_PASSPHRASE` (must match the dashboard exactly), leave `PAYFAST_MODE=sandbox`, and redeploy functions.
3. Test a full checkout end-to-end with a PayFast **sandbox** card — no separate webhook registration is needed; the deployed `paymentWebhook` function URL is already sent as the ITN `notify_url` on every checkout.
4. Once a sandbox subscription activates correctly, switch to the **live** Merchant ID/Key/Passphrase, set `PAYFAST_MODE=live`, and redeploy.

Flow: `activateProvider` builds a signed PayFast checkout URL; the app redirects the doctor there; PayFast POSTs an ITN to `paymentWebhook` once payment completes, which is verified against two hard security gates (a recomputed MD5 signature and PayFast's published source-IP ranges) before activating the subscription on `payment_status=COMPLETE`. Free trials never touch PayFast.

---

## Notifications

Reminders are scheduled via `setTimeout` while the app is open. For background delivery:

- **Android**: Add to home screen as a PWA — notifications fire via the service worker even when the app is backgrounded.
- **iOS 16.4+**: Must be installed as a PWA (Add to Home Screen). Background notifications are not supported in the Safari browser tab.

Use the paper-plane icon next to each enabled reminder in Settings to send a test notification immediately.

---

## Client files vault (zero-knowledge)

Practitioners get an encrypted file manager at **Dashboard → Client files** for per-client session notes and documents (up to 10 MB per file).

- Protected by a **vault password** that is separate from the account password and never leaves the device.
- Encryption uses the browser's built-in Web Crypto API: PBKDF2 (SHA-256, 310k iterations) derives an AES-256-GCM key; client names, note text, file names, and file bytes are all encrypted **before** they are stored.
- Firestore (`providers/{uid}/vault`) and Storage (`vault/{uid}/`) hold ciphertext only, and their rules are **owner-only — even the admin account is excluded**. The platform cannot read vault contents.
- The vault locks when the practitioner leaves the page; the key exists only in memory.
- **A forgotten vault password cannot be recovered** — this is inherent to the zero-knowledge design and is stated prominently in the UI. Recommend a password manager.

There is deliberately no third-party encryption vendor: nothing extra to license, configure, or hand over.

---

## In-person check-in

Confirmed in-person appointments carry a check-in pass (on the patient's appointment card): a QR code plus a 6-character short code, both derived from the appointment id — nothing extra is stored. At reception the practitioner taps **Check in** on the dashboard, scans the QR (on browsers with `BarcodeDetector`, e.g. Chrome on Android) or types the code, and the appointment is stamped with `checkedInAt`. Both sides then show the checked-in state.

---

## Privacy and compliance

MentisFlow handles special personal information (mental health data) and operates under the **Protection of Personal Information Act (POPIA)**. The in-app privacy policy is accessible at `/theBlink/privacy` without requiring a login.

Key measures:
- Patient records are readable only by the patient and their linked provider
- Practitioner clinical notes and documents live in a zero-knowledge encrypted vault (see above)
- Appointments can be deleted by patients (right to erasure)
- Old appointments are automatically purged after 2 years
- Explicit consent is required before sharing health data during a booking
- Signed pre-screening consents are immutable once created
- Firebase App Check (reCAPTCHA v3) protects backend endpoints

---

## Seeding demo providers

Log in with the admin account (`calebmapatha@gmail.com`), go to **Settings → Admin → Seed 6 doctors**. This creates demo providers across SA provinces for testing the Connect and booking flows.

---

## Scripts

```bash
# mentisflow/
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # ESLint
npx vitest run    # Unit tests (availability, pricing, stats, check-in codes, vault crypto…)
```
