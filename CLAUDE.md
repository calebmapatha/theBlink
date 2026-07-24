# MentisFlow — Claude Code instructions

MentisFlow is a South African mental health web app: booking of HPCSA-registered
practitioners, wellbeing tracking, and a tools suite. Backend: Firebase under the
`focusblink-2c1e9` project, with POPIA data residency in `africa-south1`. Health
information is special personal information under POPIA; treat every task
accordingly.

The web app lives in `mentisflow/`; Cloud Functions in `functions/`; Firestore and
Storage rules at the repo root.

## Ground rules

- Explore before editing. Map the routing, the left menu component, the card
  components, the auth flow and the Firebase config, then present a short plan
  before large changes.
- Only touch what a task requires. Everything not listed is out of scope, in
  particular any Vercel migration and any iOS or Android conversion.
- Small, reviewable commits, one task per commit where possible.
- Never commit secrets. API keys go into environment variables.
- All new and modified UI follows the design system below.
- If a task conflicts with existing behaviour not mentioned here, stop and ask.

## Design system (Task 1 — everything else inherits it)

1. Shape language: sharp edges everywhere. Border radius is 0 globally; no
   rounded-corner utilities or tokens. The Tailwind `borderRadius` scale is
   zeroed in `mentisflow/tailwind.config.js` as a guard — do not reintroduce
   `rounded-*` classes or arbitrary radii.
2. Colour: no brownish tones. A fresh, lightweight palette: warm off-white base,
   a soft lavender/periwinkle primary accent, and muted pastel tints (blush,
   mint, peach, powder blue) reserved for category and data cards. All colours
   are centralised as design tokens in `mentisflow/src/styles/theme.css` and
   mapped in `tailwind.config.js`; no hardcoded colours in components.
3. Cards: a subtle paper feeling. Flat off-white card surface on a slightly
   cooler page background, one hairline border or one soft low shadow (never
   both), generous internal whitespace. No image textures or grain.
4. Layout: generous white space, card-based screens, prominent practitioner
   photography on profiles and booking screens, and a clear fee breakdown on the
   booking screen (practitioner fee, platform fee, total cost).
5. Reference designs use rounded corners and pill buttons; the sharp-edge rule
   overrides that. Adopt their spacing, lightness, palette and layout, but render
   every element with square corners — buttons are solid accent-colour
   rectangles.
6. Calendar: one calendar pattern everywhere a date appears (booking,
   appointments and the archive, checkup schedule, monthly report). Light
   month-grid style: flat off-white paper surface, hairline gridlines, sharp
   corners, muted day numbers, slim pastel event bars for appointments and
   sessions, and a lavender square (not a circle) marking today and the selected
   date. Event details open in a small paper card on tap. The booking date picker
   is the same grid at compact scale using the same tokens, not a different
   design. No flip, parallax or novelty calendar effects; calendar motion follows
   the same reduced-motion rules as everything else.
7. Overall feel: calming, lightweight, warm, stress-relieving.
