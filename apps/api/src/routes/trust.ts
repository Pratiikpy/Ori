/**
 * Trust score route — 0-1000 score + letter grade per address.
 *
 * The formula is intentionally simple + deterministic so the client can
 * reproduce it for "why is my score X?" breakdowns:
 *
 *   score =
 *     300 * saturate(account_age_seconds / (1 year))
 *   + 250 * saturate(payments_sent / 100)
 *   + 150 * saturate(tips_given / 50)
 *   + 150 * saturate(tips_received / 50)
 *   +  75 * saturate(followers_count / 250)
 *   +  75 * saturate(badges / 15)
 *
 *   where `saturate(x) = min(1, max(0, x))`.
 *
 * Grades: AAA ≥ 900, AA ≥ 800, A ≥ 650, B ≥ 500, C ≥ 300, D < 300.
 *
 * Attribution: model (letter grades + weighted components) adapted from
 * InitCred's 1000-point trust score.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getBadgesOnChain } from '../lib/initiaClient.js'

const AddressParam = z.string().regex(/^init1[a-z0-9]+$/)

const YEAR_SECONDS = 365 * 24 * 60 * 60

type Breakdown = {
  accountAge: { days: number; weight: number; points: number }
  paymentsSent: { value: number; weight: number; points: number }
  tipsGiven: { value: number; weight: number; points: number }
  tipsReceived: { value: number; weight: number; points: number }
  followersCount: { value: number; weight: number; points: number }
  badges: { value: number; weight: number; points: number }
}

const WEIGHTS = {
  accountAge: 300,
  paymentsSent: 250,
  tipsGiven: 150,
  tipsReceived: 150,
  followersCount: 75,
  badges: 75,
}

function saturate(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 1) return 1
  return n
}

function letterGrade(score: number): string {
  if (score >= 900) return 'AAA'
  if (score >= 800) return 'AA'
  if (score >= 650) return 'A'
  if (score >= 500) return 'B'
  if (score >= 300) return 'C'
  return 'D'
}

export async function trustRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/profiles/:address/trust-score', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const address = parsed.data

    const [stats, badges] = await Promise.all([
      prisma.userStats.findUnique({ where: { address } }),
      getBadgesOnChain(address),
    ])

    const nowMs = Date.now()
    const firstSeenMs = stats?.firstSeenAt.getTime() ?? nowMs
    const ageSec = Math.max(0, Math.floor((nowMs - firstSeenMs) / 1000))
    const ageRatio = saturate(ageSec / YEAR_SECONDS)

    const paymentsSent = stats?.paymentsSent ?? 0
    const tipsGiven = stats?.tipsGiven ?? 0
    const tipsReceived = stats?.tipsReceived ?? 0
    const followers = stats?.followersCount ?? 0
    const badgeCount = badges.length

    const breakdown: Breakdown = {
      accountAge: {
        days: Math.floor(ageSec / 86400),
        weight: WEIGHTS.accountAge,
        points: Math.round(WEIGHTS.accountAge * ageRatio),
      },
      paymentsSent: {
        value: paymentsSent,
        weight: WEIGHTS.paymentsSent,
        points: Math.round(WEIGHTS.paymentsSent * saturate(paymentsSent / 100)),
      },
      tipsGiven: {
        value: tipsGiven,
        weight: WEIGHTS.tipsGiven,
        points: Math.round(WEIGHTS.tipsGiven * saturate(tipsGiven / 50)),
      },
      tipsReceived: {
        value: tipsReceived,
        weight: WEIGHTS.tipsReceived,
        points: Math.round(WEIGHTS.tipsReceived * saturate(tipsReceived / 50)),
      },
      followersCount: {
        value: followers,
        weight: WEIGHTS.followersCount,
        points: Math.round(WEIGHTS.followersCount * saturate(followers / 250)),
      },
      badges: {
        value: badgeCount,
        weight: WEIGHTS.badges,
        points: Math.round(WEIGHTS.badges * saturate(badgeCount / 15)),
      },
    }

    const score =
      breakdown.accountAge.points +
      breakdown.paymentsSent.points +
      breakdown.tipsGiven.points +
      breakdown.tipsReceived.points +
      breakdown.followersCount.points +
      breakdown.badges.points

    await reply.send({
      address,
      score,
      maxScore: 1000,
      grade: letterGrade(score),
      breakdown,
      explain: {
        accountAge: 'Longer-lived accounts score higher. Max 300 at 1 year.',
        paymentsSent: 'Active payment senders are trustworthy. Max 250 at 100 payments.',
        tipsGiven: 'Generosity counts. Max 150 at 50 tips given.',
        tipsReceived: 'Earning tips means others trust you. Max 150 at 50 tips received.',
        followersCount: 'Social reach signal. Max 75 at 250 followers.',
        badges: 'Earned achievements. Max 75 at 15 badges.',
      },
    })
  })
}
