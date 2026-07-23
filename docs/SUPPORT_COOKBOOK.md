# Customer Support Cookbook

Common questions from patients and practitioners, with ready-to-send responses. Keep replies warm, short, and blame-free — this is a mental health product; never make a user feel at fault.

**Tone rules**
- Open with the answer, not an apology ritual. One "sorry about the hassle" is plenty.
- Never ask for a password, vault password, or calendar feed link. Ever.
- If health data is involved, do not ask the user to paste record contents into support channels.

---

## Accounts & sign-in

### "I can't log in"
1. Confirm they're on the right role (patient vs practitioner) — the same email can only hold one role.
2. Password reset is self-service from the sign-in screen.

> Sorry about the hassle! Tap **Sign in → Forgot password** and we'll email you a reset link. If the email doesn't arrive within a few minutes, check spam — it comes from our authentication provider. Still stuck? Reply here and we'll look at the account.

### "I forgot my vault password" (practitioners)
The vault is zero-knowledge — this is unrecoverable by design. Be direct and kind.

> The client-files vault is end-to-end encrypted: the password never leaves your device, so we genuinely cannot reset it or read your files — this is what keeps your clients' notes private. A forgotten vault password unfortunately means those encrypted files can't be opened. You can start a fresh vault at any time (Dashboard → Client files), and we'd recommend saving the new password in a password manager.

### "Delete my account / my data" (POPIA)
Right to erasure. Patients can delete appointments themselves; full account deletion is a support action.

> Absolutely — you're entitled to have your data removed. Deleting the app account removes your profile and check-in history, and appointments older than two years are already purged automatically. Confirm you'd like us to proceed and we'll action it within 30 days as required by POPIA, then confirm back to you.

---

## Booking & appointments

### "The practitioner never responded to my booking"
> Booking requests wait for the practitioner to confirm, and they're notified by email and in-app when yours arrives. If it's been more than 2 business days you can cancel the request from your appointment card and book another practitioner — your shared data snapshot is withdrawn automatically when you cancel.

### "How do I cancel?"
> Open the appointment card and tap **Cancel**. The practitioner is notified automatically, and the slot reopens for other patients. If the session was confirmed for today, it's courteous to cancel as early as you can.

### "What's the QR code on my appointment?"
> That's your check-in pass for in-person sessions. At reception, show the QR code (or read out the 6-character code under it) and you'll be checked in instantly. It contains no personal information — it's derived from the appointment reference only.

### "The practitioner's fee isn't shown"
> Some practitioners prefer to share their fee on request. Tap **Request fee** on their profile — they're notified, and you'll get a notification the moment they disclose it. You're never committed to a booking by asking.

---

## Calendar

### "How do I get appointments into my phone's calendar?"
Two options — per-appointment buttons, or live sync.

> Quickest: on any confirmed appointment, use **Add to calendar** (Google / Outlook / .ics).
>
> Better: turn on live sync in **Settings → Calendar → Enable**. That gives you a personal feed link — subscribe once in Google, Apple, or Outlook and every confirmed appointment appears and stays up to date automatically. The link works like a password, so don't share it; you can revoke it any time with **Disable**.

### "I subscribed but new appointments aren't showing yet"
> Subscribed calendars refresh on the provider's schedule — Apple and Outlook usually within the hour, Google can take up to a day for feed calendars. The appointment is safely in MentisFlow either way. If nothing appears after a day, disable and re-enable sync in Settings to mint a fresh link and re-subscribe.

---

## App & notifications

### "Reminders don't fire when the app is closed"
> On Android and iOS, background reminders need the app installed to your home screen (Add to Home Screen). On iPhone this requires iOS 16.4 or later — Safari tabs alone can't deliver background notifications. After installing, flip the reminder off and on once in Settings, and use the paper-plane icon to send yourself a test.

### "I updated but I'm seeing the old version / something looks broken"
The PWA serves the cached version first; updates land on the next launch.

> Close the app fully (swipe it away from your recent apps) and reopen it — do that twice if needed. The first launch downloads the update in the background, the second one runs it. In a browser tab, a hard refresh does the same.

### "The page says 404 / not found"
> Please make sure you're using the app from [calebmapatha.github.io/theBlink](https://calebmapatha.github.io/theBlink) — deep links now load correctly, but if you have the app installed, closing it fully and reopening will also clear a stale cached route.

---

## Practitioners: listing & billing

### "Why isn't my profile visible to patients?"
Walk the state machine in order:
1. **Awaiting approval** — verification documents not yet reviewed. Visible banner on their dashboard.
2. **Trial expired / subscription inactive** — they need to pick a plan.
3. **Suspended** — moderation action; escalate internally, don't improvise a reason.

> Your profile shows to patients once your HPCSA verification is approved and your plan (or free trial) is active — your dashboard banner shows which step is outstanding. Upload verification documents from the dashboard if you haven't; approval is usually quick. If your trial has ended, choosing a plan reactivates the listing immediately, with all your reviews intact.

### "How does the free trial / billing work?"
> Every new practice gets a 2-month free trial with full features — no card needed. After that, pick a plan in the app; payment goes through PayFast. Your listing, reviews, and data are kept safe if there's a gap between trial and plan.

### "A patient rated me unfairly"
> Ratings are anonymous and we don't edit or remove individual scores, as that would undermine trust in the whole system. Scores are averaged across at least several reviews before they meaningfully move your profile. If a review contains abuse or identifiable clinical detail, flag it to us and moderation will review that specific comment.
