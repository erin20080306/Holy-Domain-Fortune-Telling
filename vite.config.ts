import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// MYSTIC PWA build config. Service worker precaches the app shell and
// explicitly refuses to cache any private / API / auth / payment routes.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: false, // we ship a hand-written public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Large decorative art (引路人) is served via the runtime image cache
        // below instead of being precached in the app shell.
        globIgnores: [
          '**/guide.png',
          '**/guide.webp',
          '**/DashboardScreen-*.js',
        ],
        // Always take control of the page and purge stale precaches so a new
        // deployment applies immediately without a manual update prompt.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /^\/admin\//,
          /^\/payments\//,
          /^\/paypal\//,
        ],
        runtimeCaching: [
          {
            // Never cache private / dynamic endpoints.
            urlPattern:
              /^https?:\/\/[^/]+\/(api|auth|admin|payments|paypal)\//,
            handler: 'NetworkOnly',
          },
          {
            // Large route chunks are downloaded only when the user enters the
            // feature area, then kept for future PWA/offline use.
            urlPattern: ({ request, url }) =>
              request.destination === 'script' && url.pathname.startsWith('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mystic-route-scripts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Serve images from cache for speed but revalidate in the
            // background, so an updated asset (e.g. guide art) refreshes
            // itself instead of being stuck on a stale/broken copy.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mystic-images',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    target: 'es2019',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'api/**/*.test.ts'],
  },
});
