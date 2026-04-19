/**
 * requireAuth — Bearer token middleware (Fastify preHandler hook).
 *
 * Pattern adapted from iUSD Pay's requireAuth.ts: verify DB-backed session token,
 * attach user identity to request. Revocable (unlike pure JWT) at the cost of
 * one DB hit per authed request.
 */
import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'

// Augment the Fastify request type so downstream handlers can access req.user.
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      initiaAddress: string
      hexAddress: string
      initName: string | null
    }
    authSessionId?: string
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    await reply.status(401).send({ error: 'MISSING_AUTH', message: 'Authorization required' })
    return
  }

  const token = authHeader.slice(7)
  const session = await prisma.authSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.revokedAt) {
    await reply.status(401).send({ error: 'INVALID_TOKEN' })
    return
  }
  if (session.expiresAt < new Date()) {
    await reply.status(401).send({ error: 'SESSION_EXPIRED' })
    return
  }

  request.user = {
    id: session.user.id,
    initiaAddress: session.user.initiaAddress,
    hexAddress: session.user.hexAddress,
    initName: session.user.initName,
  }
  request.authSessionId = session.id
}
