# MentisFlow — Handover

_Last updated: 2026-07-14_

A working handover of the current state: what is live, what still needs configuring before full production, and the decisions left open. For architecture and setup, see [README.md](README.md).

---

## Status at a glance

MentisFlow is **feature-complete and demoable end to end**. A patient can find and book a practitioner; a practitioner can run their whole practice. The one thing not yet live is **real payment collection** — paid plans currently activate in **demo mode** (no charge) until PayFast credentials are added (see below). Free trials are fully real.

- **Live app:** https://calebmapatha.github.io/theBlink
- **Firebase project:** `focusblink-2c1e9` (Blaze plan; Auth, Firestore, Storage, Cloud Functions all active)
- **Functions region:** `europe-west1` (closest gen-2 region to South Africa; keeps data in-region for POPIA)
- **Deploy:** every push to `master` auto-deploys the web app to GitHub Pages via GitHub Actions. Firebase (functions, rules, indexes) is deployed manually.

---

## Outstanding config to finish before full production

These are account/credential steps the owner must do — they cannot be done from code alone.

### 1. Payments — PayFast (paid plans are in demo mode until this is done)
Billing runs on PayFast's classic checkout + ITN flow (`functions/index.js`: `payfastCheckoutUrl`, `paymentWebhook`).

1. In `functions/.env` (gitignored; scaffold already present), set `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, and `PAYFAST_PASSPHRASE` from the PayFast dashboard (Settings → Integration). The passphrase must match the dashboard exactly — a blank or mismatched passphrase is a documented cause of every checkout failing.
2. Leave `PAYFAST_MODE=sandbox`, deploy functions, and run one full checkout with a PayFast **sandbox** card. Confirm the provider's subscription flips to active.
3. Only then switch to live Merchant ID/Key/Passphrase, set `PAYFAST_MODE=live`, and redeploy.

No separate webhook registration is needed — the deployed `paymentWebhook` URL is sent as the ITN `notify_url` on every checkout. The ITN is verified by two hard gates: a recomputed MD5 signature and PayFast's published source-IP ranges. Signing/verification is covered by `functions/test-payfast-signing.mjs` (`node functions/test-payfast-signing.mjs`, 23 checks).

> Two non-security details are flagged in-code for sandbox reconfirmation (PayFast's official docs were not machine-readable at build time): the `cycles`/`billing_date` semantics for indefinite recurring billing, and the exact shape of the optional server-to-server ITN "validate" echo-back. The two security gates above do not depend on either.

### 2. Booking emails — Trigger Email extension
Booking-lifecycle emails are written to the `mail` Firestore collection in the format of the official **Trigger Email from Firestore** extension, but nothing sends until the extension is installed:
`firebase ext:install firebase/firestore-send-email` (collection `mail`, with your SMTP credentials). Until then the documents queue harmlessly, unsent. In-app notifications (the bell) work regardless.

### 3. App Check (backend hardening)
Set `VITE_RECAPTCHA_SITE_KEY` (build-time env / GitHub secret) and enforce Firebase App Check (reCAPTCHA v3) to protect the callable functions and data endpoints.

---

## Open pull requests

- **#49 — Replace Paystack billing with PayFast.** The billing backend swap described above. Ready to merge; then follow the PayFast go-live steps.

(Run `gh pr list --state open` for the live list.)

---

## Decisions left open

- **Pricing page** — not built. Undecided whether practitioner pricing lives on a practitioner-only page, a public page, or folded into the provider signup flow. Constraint: **patients must never see practitioner pricing.**
- **CTA button shape** — the editorial `pill`/`outline` button style is currently provider-side only; patient-side CTAs use the default rounded style. Unifying is a product-wide taste call.
- **Patient hero gradients** — Connect and the patient dashboard still use a glossy teal gradient hero; the provider side moved to a flat editorial treatment. Left as a deliberate patient-warmth choice pending a decision.

## Not yet built (nice-to-haves)

- Patient-side script/document upload.
- Per-appointment map on in-person appointment cards (the provider profile already carries a Google-Maps-searchable address).

---

## Security & compliance posture

- **Client-file vault** (`/provider/files`) is zero-knowledge: notes and documents are encrypted on the device (Web Crypto: PBKDF2 → AES-256-GCM) with a vault password separate from the login. Firestore/Storage hold ciphertext only, and the rules make the vault paths **owner-only, admin excluded**. A forgotten vault password is unrecoverable by design — surfaced clearly in the UI.
- Subscription/trial state, rating aggregates, and moderation flags are writable only by Cloud Functions / admin (enforced in `firestore.rules`); clients cannot grant themselves a subscription or reset a trial.
- Operates under **POPIA** (special personal / mental-health data). Public privacy policy at `/privacy`. Appointments auto-purge after 2 years; patients can delete their own data; explicit consent gates any health-data sharing at booking. The app says "securely," never "POPIA compliant."

---

## Notes for a new developer

- It is a **PWA with an aggressive service worker** — after any deploy, hard-refresh or you will see stale cached copy.
- **Signed-in screens cannot be exercised in the local dev preview** (stub Firebase config). Verify via `npm run build` + `npx vitest run` (67 tests) + `node functions/test-payfast-signing.mjs`, and against a real logged-in session on the deployed app.
- Firestore rules tests (`mentisflow/tests-rules/`) need the Java-based emulator, which is not part of the default local setup.
- Design language (provider surfaces): Fraunces serif display headings, Inter for UI, teal as the single accent, hairline cards, pill CTAs. Shared primitives: `PageHeader`, `Card` (`flat`/`as` props), `Button` (`pill` size, `outline` variant), `PageWrapper` (`wide` prop).
