/**
 * Sponsored onboarding routes.
 *
 *   POST /sponsor/seed        — tiny INIT grant so the user can send their first tx
 *   POST /sponsor/username    — fund the `.init` registration fee on their behalf
 *   GET  /sponsor/status      — is sponsorship on right now? (frontend feature-flag)
 *
 * All three mutating calls require a valid session — we're not an open faucet.
 * The service layer handles budget + per-IP cooldown.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { seedPayment, sponsorUsername } from '../services/sponsor.js'
import { config } from '../config.js'

const SeedSchema = z.object({
  address: z.string().regex(/^init1[a-z0-9]{38,}$/i),
})

const UsernameSchema = z.object({
  address: z.string().regex(/^init1[a-z0-9]{38,}$/i),
  name: z.string().regex(/^[a-z0-9_-]{3,24}$/i),
})

function clientIp(req: FastifyRequest): string {
  // Fastify normalises x-forwarded-for when trustProxy is on; fall back to
  // the raw socket. We only use this for rate limiting, not for security.
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.ip ??
    'unknown'
  )
}

export async function sponsorRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/sponsor/status', async () => ({
    enabled: config.SPONSOR_ENABLED,
    seedAmountUmin: config.SPONSOR_SEED_AMOUNT_UMIN,
    usernameFeeUmin: config.SPONSOR_USERNAME_FEE_UMIN,
  }))

  app.post('/v1/sponsor/seed', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = SeedSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_BODY' })

    // Sanity check: only fund the authenticated caller's own wallet. Stops
    // "sponsor my second wallet with your budget" griefing.
    if (!req.user || req.user.initiaAddress !== parsed.data.address) {
      return reply.status(403).send({ error: 'ADDRESS_MISMATCH' })
    }

    try {
      const result = await seedPayment(parsed.data.address, clientIp(req))
      if (!result.decision.ok) {
        return reply.status(429).send({ error: result.decision.reason })
      }
      return { ok: true, txHash: result.txHash ?? null }
    } catch (err) {
      req.log.error({ err }, 'sponsor seed failed')
      return reply.status(502).send({ error: 'CHAIN_ERROR' })
    }
  })

  app.post('/v1/sponsor/username', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = UsernameSchema.safeParse(req.body)
    if (!parsed.success) return reply.status(400).send({ error: 'INVALID_BODY' })

    if (!req.user || req.user.initiaAddress !== parsed.data.address) {
      return reply.status(403).send({ error: 'ADDRESS_MISMATCH' })
    }

    try {
      const result = await sponsorUsername(parsed.data.address, parsed.data.name, clientIp(req))
      if (!result.decision.ok) {
        return reply.status(429).send({ error: result.decision.reason })
      }
      return { ok: true, txHash: result.txHash ?? null }
    } catch (err) {
      req.log.error({ err }, 'sponsor username failed')
      return reply.status(502).send({ error: 'CHAIN_ERROR' })
    }
  })
}
