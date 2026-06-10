import { defineConfig } from 'vitest/config'

// Config for the Firestore security-rules tests only. These need the
// emulator, so they are excluded from the default `npm test` run and
// executed via `npm run test:rules` instead.
export default defineConfig({
  test: {
    include: ['tests-rules/**/*.test.js'],
    // Rules tests share one emulator instance; keep them in a single thread.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
})
