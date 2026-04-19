/**
 * Activity routes — a unified "what happened" feed per address.
 *
 * Merges TipEvent + PaymentEvent + Follow rows into a single reverse-chron
 * timeline. Each entry includes kind-specific fields so the client renders
 * the right card. Pagination is cursor-based on `createdAt`.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const AddressParam = z.string().regex(/^init1[a-z0-9]+$/)
const ListQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
})

export type ActivityEntry =
  | {
      kind: 'tip'
      id: string
      direction: 'given' | 'received'
      counterparty: string
      amount: string
      denom: string
      message: string
      at: string
    }
  | {
      kind: 'payment'
      id: string
      direction: 'sent' | 'received'
      counterparty: string
      amount: string
      denom: string
      memo: string
      at: string
    }
  | {
      kind: 'follow'
      id: string
      direction: 'started_following' | 'new_follower'
      counterparty: string
      at: string
    }

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/profiles/:address/activity', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const q = ListQuery.safeParse(request.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }

    const addr = parsed.data
    const cursor = q.data.cursor ? new Date(q.data.cursor) : null
    const limit = q.data.limit

    // Fetch up to `limit` from each source, merge, trim. The per-source over-fetch
    // handles the case where one kind dominates the timeline.
    const take = limit
    const createdAtBefore = cursor ? { lt: cursor } : undefined

    const [tipsGiven, tipsReceived, paymentsOut, paymentsIn, follows, followers] =
      await Promise.all([
        prisma.tipEvent.findMany({
          where: { tipperAddr: addr, createdAt: createdAtBefore },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        prisma.tipEvent.findMany({
          where: { creatorAddr: addr, createdAt: createdAtBefore },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        prisma.paymentEvent.findMany({
          where: { fromAddr: addr, createdAt: createdAtBefore },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        prisma.paymentEvent.findMany({
          where: { toAddr: addr, createdAt: createdAtBefore },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        prisma.follow.findMany({
          where: { fromAddr: addr, createdAt: createdAtBefore },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        prisma.follow.findMany({
          where: { toAddr: addr, createdAt: createdAtBefore },
          orderBy: { createdAt: 'desc' },
          take,
        }),
      ])

    const merged: ActivityEntry[] = [
      ...tipsGiven.map<ActivityEntry>((t) => ({
        kind: 'tip',
        id: `tg:${t.id}`,
        direction: 'given',
        counterparty: t.creatorAddr,
        amount: t.grossAmount.toString(),
        denom: t.denom,
        message: t.message,
        at: t.createdAt.toISOString(),
      })),
      ...tipsReceived.map<ActivityEntry>((t) => ({
        kind: 'tip',
        id: `tr:${t.id}`,
        direction: 'received',
        counterparty: t.tipperAddr,
        amount: t.netAmount.toString(),
        denom: t.denom,
        message: t.message,
        at: t.createdAt.toISOString(),
      })),
      ...paymentsOut.map<ActivityEntry>((p) => ({
        kind: 'payment',
        id: `ps:${p.id}`,
        direction: 'sent',
        counterparty: p.toAddr,
        amount: p.amount.toString(),
        denom: p.denom,
        memo: p.memo,
        at: p.createdAt.toISOString(),
      })),
      ...paymentsIn.map<ActivityEntry>((p) => ({
        kind: 'payment',
        id: `pr:${p.id}`,
        direction: 'received',
        counterparty: p.fromAddr,
        amount: p.amount.toString(),
        denom: p.denom,
        memo: p.memo,
        at: p.createdAt.toISOString(),
      })),
      ...follows.map<ActivityEntry>((f) => ({
        kind: 'follow',
        id: `fs:${f.id}`,
        direction: 'started_following',
        counterparty: f.toAddr,
        at: f.createdAt.toISOString(),
      })),
      ...followers.map<ActivityEntry>((f) => ({
        kind: 'follow',
        id: `fn:${f.id}`,
        direction: 'new_follower',
        counterparty: f.fromAddr,
        at: f.createdAt.toISOString(),
      })),
    ]

    merged.sort((a, b) => b.at.localeCompare(a.at))
    const trimmed = merged.slice(0, limit)
    const nextCursor = trimmed.length === limit ? trimmed[trimmed.length - 1]!.at : null

    await reply.send({
      address: addr,
      entries: trimmed,
      nextCursor,
    })
  })

  /**
   * Weekly agent-activity digest. Seven-day rollup of everything the agent
   * (or the user) did on-chain through Ori. Fuels the "Today" tab's
   * "Agent this week" banner and the eventual Sunday email digest.
   */
  app.get('/v1/profiles/:address/weekly-stats', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const addr = parsed.data
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      paymentsOutAgg,
      tipsGivenAgg,
      tipsReceivedAgg,
      topCreatorGroup,
      paymentsInCount,
    ] = await Promise.all([
      prisma.paymentEvent.aggregate({
        where: { fromAddr: addr, createdAt: { gte: since } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.tipEvent.aggregate({
        where: { tipperAddr: addr, createdAt: { gte: since } },
        _sum: { grossAmount: true },
        _count: { id: true },
      }),
      prisma.tipEvent.aggregate({
        where: { creatorAddr: addr, createdAt: { gte: since } },
        _sum: { netAmount: true },
        _count: { id: true },
      }),
      prisma.tipEvent.groupBy({
        by: ['creatorAddr'],
        where: { tipperAddr: addr, createdAt: { gte: since } },
        _sum: { grossAmount: true },
        orderBy: { _sum: { grossAmount: 'desc' } },
        take: 1,
      }),
      prisma.paymentEvent.count({
        where: { toAddr: addr, createdAt: { gte: since } },
      }),
    ])

    // Resolve the top creator's display name (init username if cached).
    let topCreator: { address: string; displayName: string } | null = null
    const topRow = topCreatorGroup[0]
    if (topRow && topRow.creatorAddr) {
      const cache = await prisma.profileCache.findUnique({
        where: { address: topRow.creatorAddr },
      })
      topCreator = {
        address: topRow.creatorAddr,
        displayName: cache?.initName
          ? `${cache.initName}.init`
          : `${topRow.creatorAddr.slice(0, 10)}...`,
      }
    }

    await reply.send({
      address: addr,
      windowDays: 7,
      since: since.toISOString(),
      agentSpend: {
        totalBaseUnits: (paymentsOutAgg._sum.amount ?? 0n).toString(),
        txCount: paymentsOutAgg._count.id,
      },
      tipsGiven: {
        totalBaseUnits: (tipsGivenAgg._sum.grossAmount ?? 0n).toString(),
        count: tipsGivenAgg._count.id,
      },
      tipsReceived: {
        totalBaseUnits: (tipsReceivedAgg._sum.netAmount ?? 0n).toString(),
        count: tipsReceivedAgg._count.id,
      },
      paymentsInCount,
      topCreator,
      // Placeholder until the prediction_pool event listener is wired into Prisma.
      predictionResults: { wins: 0, losses: 0, pendingMarkets: 0 },
    })
  })
}
