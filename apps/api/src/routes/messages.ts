/**
 * Message routes.
 *
 * Backend NEVER decrypts. We store sealed blobs only.
 * Client-side encryption uses libsodium sealed box with recipient's X25519 pubkey,
 * which is stored on-chain in profile_registry.encryption_pubkey.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { firePushToUser } from '../services/webPush.js'

const MAX_CIPHERTEXT_BYTES = 8192 // ~4KB plaintext after sealed-box overhead

const PostMessageRequest = z.object({
  chatId: z.string().min(1).max(128),
  recipientInitiaAddress: z.string().regex(/^init1[a-z0-9]+$/),
  ciphertextBase64: z.string().min(1),
  /** Optional second ciphertext encrypted to the sender's own X25519 pubkey
   *  so the sender can read their own history after reload / on a second
   *  device that shares the same wallet. */
  senderCiphertextBase64: z.string().min(1).optional(),
  senderSignatureBase64: z.string().min(1),
  expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
})

const FetchMessagesQuery = z.object({
  chatId: z.string().min(1).max(128),
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  // --- POST /v1/messages ---
  app.post('/v1/messages', async (request, reply) => {
    const parsed = PostMessageRequest.safeParse(request.body)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.issues })
      return
    }

    const {
      chatId,
      recipientInitiaAddress,
      ciphertextBase64,
      senderCiphertextBase64,
      senderSignatureBase64,
      expiresInHours,
    } = parsed.data
    const sender = request.user!

    const ciphertext = Buffer.from(ciphertextBase64, 'base64')
    if (ciphertext.length > MAX_CIPHERTEXT_BYTES) {
      await reply.status(413).send({ error: 'CIPHERTEXT_TOO_LARGE' })
      return
    }
    const senderCiphertext = senderCiphertextBase64
      ? Buffer.from(senderCiphertextBase64, 'base64')
      : null
    if (senderCiphertext && senderCiphertext.length > MAX_CIPHERTEXT_BYTES) {
      await reply.status(413).send({ error: 'CIPHERTEXT_TOO_LARGE' })
      return
    }
    const senderSignature = Buffer.from(senderSignatureBase64, 'base64')

    const recipient = await prisma.user.findUnique({
      where: { initiaAddress: recipientInitiaAddress },
    })
    if (!recipient) {
      await reply.status(404).send({ error: 'RECIPIENT_NOT_FOUND' })
      return
    }

    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3_600_000) : null

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: sender.id,
        recipientId: recipient.id,
        ciphertext,
        senderCiphertext,
        senderSignature,
        expiresAt,
      },
    })

    // Real-time push to recipient if connected.
    // In serverless deployments (Vercel) there's no Socket.IO server attached,
    // so `app.io` is undefined — we skip cleanly. Persisted message remains
    // deliverable when the recipient next opens the chat. Shipment 2 will
    // replace this with Supabase Realtime broadcast.
    if (app.io) {
      try {
        app.io.to(`user:${recipient.initiaAddress}`).emit('message.new', {
          id: message.id,
          chatId,
          senderInitiaAddress: sender.initiaAddress,
          recipientInitiaAddress: recipient.initiaAddress,
          ciphertextBase64,
          senderSignatureBase64,
          createdAt: message.createdAt.toISOString(),
        })
      } catch (err) {
        request.log.warn({ err }, 'ws push failed — message stored but not broadcast')
      }
    }

    // Fire a Web Push notification if the recipient isn't connected.
    firePushToUser(
      recipient.id,
      {
        title: sender.initName ?? 'New message',
        body: 'Tap to open',
        url: `/chat/${encodeURIComponent(sender.initName ?? sender.initiaAddress)}`,
        tag: `chat:${chatId}`,
      },
      { skipIfOnline: true, onlineInitiaAddress: recipient.initiaAddress },
    )

    await reply.status(201).send({
      id: message.id,
      chatId,
      createdAt: message.createdAt.toISOString(),
    })
  })

  // --- GET /v1/messages/:chatId ---
  app.get('/v1/messages/:chatId', async (request, reply) => {
    const parsed = FetchMessagesQuery.safeParse({
      chatId: (request.params as { chatId: string }).chatId,
      ...(request.query as Record<string, string>),
    })
    if (!parsed.success) {
      await reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.issues })
      return
    }
    const { chatId, before, limit } = parsed.data
    const user = request.user!

    // Only return messages where this user is sender OR recipient.
    // Include counterparty addresses so the client can derive direction without
    // another round trip.
    const messages = await prisma.message.findMany({
      where: {
        chatId,
        OR: [{ senderId: user.id }, { recipientId: user.id }],
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { initiaAddress: true } },
        recipient: { select: { initiaAddress: true } },
      },
    })

    await reply.send({
      messages: messages.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        senderId: m.senderId,
        recipientId: m.recipientId,
        senderInitiaAddress: m.sender.initiaAddress,
        recipientInitiaAddress: m.recipient.initiaAddress,
        ciphertextBase64: Buffer.from(m.ciphertext).toString('base64'),
        senderCiphertextBase64: m.senderCiphertext
          ? Buffer.from(m.senderCiphertext).toString('base64')
          : null,
        senderSignatureBase64: Buffer.from(m.senderSignature).toString('base64'),
        createdAt: m.createdAt.toISOString(),
        deliveredAt: m.deliveredAt?.toISOString() ?? null,
        readAt: m.readAt?.toISOString() ?? null,
      })),
    })
  })

  // --- POST /v1/messages/:id/read ---
  app.post('/v1/messages/:id/read', async (request, reply) => {
    const id = (request.params as { id: string }).id
    const user = request.user!
    const msg = await prisma.message.findUnique({ where: { id } })
    if (!msg || msg.recipientId !== user.id) {
      await reply.status(404).send({ error: 'NOT_FOUND' })
      return
    }
    await prisma.message.update({
      where: { id },
      data: { readAt: new Date() },
    })
    await reply.status(204).send()
  })
}
