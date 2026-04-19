/**
 * Web Push dispatcher — sends VAPID-authenticated notifications to offline
 * recipients. Handles the standard "gone" + quota cleanup semantics.
 */
import webpush from 'web-push'
import { prisma } from '../lib/prisma.js'
import { redis } from '../lib/redis.js'
import { config } from '../config.js'

let initialized = false
function ensureInitialized(): void {
  if (initialized) return
  webpush.setVapidDetails(
    config.VAPID_SUBJECT,
    config.VAPID_PUBLIC_KEY,
    config.VAPID_PRIVATE_KEY,
  )
  initialized = true
}

type NotificationPayload = {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
}

/**
 * Send a notification to every active subscription for `userId`.
 * Returns the count of successful sends. Subscriptions that return
 * 404 / 410 (gone) are deleted.
 */
export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload,
  options: { skipIfOnline?: boolean; onlineInitiaAddress?: string } = {},
): Promise<number> {
  ensureInitialized()

  if (options.skipIfOnline && options.onlineInitiaAddress) {
    const presence = await redis.get(`presence:${options.onlineInitiaAddress}`)
    if (presence) return 0 // user is online via WS — skip push
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return 0

  const body = JSON.stringify(payload)
  let sent = 0

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
          },
          body,
          { TTL: 86400, urgency: 'normal' },
        )
        sent++
        // Touch lastUsedAt so we can eventually prune stale subscriptions.
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {})
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          return
        }
        // Other errors: log but don't fail the batch.
        // eslint-disable-next-line no-console
        console.warn('[webpush] send failed', {
          endpoint: sub.endpoint,
          statusCode,
          message: (err as Error).message,
        })
      }
    }),
  )

  return sent
}

/**
 * Fire-and-forget helper used by hot paths that don't want to await the push.
 */
export function firePushToUser(
  userId: string,
  payload: NotificationPayload,
  options?: { skipIfOnline?: boolean; onlineInitiaAddress?: string },
): void {
  void sendPushToUser(userId, payload, options).catch(() => {
    /* swallowed — failures are logged inside sendPushToUser */
  })
}
