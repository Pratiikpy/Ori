/**
 * Follow routes — paginated reads of the follow graph indexed from
 * `follow_graph::Followed` / `::Unfollowed` on-chain events.
 *
 * All mutating calls go through the Move module (client signs tx). This
 * endpoint set is read-only.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const AddressParam = z.string().regex(/^init1[a-z0-9]+$/)
const ListQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function followRoutes(app: FastifyInstance): Promise<void> {
  // ─── GET /v1/profiles/:address/followers ───
  app.get('/v1/profiles/:address/followers', async (request, reply) => {
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

    const where = { toAddr: parsed.data }
    const rows = await prisma.follow.findMany({
      where: q.data.cursor
        ? { ...where, createdAt: { lt: new Date(q.data.cursor) } }
        : where,
      orderBy: { createdAt: 'desc' },
      take: q.data.limit,
    })
    // Hydrate display fields from profileCache so the UI can render
    // .init handles, avatars, and bios next to each follower without a
    // second N+1 round-trip. Frontend type
    // (lib/api-follows.ts:FollowEntry) declares these fields and would
    // otherwise see them as undefined → list collapses to plain
    // shortened addresses.
    const profiles = await prisma.profileCache.findMany({
      where: { address: { in: rows.map((r) => r.fromAddr) } },
      select: { address: true, initName: true, avatarUrl: true, bio: true },
    })
    const byAddr = new Map(profiles.map((p) => [p.address, p]))
    await reply.send({
      address: parsed.data,
      entries: rows.map((r) => {
        const cache = byAddr.get(r.fromAddr)
        return {
          address: r.fromAddr,
          initName: cache?.initName ?? null,
          avatarUrl: cache?.avatarUrl ?? '',
          bio: cache?.bio ?? '',
          at: r.createdAt.toISOString(),
          followedAt: r.createdAt.toISOString(),
        }
      }),
      nextCursor: rows.length === q.data.limit ? rows[rows.length - 1]!.createdAt.toISOString() : null,
    })
  })

  // ─── GET /v1/profiles/:address/following ───
  app.get('/v1/profiles/:address/following', async (request, reply) => {
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

    const where = { fromAddr: parsed.data }
    const rows = await prisma.follow.findMany({
      where: q.data.cursor
        ? { ...where, createdAt: { lt: new Date(q.data.cursor) } }
        : where,
      orderBy: { createdAt: 'desc' },
      take: q.data.limit,
    })
    // Same hydration as /followers above.
    const profiles = await prisma.profileCache.findMany({
      where: { address: { in: rows.map((r) => r.toAddr) } },
      select: { address: true, initName: true, avatarUrl: true, bio: true },
    })
    const byAddr = new Map(profiles.map((p) => [p.address, p]))
    await reply.send({
      address: parsed.data,
      entries: rows.map((r) => {
        const cache = byAddr.get(r.toAddr)
        return {
          address: r.toAddr,
          initName: cache?.initName ?? null,
          avatarUrl: cache?.avatarUrl ?? '',
          bio: cache?.bio ?? '',
          at: r.createdAt.toISOString(),
          followedAt: r.createdAt.toISOString(),
        }
      }),
      nextCursor: rows.length === q.data.limit ? rows[rows.length - 1]!.createdAt.toISOString() : null,
    })
  })

  // ─── GET /v1/profiles/:address/follow-stats ───
  app.get('/v1/profiles/:address/follow-stats', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    // Derive counts directly from the follows table — the cached counter on
    // UserStats can drift if events come out of natural order (e.g. backend
    // restart while a session has unfollow-then-refollow pairs).
    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { toAddr: parsed.data } }),
      prisma.follow.count({ where: { fromAddr: parsed.data } }),
    ])
    await reply.send({
      address: parsed.data,
      followers,
      following,
    })
  })

  // ─── GET /v1/follows/check?from=&to= ───
  app.get('/v1/follows/check', async (request, reply) => {
    const q = z
      .object({
        from: z.string().regex(/^init1[a-z0-9]+$/),
        to: z.string().regex(/^init1[a-z0-9]+$/),
      })
      .safeParse(request.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }
    const row = await prisma.follow.findUnique({
      where: { fromAddr_toAddr: { fromAddr: q.data.from, toAddr: q.data.to } },
    })
    await reply.send({ following: Boolean(row) })
  })
}
