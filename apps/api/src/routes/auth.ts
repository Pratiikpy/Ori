/**
 * Auth routes — EIP-191 challenge/verify flow.
 *
 *   POST /v1/auth/challenge  → { challenge, nonce, expiresAt }
 *   POST /v1/auth/verify     → { token, expiresAt, user }
 *   POST /v1/auth/logout     (Bearer) → 204
 *   GET  /v1/auth/me         (Bearer) → { user }
 *
 * The challenge is a canonical, human-readable string containing a random nonce
 * and expiry. Client signs it via wagmi `signMessage` (EIP-191 personal_sign).
 * Server verifies via ethers.verifyMessage.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { redis } from '../lib/redis.js'
import { config } from '../config.js'
import { verifySignature, buildChallengeMessage } from '../lib/verifySignature.js'
import { resolveAddressToName } from '../lib/initiaClient.js'
import { requireAuth } from '../middleware/auth.js'

const CHALLENGE_TTL_SECONDS = 300

const BECH32_RE = /^init1[a-z0-9]+$/
const HEX_RE = /^0x[a-fA-F0-9]{40}$/
const HEX_SIGNATURE_RE = /^0x[a-fA-F0-9]+$/

const ChallengeRequest = z.object({
  initiaAddress: z.string().regex(BECH32_RE, 'invalid bech32 address'),
})

const VerifyRequest = z.object({
  initiaAddress: z.string().regex(BECH32_RE),
  hexAddress: z.string().regex(HEX_RE),
  nonce: z.string().regex(/^[a-fA-F0-9]{64}$/, 'nonce must be 32 hex bytes'),
  signature: z.string().regex(HEX_SIGNATURE_RE, 'signature must be hex'),
})

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ─── POST /v1/auth/challenge ───
  app.post('/v1/auth/challenge', async (request, reply) => {
    const parsed = ChallengeRequest.safeParse(request.body)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.issues })
      return
    }

    const { initiaAddress } = parsed.data

    // If a live nonce already exists for this address, reuse it. Prevents the
    // common "user double-clicks sign-in" race where the first nonce gets
    // overwritten just before the first signature comes back.
    const existing = await redis.get(`auth:challenge:by-addr:${initiaAddress}`)
    if (existing) {
      const stored = JSON.parse(existing) as { nonce: string; expiresAt: string }
      if (new Date(stored.expiresAt) > new Date()) {
        await reply.send({
          nonce: stored.nonce,
          challenge: buildChallengeMessage(stored.nonce, stored.expiresAt),
          expiresAt: stored.expiresAt,
        })
        return
      }
    }

    const nonce = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000)
    const expiresAtIso = expiresAt.toISOString()

    const record = JSON.stringify({ initiaAddress, nonce, expiresAt: expiresAtIso })
    await Promise.all([
      redis.set(`auth:challenge:${nonce}`, record, 'EX', CHALLENGE_TTL_SECONDS),
      redis.set(
        `auth:challenge:by-addr:${initiaAddress}`,
        JSON.stringify({ nonce, expiresAt: expiresAtIso }),
        'EX',
        CHALLENGE_TTL_SECONDS,
      ),
    ])

    await reply.send({
      nonce,
      challenge: buildChallengeMessage(nonce, expiresAtIso),
      expiresAt: expiresAtIso,
    })
  })

  // ─── POST /v1/auth/verify ───
  app.post('/v1/auth/verify', async (request, reply) => {
    const parsed = VerifyRequest.safeParse(request.body)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.issues })
      return
    }

    const { initiaAddress, hexAddress, nonce, signature } = parsed.data

    const raw = await redis.get(`auth:challenge:${nonce}`)
    if (!raw) {
      await reply.status(401).send({ error: 'CHALLENGE_NOT_FOUND_OR_EXPIRED' })
      return
    }
    const stored = JSON.parse(raw) as { initiaAddress: string; nonce: string; expiresAt: string }
    if (stored.initiaAddress !== initiaAddress) {
      await reply.status(401).send({ error: 'ADDRESS_MISMATCH' })
      return
    }

    const message = buildChallengeMessage(stored.nonce, stored.expiresAt)
    const result = verifySignature({ message, initiaAddress, signature })
    if (!result.valid) {
      request.log.warn({ initiaAddress, reason: result.reason }, 'signature verification failed')
      await reply.status(401).send({ error: 'SIGNATURE_INVALID', reason: result.reason })
      return
    }

    if (result.recoveredHexAddress !== hexAddress.toLowerCase()) {
      await reply.status(401).send({ error: 'HEX_ADDRESS_MISMATCH' })
      return
    }

    // Single-use nonce.
    await Promise.all([
      redis.del(`auth:challenge:${nonce}`),
      redis.del(`auth:challenge:by-addr:${initiaAddress}`),
    ])

    // Best-effort reverse resolve .init.
    let initName: string | null = null
    try {
      initName = await resolveAddressToName(initiaAddress)
    } catch {
      /* non-fatal: network / not registered */
    }

    const user = await prisma.user.upsert({
      where: { initiaAddress },
      update: {
        hexAddress: hexAddress.toLowerCase(),
        initName,
        lastSeenAt: new Date(),
      },
      create: {
        initiaAddress,
        hexAddress: hexAddress.toLowerCase(),
        initName,
      },
    })

    const token = randomBytes(32).toString('hex')
    const sessionExpiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 3_600_000)

    await prisma.authSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt: sessionExpiresAt,
        userAgent: request.headers['user-agent']?.slice(0, 500) ?? null,
      },
    })

    await reply.send({
      token,
      expiresAt: sessionExpiresAt.toISOString(),
      user: {
        id: user.id,
        initiaAddress: user.initiaAddress,
        hexAddress: user.hexAddress,
        initName: user.initName,
      },
    })
  })

  // ─── GET /v1/auth/me ───
  app.get('/v1/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const u = request.user!
    await reply.send({
      user: {
        id: u.id,
        initiaAddress: u.initiaAddress,
        hexAddress: u.hexAddress,
        initName: u.initName,
      },
    })
  })

  // ─── POST /v1/auth/logout ───
  app.post('/v1/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    if (request.authSessionId) {
      await prisma.authSession.update({
        where: { id: request.authSessionId },
        data: { revokedAt: new Date() },
      })
    }
    await reply.status(204).send()
  })
}
