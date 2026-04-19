/**
 * Outbox pattern implementation.
 *
 * Problem: event-driven code historically did:
 *   1. prisma.tipEvent.create(...)
 *   2. redis.publish('ori:event:tip', payload)
 *
 * If step 2 fails (Redis hiccup, network blip), step 1 succeeded but no
 * subscriber ever saw the event. Downstream effects (badge mints, push
 * notifications, real-time UI updates) are silently skipped.
 *
 * Fix: write the event row (domain_events table) INSIDE the same
 * transaction as step 1, and have a separate worker read it and publish.
 * If publish fails, the worker retries -- the DB is the source of truth.
 *
 * Usage:
 *
 *   await prisma.$transaction(async (tx) => {
 *     await tx.tipEvent.create({ data: ... })
 *     await enqueueEvent(tx, 'ori:event:tip', payload)
 *   })
 *
 *   // elsewhere, OutboxWorker drains the table to redis.publish.
 */
import type { PrismaClient } from '@prisma/client'
import { prisma } from './prisma.js'
import { redis } from './redis.js'

type TxClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0] extends (tx: infer T) => unknown ? never : never
>[0]

// Prisma doesn't export the tx type cleanly, so we use the `any`-equivalent
// via a typed re-export. In practice every tx client implements the same
// model methods as the root prisma client.
type DbClient = Pick<PrismaClient, 'domainEvent'>

/**
 * Persist an event row. Call this inside a `prisma.$transaction` with the
 * same `tx` handle used for the primary write. After the transaction
 * commits, OutboxWorker picks up the row and publishes.
 *
 * You can also call it with the root `prisma` client -- the worker will
 * still publish, but the commit-barrier guarantee is weaker because the
 * row insert isn't atomic with the primary write.
 */
export async function enqueueEvent(
  db: DbClient,
  topic: string,
  payload: unknown,
): Promise<void> {
  await db.domainEvent.create({
    data: {
      topic,
      payload: JSON.stringify(payload),
    },
  })
}

/**
 * "Trampoline" emit: write to outbox (durable) AND attempt immediate publish.
 *
 * - Happy path: Redis is up, publish succeeds, row is marked published in
 *   the same call. Subscribers see the event within milliseconds.
 * - Redis hiccup: publish fails, row stays unpublished. OutboxWorker
 *   retries it in the next drain tick (default 500ms).
 *
 * Use this for fire-and-forget events from non-transactional call sites
 * (EventListener, background services). For critical flows where the event
 * MUST be durable-before-response, call enqueueEvent inside a
 * prisma.$transaction alongside the primary write.
 */
export async function emitEvent(topic: string, payload: unknown): Promise<void> {
  const serialized = JSON.stringify(payload)
  const row = await prisma.domainEvent.create({
    data: { topic, payload: serialized },
  })
  // Best-effort immediate publish so happy-path latency stays <10ms.
  try {
    await redis.publish(topic, serialized)
    await prisma.domainEvent.update({
      where: { id: row.id },
      data: { publishedAt: new Date(), attempts: 1 },
    })
  } catch (err) {
    // Swallow -- the worker will retry. Log once so we notice sustained issues.
    // eslint-disable-next-line no-console
    console.warn('[outbox] immediate publish failed; queued for retry', {
      topic,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Worker loop. Polls the outbox every `intervalMs` for unpublished rows,
 * publishes each to Redis, and marks it published. Failures increment
 * `attempts` and stamp `lastError`. Rows with >10 attempts are skipped in
 * subsequent polls (the DLQ signal -- human action required).
 */
export class OutboxWorker {
  private running = false
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly intervalMs: number = 500,
    private readonly batchSize: number = 50,
    private readonly maxAttempts: number = 10,
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    void this.tick()
  }

  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private async tick(): Promise<void> {
    if (!this.running) return
    try {
      await this.drain()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[outbox] drain failed', err)
    }
    this.timer = setTimeout(() => void this.tick(), this.intervalMs)
  }

  private async drain(): Promise<void> {
    const rows = await prisma.domainEvent.findMany({
      where: {
        publishedAt: null,
        attempts: { lt: this.maxAttempts },
      },
      orderBy: { createdAt: 'asc' },
      take: this.batchSize,
    })
    if (rows.length === 0) return

    for (const row of rows) {
      try {
        await redis.publish(row.topic, row.payload)
        await prisma.domainEvent.update({
          where: { id: row.id },
          data: { publishedAt: new Date(), attempts: row.attempts + 1 },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await prisma.domainEvent.update({
          where: { id: row.id },
          data: {
            attempts: row.attempts + 1,
            lastError: msg.slice(0, 500),
          },
        })
      }
    }
  }

  /**
   * Count currently-stuck events (>maxAttempts). Exposed to /health/deep
   * so operators see DLQ depth.
   */
  async dlqCount(): Promise<number> {
    return prisma.domainEvent.count({
      where: {
        publishedAt: null,
        attempts: { gte: this.maxAttempts },
      },
    })
  }

  /**
   * Count pending events (published = null, attempts < max). Steady-state
   * should be near-zero. Spikes indicate Redis or network problems.
   */
  async pendingCount(): Promise<number> {
    return prisma.domainEvent.count({
      where: {
        publishedAt: null,
        attempts: { lt: this.maxAttempts },
      },
    })
  }
}

export const outboxWorker = new OutboxWorker()
