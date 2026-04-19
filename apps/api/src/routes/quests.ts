/**
 * Quests — a gamified onboarding + retention loop.
 *
 * Quest definitions live in code (`QUESTS`). Progress is computed by reading
 * UserStats + QuestCompletion; completion is recorded once, awarded XP is
 * implicit (no token — XP totals are derived on the fly).
 *
 * Attribution: system shape inspired by dmpz19x-creator/Hunch's QuestPanel.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const AddressParam = z.string().regex(/^init1[a-z0-9]+$/)

type QuestKind =
  | 'payments_sent'
  | 'tips_given'
  | 'tips_received'
  | 'gifts_sent'
  | 'wagers_won'
  | 'bills_split'
  | 'referrals'
  | 'followers_count'

type QuestDef = {
  id: string
  title: string
  description: string
  kind: QuestKind
  threshold: number
  xp: number
  /** Small icon hint the client maps to a Lucide icon. */
  icon: string
}

/**
 * Ordered by approximate difficulty. The first few are the onboarding quests
 * we want every user to complete in their first session.
 */
export const QUESTS: QuestDef[] = [
  { id: 'first-payment', title: 'Send your first payment', description: 'Pay a friend in a chat. Zero wallet popups.', kind: 'payments_sent', threshold: 1, xp: 50, icon: 'zap' },
  { id: 'first-tip', title: 'Tip a creator', description: '99% goes straight to them.', kind: 'tips_given', threshold: 1, xp: 40, icon: 'heart' },
  { id: 'first-gift', title: 'Send a gift', description: 'Wrap a payment as a gift packet.', kind: 'gifts_sent', threshold: 1, xp: 40, icon: 'gift' },
  { id: 'first-follower', title: 'Get a follower', description: 'Someone likes what you are building.', kind: 'followers_count', threshold: 1, xp: 30, icon: 'user-plus' },
  { id: 'ten-payments', title: '10 payments', description: 'Move money like it is a message.', kind: 'payments_sent', threshold: 10, xp: 100, icon: 'zap' },
  { id: 'ten-tips', title: '10 tips', description: 'A recognized supporter of creators.', kind: 'tips_given', threshold: 10, xp: 120, icon: 'heart' },
  { id: 'first-wager-won', title: 'Win a wager', description: 'A friendly bet, settled on-chain.', kind: 'wagers_won', threshold: 1, xp: 80, icon: 'trophy' },
  { id: 'first-split', title: 'Split a bill', description: 'Divide a payment among friends.', kind: 'bills_split', threshold: 1, xp: 60, icon: 'split' },
  { id: 'ten-followers', title: '10 followers', description: 'Your circle is growing.', kind: 'followers_count', threshold: 10, xp: 150, icon: 'user-plus' },
  { id: 'hundred-payments', title: '100 payments', description: 'The Ori way of moving money is muscle memory now.', kind: 'payments_sent', threshold: 100, xp: 400, icon: 'zap' },
]

function progressForKind(kind: QuestKind, stats: {
  paymentsSent: number
  tipsGiven: number
  tipsReceived: number
  giftsSent: number
  wagersWon: number
  billsSplit: number
  referrals: number
  followersCount: number
}): number {
  switch (kind) {
    case 'payments_sent': return stats.paymentsSent
    case 'tips_given': return stats.tipsGiven
    case 'tips_received': return stats.tipsReceived
    case 'gifts_sent': return stats.giftsSent
    case 'wagers_won': return stats.wagersWon
    case 'bills_split': return stats.billsSplit
    case 'referrals': return stats.referrals
    case 'followers_count': return stats.followersCount
  }
}

export async function questRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/profiles/:address/quests', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const address = parsed.data
    const [stats, completions] = await Promise.all([
      prisma.userStats.findUnique({ where: { address } }),
      prisma.questCompletion.findMany({ where: { userAddress: address } }),
    ])
    const completedIds = new Set(completions.map((c) => c.questId))

    const entries = QUESTS.map((q) => {
      const raw = stats ? progressForKind(q.kind, stats) : 0
      const progress = Math.min(raw, q.threshold)
      const completed = completedIds.has(q.id) || progress >= q.threshold
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        icon: q.icon,
        threshold: q.threshold,
        progress,
        completed,
        xp: q.xp,
        awarded: completedIds.has(q.id),
      }
    })

    // Auto-record completions when we first see a stats-driven completion.
    // The write is best-effort; next GET converges.
    const newlyCompleted = entries.filter((e) => e.completed && !e.awarded)
    if (newlyCompleted.length > 0) {
      await Promise.all(
        newlyCompleted.map((e) =>
          prisma.questCompletion
            .create({ data: { userAddress: address, questId: e.id } })
            .catch(() => {
              /* unique constraint collision — benign */
            }),
        ),
      )
    }

    const totalXp = entries.filter((e) => e.completed).reduce((sum, e) => sum + e.xp, 0)
    const maxXp = QUESTS.reduce((sum, q) => sum + q.xp, 0)

    await reply.send({
      address,
      totalXp,
      maxXp,
      level: Math.floor(totalXp / 200),
      entries,
    })
  })
}
