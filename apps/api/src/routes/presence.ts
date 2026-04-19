/**
 * Presence routes — batch online/offline query for N addresses.
 *
 *   POST /v1/presence  { addresses: string[] } → { online: string[] }
 *
 * Used by the chat list to render a green dot next to online counterparties.
 * The source of truth is the Redis `presence:<initiaAddress>` key maintained
 * by the WebSocket heartbeat handler (see apps/api/src/websocket/index.ts).
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { redis } from '../lib/redis.js'
import { requireAuth } from '../middleware/auth.js'

const BECH32_RE = /^init1[a-z0-9]+$/
const BatchBody = z.object({
  addresses: z.array(z.string().regex(BECH32_RE)).min(1).max(200),
})

export async function presenceRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/presence', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = BatchBody.safeParse(request.body)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'VALIDATION_ERROR' })
      return
    }
    const keys = parsed.data.addresses.map((a) => `presence:${a}`)
    const results = await redis.mget(...keys)
    const online = parsed.data.addresses.filter((_, i) => results[i] !== null)
    await reply.send({ online })
  })
}
