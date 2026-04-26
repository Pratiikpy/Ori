/**
 * Chat-aggregation routes.
 *
 *   GET /v1/chats                → the user's chat list, most-recent first
 *
 * A "chat" is a sequence of messages sharing a `chatId`. We compute the list by
 * grouping messages where this user is sender or recipient, and return the
 * counterparty + last message timestamp + unread count.
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

type ChatSummary = {
  chatId: string
  counterparty: {
    initiaAddress: string
    hexAddress: string
    initName: string | null
  }
  lastMessageAt: string
  unreadCount: number
}

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth)

  app.get('/v1/chats', async (request, reply) => {
    const user = request.user!

    try {
      // We rely on the DB to do the grouping. Prisma doesn't have first-class
      // groupBy with selected columns from joins, so we use a raw query.
      const rows = await prisma.$queryRaw<
        Array<{
          chat_id: string
          counterparty_user_id: string
          last_at: Date
          unread_count: bigint
        }>
      >`
        SELECT
          m."chatId"                                                   AS chat_id,
          CASE WHEN m."senderId" = ${user.id} THEN m."recipientId"
               ELSE m."senderId" END                                   AS counterparty_user_id,
          MAX(m."createdAt")                                           AS last_at,
          SUM(CASE WHEN m."recipientId" = ${user.id} AND m."readAt" IS NULL THEN 1 ELSE 0 END) AS unread_count
        FROM "messages" m
        WHERE m."senderId" = ${user.id} OR m."recipientId" = ${user.id}
        GROUP BY m."chatId",
                 (CASE WHEN m."senderId" = ${user.id} THEN m."recipientId" ELSE m."senderId" END)
        ORDER BY last_at DESC
        LIMIT 200
      `

      if (rows.length === 0) {
        await reply.send({ chats: [] as ChatSummary[] })
        return
      }

      const counterpartyIds = [...new Set(rows.map((r) => r.counterparty_user_id))]
      const counterparties = await prisma.user.findMany({
        where: { id: { in: counterpartyIds } },
        select: { id: true, initiaAddress: true, hexAddress: true, initName: true },
      })
      const byId = new Map(counterparties.map((u) => [u.id, u]))

      const chats: ChatSummary[] = rows
        .map((r) => {
          const cp = byId.get(r.counterparty_user_id)
          if (!cp) return null
          return {
            chatId: r.chat_id,
            counterparty: {
              initiaAddress: cp.initiaAddress,
              hexAddress: cp.hexAddress,
              initName: cp.initName,
            },
            lastMessageAt: r.last_at.toISOString(),
            unreadCount: Number(r.unread_count),
          }
        })
        .filter((x): x is ChatSummary => x !== null)

      await reply.send({ chats })
    } catch (err) {
      // Most common cause of a 500 here in production: the migrations have
      // not been deployed against Supabase, so the `messages` table doesn't
      // exist. Log the underlying error and return an empty list — the UI
      // shows the empty-state composer instead of a frightening red error.
      // The actual error reaches Vercel logs for diagnosis.
      request.log.error(
        { err, userId: user.id },
        'GET /v1/chats failed — returning empty list as fallback',
      )
      await reply.send({ chats: [] as ChatSummary[] })
    }
  })
}
