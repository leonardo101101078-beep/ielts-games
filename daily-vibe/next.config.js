const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Directory containing index.ts (or src/index.ts) for push + notificationclick.
  // Must be a folder path — not worker/index.ts (see @ducanh2912/next-pwa buildCustomWorker).
  customWorkerSrc: 'worker',
  reloadOnOnline: true,
  // App Router + aggressive nav caching can serve stale/empty shells → blank white page.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  runtimeCaching: [
    {
      // Cache Supabase REST API calls with NetworkFirst strategy
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
