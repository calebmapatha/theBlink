# MentisFlow

South Africa's mental health care platform. Find and book HPCSA-registered psychiatrists and psychologists, track your wellbeing every day, sharpen your focus with FocusBlink tools, and share your progress with your doctor, all in one secure app. Built as a Progressive Web App (PWA) optimised for mobile.

**Live app:** [calebmapatha.github.io/theBlink](https://calebmapatha.github.io/theBlink)

---

## What it does

MentisFlow is a dual-role web app for patients and mental health providers.

**Patients can:**
- Find and book appointments with HPCSA-registered psychiatrists/psychologists (filtered by province or location)
- Track daily mood and mental health check-ins
- Sharpen their focus with the FocusBlink toolkit: Pomodoro-style focus timer, task board, habit tracker, monthly goals, and Brain Dump
- Earn rewards for completing activities
- View their treatment plan and share a consented progress snapshot with their doctor

**Providers can:**
- Sign up and list their practice (HPCSA number required)
- Manage their profile, availability, and appointments
- Access patient data snapshots shared during bookings

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Vite 8 |
| Styling | Tailwind CSS 3, Framer Motion |
| Backend | Firebase (Auth, Firestore, Storage) |
| Functions | Firebase Cloud Functions v2 (Node 18, ESM) |
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
| `activateProvider` | HTTPS Callable | Starts the 2-month free trial or activates a plan on a provider document using the Admin SDK (bypasses client rules) |
| `expireTrials` | Scheduled (every 24 h) | Deactivates providers whose free trial has ended |
| `notifyBookingRequested` | Firestore `onCreate` on `appointments/{id}` | Queues an email to the practitioner about a new booking request (Trigger Email extension) |
| `notifyBookingStatus` | Firestore `onUpdate` on `appointments/{id}` | Queues an email to the patient when an appointment is confirmed or cancelled |
| `purgeOldAppointments` | Scheduled (every 24 h) | Deletes appointments older than 2 years — POPIA data retention compliance |
| `paymentWebhook` | HTTPS Request | Verifies Paystack webhook signatures (HMAC-SHA512) and activates/deactivates subscriptions on charge.success, subscription.disable, and invoice.payment_failed |

Booking emails are queued into the `mail` collection in the format used by the official **Trigger Email from Firestore** extension. Install it once with your SMTP credentials (`firebase ext:install firebase/firestore-send-email`, collection `mail`) and the queued emails start sending; until then they sit unsent.

### Payments (Paystack)

Paid practitioner plans use Paystack checkout. Without a configured key, paid plans activate in **demo mode** (no charge) so the platform stays demoable. To go live:

1. Create a Paystack business and four ZAR subscription Plans: Standard and Featured, each with a monthly and an annual variant (annual is priced at 10x monthly, i.e. 2 months free).
2. Store the plan codes on the `config/platform` document: `paystack: { plans: { standard: { monthly: 'PLN_...', annual: 'PLN_...' }, featured: { monthly: 'PLN_...', annual: 'PLN_...' } } }`.
3. Copy `functions/.env.example` to `functions/.env`, set `PAYSTACK_SECRET_KEY`, and redeploy functions.
4. In the Paystack dashboard, point a webhook at the deployed `paymentWebhook` function URL.

Flow: `activateProvider` creates a checkout and returns its URL; the app redirects the doctor to Paystack; `paymentWebhook` activates the subscription on `charge.success`. Free trials never touch Paystack.

---

## Notifications

Reminders are scheduled via `setTimeout` while the app is open. For background delivery:

- **Android**: Add to home screen as a PWA — notifications fire via the service worker even when the app is backgrounded.
- **iOS 16.4+**: Must be installed as a PWA (Add to Home Screen). Background notifications are not supported in the Safari browser tab.

Use the paper-plane icon next to each enabled reminder in Settings to send a test notification immediately.

---

## Privacy and compliance

MentisFlow handles special personal information (mental health data) and operates under the **Protection of Personal Information Act (POPIA)**. The in-app privacy policy is accessible at `/theBlink/privacy` without requiring a login.

Key measures:
- Patient records are readable only by the patient and their linked provider
- Appointments can be deleted by patients (right to erasure)
- Old appointments are automatically purged after 2 years
- Explicit consent is required before sharing health data during a booking
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
```
