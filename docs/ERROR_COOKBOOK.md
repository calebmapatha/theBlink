# Technical Error Cookbook

Common errors across the stack: what they look like, what they actually mean, and the fix. Ordered by how often they bite.

---

## Client (React PWA)

### Stale bundle after deploy — "the change isn't live"
**Symptom:** feature missing or old UI after a successful Pages deploy.
**Cause:** the service worker serves the precached previous build; the new one activates on the *next* launch.
**Fix:** fully close and reopen the installed app (twice at worst), or hard-refresh the tab. Nothing is wrong with the deploy. If this bites often, consider a "new version available" toast (registerType `prompt`) instead of silent autoUpdate.

### 404 on `/theBlink/practitioners`, `/privacy`, `/terms`
**Symptom:** GitHub's 404 page on a full-page load of an SPA route.
**Cause:** GitHub Pages has no server-side rewrites; unknown paths 404 unless a `404.html` fallback exists.
**Fix:** the deploy workflow copies `index.html` to `404.html` (added Jul 2026). If it recurs, confirm that workflow step ran and that the link uses `import.meta.env.BASE_URL`.

### `Missing or insufficient permissions` (Firestore)
**Symptom:** `FirebaseError: Missing or insufficient permissions` in the console.
**Cause:** a client write/read that `firestore.rules` forbids. Most common real causes here:
- Writing a **trusted provider key** (`subscriptionActive`, `ratingAvg`, `ratingCount`, `approvalStatus`) from the client — only Cloud Functions may.
- Reading another user's data (e.g. provider doc when `subscriptionActive` is false and you're not the owner).
- Rules not deployed after a schema change: `firebase deploy --only firestore:rules`.
**Debug:** reproduce in the emulator (`npm run test:rules`) — never loosen production rules to "see if it helps".

### `auth/operation-not-allowed` or blank screen at boot
**Cause:** Firebase Auth provider disabled, or missing `.env` values (all `VITE_FIREBASE_*` must be set at build time — they're baked into the bundle).
**Fix:** verify the GitHub Actions secrets; a deploy with a missing secret builds successfully but produces a broken app.

### App Check / reCAPTCHA failures (`appCheck/fetch-status-error`)
**Cause:** `VITE_RECAPTCHA_SITE_KEY` set but the domain isn't registered for that key, or App Check enforcement is on while the key is absent.
**Fix:** register the Pages domain for the site key, or clear the env var to run without App Check. Do not disable enforcement in production as a "fix".

---

## Cloud Functions

### Function works locally but 404s in production
**Cause:** not deployed, or region mismatch — everything here is `europe-west1`; the client builds URLs as `https://europe-west1-<project>.cloudfunctions.net/<name>`.
**Fix:** `firebase deploy --only functions` and confirm the function name/region in the Firebase console.

### `calendarFeed` returns 403
**Meaning:** token check failed — by design it's indistinguishable whether the uid or token is wrong.
**Checklist:** user has sync enabled (a `calendarTokens/{uid}` doc exists); the URL wasn't truncated when copied (tokens are 48 hex chars); the user hasn't disabled and re-enabled sync (old links die immediately — that's a feature). Response to user: re-copy the link from Settings, or disable/enable to mint a new one.

### `calendarFeed` returns 200 but the calendar shows nothing
**Checklist:** only **confirmed** appointments within "past 30 days + future" are included; Google feed calendars can take up to 24 h to first sync; verify the raw feed by opening the https URL — it should download an `.ics` listing `VEVENT` blocks.

### Provider signup stuck / `subscriptionActive` never set
**Cause:** `activateProvider` not deployed. The rules intentionally block clients from writing `subscriptionActive`, so without the function no trial can start.
**Fix:** deploy functions and rules **together** (see README deployment note).

### PayFast ITN rejected (`signature mismatch` in logs)
**Cause:** the `PAYFAST_PASSPHRASE` in `functions/.env` doesn't exactly match the merchant dashboard (trailing spaces count), or sandbox/live credentials are mixed (`PAYFAST_MODE`).
**Fix:** re-copy passphrase, verify mode, redeploy. The webhook also checks source IPs — a "rejected ITN" from an unlisted IP is the firewall working, not a bug.

### Emails never send
**Cause:** the `mail` collection queue exists but the **Trigger Email** extension isn't installed (or SMTP creds invalid). Queued docs just sit there.
**Fix:** `firebase ext:install firebase/firestore-send-email`, collection `mail`; check extension logs for SMTP errors.

---

## Build & CI

### `npm run lint` shows ~65 errors on a clean tree
**Known noise:** the flat ESLint config doesn't register JSX identifier usage for some patterns — every `import { motion }` (used as `<motion.div>`) and `as: Tag` prop is flagged `no-unused-vars`. Pre-existing, not introduced by your change. Judge lint deltas, not absolutes.

### Vitest: `tests-rules` failing without emulator
**Cause:** the Firestore rules tests need the emulator; plain `npx vitest run` excludes them on purpose.
**Fix:** `npm run test:rules` (spins up the emulator via `firebase emulators:exec`).

### Pages deploy green but site broken
**Checklist:** all `VITE_*` secrets present (missing ones don't fail the build); `VITE_BASE_URL=/theBlink/` intact; check the browser console for the first error — a missing Firebase key manifests as an auth/initialization error at boot.

---

## Escalation

If an incident involves potential exposure of health data (rules regression, leaked snapshot, vault concern), treat it as a POPIA incident: capture what/when/who, revoke the affected access path first (rules deploy or token revocation), and communicate to affected users factually. The vault is zero-knowledge — vault contents are cryptographically excluded from any server-side incident.
