/**
 * WebSocket server — real-time message delivery, typing indicators, presence.
 *
 * Attached to the same Node HTTP server Fastify uses, so we get one port.
 *
 * Authentication: client sends the session Bearer token in the initial
 * `auth` message; server validates against DB and joins rooms keyed by
 * the user's initiaAddress.
 */
import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'node:http'
import { prisma } from '../lib/prisma.js'
import { setPresence, clearPresence } from '../lib/redis.js'
import { config } from '../config.js'

export type ServerToClientEvents = {
  'message.new': (payload: {
    id: string
    chatId: string
    senderInitiaAddress: string
    recipientInitiaAddress: string
    ciphertextBase64: string
    senderSignatureBase64: string
    createdAt: string
  }) => void
  'message.typing': (payload: { chatId: string; from: string; isTyping: boolean }) => void
  'presence.update': (payload: { initiaAddress: string; status: 'online' | 'offline' }) => void
  'payment.received': (payload: {
    chatId: string
    from: string
    to: string
    amount: string
    denom: string
    memo: string
    txHash: string
  }) => void
  'tip.received': (payload: {
    creator: string
    tipper: string
    amount: string
    denom: string
    message: string
    txHash: string
  }) => void
  'auth.ok': (payload: { userId: string; initiaAddress: string }) => void
  'auth.error': (payload: { reason: string }) => void
}

export type ClientToServerEvents = {
  auth: (payload: { token: string }) => void
  'message.typing': (payload: { chatId: string; isTyping: boolean; recipientAddress: string }) => void
  heartbeat: () => void
}

export function attachWebSocket(httpServer: HTTPServer): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents
> {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: config.CORS_ORIGINS, credentials: true },
    transports: ['websocket', 'polling'],
    pingInterval: 20_000,
    pingTimeout: 30_000,
  })

  io.on('connection', (socket) => {
    let authenticatedAddress: string | null = null

    socket.on('auth', async ({ token }) => {
      const session = await prisma.authSession.findUnique({
        where: { token },
        include: { user: true },
      })
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        socket.emit('auth.error', { reason: 'invalid_or_expired_token' })
        socket.disconnect(true)
        return
      }
      authenticatedAddress = session.user.initiaAddress
      await socket.join(`user:${authenticatedAddress}`)
      await setPresence(authenticatedAddress)
      socket.emit('auth.ok', {
        userId: session.user.id,
        initiaAddress: session.user.initiaAddress,
      })
      io.emit('presence.update', { initiaAddress: authenticatedAddress, status: 'online' })
    })

    socket.on('message.typing', async ({ chatId, isTyping, recipientAddress }) => {
      if (!authenticatedAddress) return
      io.to(`user:${recipientAddress}`).emit('message.typing', {
        chatId,
        from: authenticatedAddress,
        isTyping,
      })
    })

    socket.on('heartbeat', async () => {
      if (authenticatedAddress) await setPresence(authenticatedAddress)
    })

    socket.on('disconnect', async () => {
      if (authenticatedAddress) {
        await clearPresence(authenticatedAddress)
        io.emit('presence.update', { initiaAddress: authenticatedAddress, status: 'offline' })
      }
    })
  })

  return io
}
