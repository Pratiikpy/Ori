/**
 * Discover routes — entry points for "who's interesting on Ori?"
 *
 *   GET /v1/discover/recent       → most-recently-active profiles
 *   GET /v1/discover/top-creators → creators ranked by tips received
 *   GET /v1/discover/rising       → last-24h payment velocity leaders
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const LimitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function discoverRoutes(app: FastifyInstance): Promise<void> {
  // Profiles recently active (any inbound/outbound event).
  app.get('/v1/discover/recent', async (request, reply) => {
    const q = LimitQuery.safeParse(request.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }
    const rows = await prisma.userStats.findMany({
      orderBy: { lastActiveAt: 'desc' },
      take: q.data.limit,
    })
    const cache = await prisma.profileCache.findMany({
      where: { address: { in: rows.map((r) => r.address) } },
    })
    const cacheMap = new Map(cache.map((c) => [c.address, c]))
    await reply.send({
      entries: rows.map((r) => ({
        address: r.address,
        initName: cacheMap.get(r.address)?.initName ?? null,
        bio: cacheMap.get(r.address)?.bio ?? '',
        avatarUrl: cacheMap.get(r.address)?.avatarUrl ?? '',
        lastActiveAt: r.lastActiveAt.toISOString(),
        paymentsSent: r.paymentsSent,
        tipsReceived: r.tipsReceived,
      })),
    })
  })

  // Top creators — lift-and-shift from leaderboard, but also includes bio +
  // avatar so the discover page can render rich cards in one call.
  app.get('/v1/discover/top-creators', async (request, reply) => {
    const q = LimitQuery.safeParse(request.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }
    const rows = await prisma.userStats.findMany({
      where: { tipsReceivedVolume: { gt: 0n } },
      orderBy: { tipsReceivedVolume: 'desc' },
      take: q.data.limit,
    })
    const cache = await prisma.profileCache.findMany({
      where: { address: { in: rows.map((r) => r.address) } },
    })
    const cacheMap = new Map(cache.map((c) => [c.address, c]))
    await reply.send({
      entries: rows.map((r) => ({
        address: r.address,
        initName: cacheMap.get(r.address)?.initName ?? null,
        bio: cacheMap.get(r.address)?.bio ?? '',
        avatarUrl: cacheMap.get(r.address)?.avatarUrl ?? '',
        tipsReceived: r.tipsReceived,
        tipsReceivedVolume: r.tipsReceivedVolume.toString(),
      })),
    })
  })

  // 24h "rising" — most payment events in the last day. Uses a windowed count
  // over the PaymentEvent table; fine up to ~1M events, then we'd cache.
  app.get('/v1/discover/rising', async (request, reply) => {
    const q = LimitQuery.safeParse(request.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const grouped = await prisma.paymentEvent.groupBy({
      by: ['toAddr'],
      where: { createdAt: { gt: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: q.data.limit,
    })
    const addresses = grouped.map((g) => g.toAddr)
    const cache = await prisma.profileCache.findMany({
      where: { address: { in: addresses } },
    })
    const cacheMap = new Map(cache.map((c) => [c.address, c]))
    await reply.send({
      window: '24h',
      entries: grouped.map((g) => ({
        address: g.toAddr,
        initName: cacheMap.get(g.toAddr)?.initName ?? null,
        bio: cacheMap.get(g.toAddr)?.bio ?? '',
        avatarUrl: cacheMap.get(g.toAddr)?.avatarUrl ?? '',
        paymentsReceived24h: g._count.id,
      })),
    })
  })
}
