/**
 * Payment-link routes — the viral onboarding loop.
 *
 * Flow:
 *   Create a link gift (on-chain): client calls gift_packet::create_link_gift with secret_hash.
 *   Client then POSTs /v1/links to register the off-chain metadata.
 *
 *   Recipient lands on ori.chat/claim/<shortCode>#<secret>.
 *   GET /v1/links/:shortCode returns preview data (amount, theme, sender).
 *   Recipient onboards if needed, then calls gift_packet::claim_link_gift with the secret.
 *   POST /v1/links/:shortCode/mark-claimed updates off-chain state.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const LINK_TTL_DAYS = 7
const SHORT_CODE_LENGTH = 8

const CreateLinkRequest = z.object({
  amount: z.string().regex(/^\d+$/, 'amount must be a positive integer string'),
  denom: z.string().min(1),
  theme: z.number().int().min(0).max(4),
  message: z.string().max(280).default(''),
  secretHashHex: z.string().regex(/^[a-fA-F0-9]{64}$/, 'must be sha256 hash hex'),
  onChainGiftId: z.string().optional(),
})

const MarkClaimedRequest = z.object({
  claimedByAddress: z.string().regex(/^init1[a-z0-9]+$/),
})

export async function linkRoutes(app: FastifyInstance): Promise<void> {
  // --- POST /v1/links (auth required) ---
  app.post('/v1/links', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = CreateLinkRequest.safeParse(request.body)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.issues })
      return
    }
    const creator = request.user!
    const { amount, denom, theme, message, secretHashHex, onChainGiftId } = parsed.data

    const shortCode = generateShortCode()
    const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 3_600_000)

    const link = await prisma.paymentLink.create({
      data: {
        shortCode,
        creatorId: creator.id,
        secretHashHex,
        amount: BigInt(amount),
        denom,
        theme,
        message,
        onChainGiftId: onChainGiftId ?? null,
        expiresAt,
      },
    })

    await reply.status(201).send({
      shortCode: link.shortCode,
      expiresAt: link.expiresAt.toISOString(),
    })
  })

  // --- GET /v1/links/:shortCode (public) ---
  app.get('/v1/links/:shortCode', async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string }
    const link = await prisma.paymentLink.findUnique({
      where: { shortCode },
      include: { creator: true },
    })
    if (!link) {
      await reply.status(404).send({ error: 'LINK_NOT_FOUND' })
      return
    }
    if (link.expiresAt < new Date()) {
      await reply.status(410).send({ error: 'LINK_EXPIRED' })
      return
    }

    await reply.send({
      shortCode: link.shortCode,
      amount: link.amount.toString(),
      denom: link.denom,
      theme: link.theme,
      message: link.message,
      claimed: link.claimed,
      expiresAt: link.expiresAt.toISOString(),
      creator: {
        initiaAddress: link.creator.initiaAddress,
        initName: link.creator.initName,
      },
      onChainGiftId: link.onChainGiftId,
    })
  })

  // --- PATCH /v1/links/:shortCode/onchain-gift-id (auth required; creator only) ---
  // Called by the event-listener service (or the creator's client after tx
  // confirmation) to pin the on-chain gift_id to the off-chain short code.
  app.patch('/v1/links/:shortCode/onchain-gift-id', { preHandler: requireAuth }, async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string }
    const body = request.body as { onChainGiftId?: string }
    if (!body?.onChainGiftId || !/^\d+$/.test(body.onChainGiftId)) {
      await reply.status(400).send({ error: 'VALIDATION_ERROR' })
      return
    }
    const link = await prisma.paymentLink.findUnique({ where: { shortCode } })
    if (!link) {
      await reply.status(404).send({ error: 'LINK_NOT_FOUND' })
      return
    }
    if (link.creatorId !== request.user!.id) {
      await reply.status(403).send({ error: 'NOT_CREATOR' })
      return
    }
    await prisma.paymentLink.update({
      where: { shortCode },
      data: { onChainGiftId: body.onChainGiftId },
    })
    await reply.status(204).send()
  })

  // --- POST /v1/links/:shortCode/mark-claimed (auth required; idempotent) ---
  app.post('/v1/links/:shortCode/mark-claimed', { preHandler: requireAuth }, async (request, reply) => {
    const { shortCode } = request.params as { shortCode: string }
    const parsed = MarkClaimedRequest.safeParse(request.body)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.issues })
      return
    }

    const link = await prisma.paymentLink.findUnique({ where: { shortCode } })
    if (!link) {
      await reply.status(404).send({ error: 'LINK_NOT_FOUND' })
      return
    }
    if (link.claimed) {
      await reply.send({ ok: true, alreadyClaimed: true })
      return
    }

    await prisma.paymentLink.update({
      where: { shortCode },
      data: {
        claimed: true,
        claimedByAddress: parsed.data.claimedByAddress,
        claimedAt: new Date(),
      },
    })
    await reply.send({ ok: true })
  })
}

function generateShortCode(): string {
  // URL-safe alphabet: 26 lowercase + 10 digits − ambiguous 0,o,l,1 → 32 chars
  const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = randomBytes(SHORT_CODE_LENGTH)
  let out = ''
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return out
}
