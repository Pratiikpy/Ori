/**
 * Leaderboard routes — ranked lists powered by the indexed event tables.
 *
 * All amounts returned are u64 base units as decimal strings to preserve
 * precision through JSON. The client converts based on denom metadata.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const AddressParam = z.string().regex(/^init1[a-z0-9]+$/)

const LimitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  // ─── GET /v1/leaderboards/top-creators ───
  // Creators ordered by tips-received volume.
  app.get('/v1/leaderboards/top-creators', async (request, reply) => {
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
      entries: rows.map((r, idx) => ({
        rank: idx + 1,
        address: r.address,
        initName: cacheMap.get(r.address)?.initName ?? null,
        avatarUrl: cacheMap.get(r.address)?.avatarUrl ?? '',
        tipsReceived: r.tipsReceived,
        tipsReceivedVolume: r.tipsReceivedVolume.toString(),
      })),
    })
  })

  // ─── GET /v1/leaderboards/top-tippers ───
  // Tippers ordered by volume given (supports the creator by tipping the most).
  app.get('/v1/leaderboards/top-tippers', async (request, reply) => {
    const q = LimitQuery.safeParse(request.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }
    const rows = await prisma.userStats.findMany({
      where: { tipsGivenVolume: { gt: 0n } },
      orderBy: { tipsGivenVolume: 'desc' },
      take: q.data.limit,
    })
    const cache = await prisma.profileCache.findMany({
      where: { address: { in: rows.map((r) => r.address) } },
    })
    const cacheMap = new Map(cache.map((c) => [c.address, c]))
    await reply.send({
      entries: rows.map((r, idx) => ({
        rank: idx + 1,
        address: r.address,
        initName: cacheMap.get(r.address)?.initName ?? null,
        avatarUrl: cacheMap.get(r.address)?.avatarUrl ?? '',
        tipsGiven: r.tipsGiven,
        tipsGivenVolume: r.tipsGivenVolume.toString(),
      })),
    })
  })

  // ─── GET /v1/profiles/:address/top-tippers ───
  // Top tippers for a specific creator — who supports them the most.
  app.get('/v1/profiles/:address/top-tippers', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const q = LimitQuery.safeParse(request.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }
    const creator = parsed.data

    // Aggregate tips per tipper for this creator. We use raw `groupBy` since
    // we want SUM over BigInt fields; Prisma groupBy handles this.
    const grouped = await prisma.tipEvent.groupBy({
      by: ['tipperAddr'],
      where: { creatorAddr: creator },
      _sum: { grossAmount: true },
      _count: { id: true },
      orderBy: { _sum: { grossAmount: 'desc' } },
      take: q.data.limit,
    })

    const addresses = grouped.map((g) => g.tipperAddr)
    const cache = await prisma.profileCache.findMany({
      where: { address: { in: addresses } },
    })
    const cacheMap = new Map(cache.map((c) => [c.address, c]))

    await reply.send({
      address: creator,
      entries: grouped.map((g, idx) => ({
        rank: idx + 1,
        address: g.tipperAddr,
        initName: cacheMap.get(g.tipperAddr)?.initName ?? null,
        avatarUrl: cacheMap.get(g.tipperAddr)?.avatarUrl ?? '',
        tipCount: g._count.id,
        volume: (g._sum.grossAmount ?? 0n).toString(),
      })),
    })
  })

  // ─── GET /v1/leaderboards/global-stats ───
  app.get('/v1/leaderboards/global-stats', async (_request, reply) => {
    const [totalUsers, totalPayments, totalTips, totalTipVolume] = await Promise.all([
      prisma.userStats.count(),
      prisma.paymentEvent.count(),
      prisma.tipEvent.count(),
      prisma.tipEvent.aggregate({ _sum: { grossAmount: true } }),
    ])
    await reply.send({
      totalUsers,
      totalPayments,
      totalTips,
      totalTipVolume: (totalTipVolume._sum.grossAmount ?? 0n).toString(),
    })
  })
}
