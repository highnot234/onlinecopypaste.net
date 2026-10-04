// @ts-check

/**
 * next.config.js
 *
 * Uses @ducanh2912/next-pwa (Next.js 13+ App Router compatible fork of next-pwa).
 *
 * Why not next-pwa 5.x?
 * next-pwa 5.6.0 injects its SW registration script into the Pages Router
 * webpack entry (main.js). This pulls in Next.js's legacy head-manager.js into
 * the App Router client bundle. That head-manager runs on load, finds no Pages
 * Router <Head> title, and calls document.title = "", causing React hydration
 * error #418. @ducanh2912/next-pwa injects into the App Router entry instead,
 * eliminating the Pages Router contamination entirely.
 */

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable in development — service workers interfere with hot reload.
  // The "[PWA] PWA support is disabled" log in dev mode is expected and harmless.
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    // Never cache API routes or the app workspace — they contain live session
    // data that must never be served from a stale cache.
    runtimeCaching: [
      {
        // API routes: always go to network, never cache
        urlPattern: /^https?:\/\/[^/]+\/api\//,
        handler: 'NetworkOnly',
      },
      {
        // /app workspace page: always go to network
        urlPattern: /^https?:\/\/[^/]+\/app(\?.*)?$/,
        handler: 'NetworkOnly',
      },
      {
        // /join/* (pairing pages): always go to network
        urlPattern: /^https?:\/\/[^/]+\/join\//,
        handler: 'NetworkOnly',
      },
      {
        // Everything else (static pages, assets): NetworkFirst with a 24h cache.
        // App shell remains usable offline after first visit.
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'ocp-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "connect-src 'self' wss: ws: https://stun.l.google.com:19302 https://stun.cloudflare.com:3478",
              "frame-src 'none'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
