# MentisFlow web app

The React PWA for MentisFlow. Full product, architecture, and deployment documentation lives in the [repository README](../README.md).

## Quick start

```bash
npm install
cp .env.example .env   # fill in your Firebase config
npm run dev            # http://localhost:5173
```

## Scripts

```bash
npm run dev       # Vite dev server with HMR
npm run build     # Production build (output in dist/)
npm run preview   # Serve the production build locally
npm run lint      # ESLint
npx vitest run    # Unit tests
```

## Layout

```
src/
├── pages/       # Route-level screens (Dashboard, Connect, ProviderDashboard, ProviderVault…)
├── components/  # Shared UI (ui/) and layout (layout/) pieces
├── hooks/       # Data hooks (useProviders, useVault, useInbox…)
├── context/     # Auth and app-wide state
├── lib/         # Firebase initialisation
└── utils/       # Pure helpers (availability, pricing, checkin, vault crypto…) with tests in utils/__tests__
```

## Conventions worth knowing

- **Design language:** editorial serif headlines (Fraunces) with Inter for UI, teal as the single accent, white cards on a light canvas. Dark mode is class-based (`dark:` variants everywhere).
- **PWA:** the service worker caches aggressively — after deploying, hard-refresh to see changes.
- **Base path:** the app deploys under `/theBlink/`; use `import.meta.env.BASE_URL` when building public URLs.
- **Public pages** (`/privacy`, `/terms`, `/practitioners`) are matched by path suffix in `App.jsx`, not router routes, so they survive the GitHub Pages base path.
- **Encrypted vault:** `utils/vault.js` composes Web Crypto primitives only — do not replace it with a custom cipher or move key material off-device.
