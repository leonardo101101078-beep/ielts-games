// =============================================================================
// DailyVibe — web-push Utility
// =============================================================================
// Server-side only. Import only in API routes or Server Actions.
// =============================================================================

import webPush from 'web-push'

// VAPID credentials are set once at module-load time.
// The module is cached by Node.js, so setVapidDetails() runs exactly once.
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/**
 * Sends a Web Push notification to a single subscription.
 *
 * Returns the web-push SendResult on success.
 * Throws if the push service returns a non-2xx status.
 */
export async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload,
): Promise<webPush.SendResult> {
  return webPush.sendNotification(
    { endpoint, keys: { p256dh, auth } },
    JSON.stringify(payload),
    {
      TTL: 60 * 60 * 4, // keep message for 4 hours if device is offline
    },
  )
}

export default webPush
