/**
 * Portfolio routes — single-call aggregation of everything the user needs
 * on the /portfolio page: stats, recent activity, badges, follow counts.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getBadgesOnChain } from '../lib/initiaClient.js'

const AddressParam = z.string().regex(/^init1[a-z0-9]+$/)

export async function portfolioRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/profiles/:address/portfolio', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const address = parsed.data

    const [stats, profile, badges, recentTipsReceived, recentPaymentsReceived] = await Promise.all([
      prisma.userStats.findUnique({ where: { address } }),
      prisma.profileCache.findUnique({ where: { address } }),
      getBadgesOnChain(address),
      prisma.tipEvent.findMany({
        where: { creatorAddr: address },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.paymentEvent.findMany({
        where: { toAddr: address },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    await reply.send({
      address,
      initName: profile?.initName ?? null,
      avatarUrl: profile?.avatarUrl ?? '',
      stats: {
        paymentsSent: stats?.paymentsSent ?? 0,
        paymentsReceived: stats?.paymentsReceived ?? 0,
        tipsGiven: stats?.tipsGiven ?? 0,
        tipsReceived: stats?.tipsReceived ?? 0,
        tipsGivenVolume: (stats?.tipsGivenVolume ?? 0n).toString(),
        tipsReceivedVolume: (stats?.tipsReceivedVolume ?? 0n).toString(),
        giftsSent: stats?.giftsSent ?? 0,
        giftsClaimed: stats?.giftsClaimed ?? 0,
        wagersWon: stats?.wagersWon ?? 0,
        billsSplit: stats?.billsSplit ?? 0,
        referrals: stats?.referrals ?? 0,
        followersCount: stats?.followersCount ?? 0,
        followingCount: stats?.followingCount ?? 0,
        badgeCount: badges.length,
        firstSeenAt: stats?.firstSeenAt?.toISOString() ?? null,
        lastActiveAt: stats?.lastActiveAt?.toISOString() ?? null,
      },
      recent: {
        tipsReceived: recentTipsReceived.map((t) => ({
          from: t.tipperAddr,
          amount: t.netAmount.toString(),
          denom: t.denom,
          message: t.message,
          at: t.createdAt.toISOString(),
        })),
        paymentsReceived: recentPaymentsReceived.map((p) => ({
          from: p.fromAddr,
          amount: p.amount.toString(),
          denom: p.denom,
          memo: p.memo,
          at: p.createdAt.toISOString(),
        })),
      },
    })
  })
}
