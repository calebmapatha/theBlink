import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'MentisFlow',
        short_name: 'MentisFlow',
        description: 'Mental health care, connected. South Africa\'s platform for psychiatrists & psychologists.',
        theme_color: '#14b8a6',
        background_color: '#f0fdfa',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/theBlink/',
        start_url: '/theBlink/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
      },
    }),
  ],
  base: process.env.VITE_BASE_URL || '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
