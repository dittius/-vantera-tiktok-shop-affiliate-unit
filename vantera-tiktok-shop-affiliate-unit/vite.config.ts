import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this app from https://<owner>.github.io/<repo>/ (a
// subpath), not the domain root. VITE_BASE_PATH lets the deploy workflow
// pass that subpath in; everything defaults to "/" for local dev / a
// custom-domain deployment (Netlify, Vercel, ...).
const base = process.env.VITE_BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: base,
        name: 'Vantera — TikTok Shop Affiliate Unit',
        short_name: 'Vantera',
        description:
          'Business unit AI per contenuti affiliate TikTok Shop — ufficio virtuale pixel art.',
        start_url: base,
        scope: base,
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'any',
        background_color: '#0b0e1a',
        theme_color: '#0b0e1a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
})
