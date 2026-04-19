/**
 * Web Push subscription management.
 *
 *   POST   /v1/push/subscribe      (Bearer) — register a new PushSubscription
 *   DELETE /v1/push/subscribe      (Bearer) — unregister by endpoint
 *   GET    /v1/push/vapid-key                — public VAPID key (no auth)
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'
import { requireAuth } from '../middleware/auth.js'

const SubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const UnsubscribeBody = z.object({
  endpoint: z.string().url(),
})

export async function pushRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/push/vapid-key', async (_req, reply) => {
    await reply.send({ publicKey: config.VAPID_PUBLIC_KEY })
  })

  app.post(
    '/v1/push/subscribe',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = SubscribeBody.safeParse(request.body)
      if (!parsed.success) {
        await reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.issues })
        return
      }
      const user = request.user!
      const { endpoint, keys } = parsed.data

      await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          userId: user.id,
          p256dhKey: keys.p256dh,
          authKey: keys.auth,
          lastUsedAt: new Date(),
        },
        create: {
          userId: user.id,
          endpoint,
          p256dhKey: keys.p256dh,
          authKey: keys.auth,
        },
      })
      await reply.status(204).send()
    },
  )

  app.delete(
    '/v1/push/subscribe',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = UnsubscribeBody.safeParse(request.body)
      if (!parsed.success) {
        await reply.status(400).send({ error: 'VALIDATION_ERROR' })
        return
      }
      const user = request.user!
      await prisma.pushSubscription
        .deleteMany({ where: { endpoint: parsed.data.endpoint, userId: user.id } })
        .catch(() => {})
      await reply.status(204).send()
    },
  )
}
