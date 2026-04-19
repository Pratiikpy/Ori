import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { redis } from '../lib/redis.js'
import { config } from '../config.js'
import { circuitBreakers } from '../lib/circuit-breaker.js'
import { outboxWorker } from '../lib/outbox.js'

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }))

  app.get('/health/ready', async (_req, reply) => {
    const checks = {
      db: false,
      redis: false,
    }
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.db = true
    } catch (err) {
      _req.log.error({ err }, 'db health check failed')
    }
    try {
      await redis.ping()
      checks.redis = true
    } catch (err) {
      _req.log.error({ err }, 'redis health check failed')
    }

    const ok = checks.db && checks.redis
    await reply.status(ok ? 200 : 503).send({
      status: ok ? 'ok' : 'degraded',
      checks,
    })
  })

  /**
   * Deep health: the "is Ori actually working" probe. Hits every dependency
   * that can degrade a user-visible feature and reports the lag/state per
   * system. Safe for Grafana / uptime services to poll every 30s.
   *
   * Fields with defined SLO-ish meanings:
   *   - chainLagBlocks: if > 20, activity feed is stale.
   *   - oracleStalenessSeconds: if > 60, prediction prices are bad.
   *   - outboxPending: steady-state near 0. spikes mean Redis trouble.
   *   - outboxDlq: > 0 => operator intervention. 10 retries failed.
   */
  app.get('/health/deep', async (_req, reply) => {
    const start = Date.now()

    const [dbOk, redisMs, chain, oracle, listener, outboxPending, outboxDlq] =
      await Promise.all([
        prisma.$queryRaw`SELECT 1`
          .then(() => true)
          .catch(() => false),
        pingRedis(),
        chainStatus(),
        oracleFreshness(),
        listenerLag(),
        outboxWorker.pendingCount().catch(() => -1),
        outboxWorker.dlqCount().catch(() => -1),
      ])

    const chainLagBlocks =
      chain.tip !== null && listener.cursorHeight !== null
        ? chain.tip - listener.cursorHeight
        : null

    const snapshot = {
      timestamp: new Date().toISOString(),
      totalMs: Date.now() - start,
      db: { ok: dbOk },
      redis: { ok: redisMs !== null, pingMs: redisMs },
      chain: {
        tip: chain.tip,
        fetchMs: chain.fetchMs,
        ok: chain.tip !== null,
      },
      eventListener: {
        cursorHeight: listener.cursorHeight,
        lagBlocks: chainLagBlocks,
        healthy: chainLagBlocks !== null && chainLagBlocks < 50,
      },
      oracle: {
        pair: 'BTC/USD',
        stalenessSeconds: oracle.stalenessSeconds,
        healthy: oracle.stalenessSeconds !== null && oracle.stalenessSeconds < 60,
      },
      outbox: {
        pending: outboxPending,
        dlq: outboxDlq,
        healthy: outboxPending >= 0 && outboxPending < 100 && outboxDlq === 0,
      },
      circuitBreakers: circuitBreakers.snapshot(),
    }

    const allHealthy =
      snapshot.db.ok &&
      snapshot.redis.ok &&
      snapshot.chain.ok &&
      snapshot.eventListener.healthy &&
      snapshot.oracle.healthy &&
      snapshot.outbox.healthy &&
      snapshot.circuitBreakers.every((b) => b.state !== 'OPEN')

    await reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ok' : 'degraded',
      ...snapshot,
    })
  })
}

async function pingRedis(): Promise<number | null> {
  const start = Date.now()
  try {
    await redis.ping()
    return Date.now() - start
  } catch {
    return null
  }
}

async function chainStatus(): Promise<{ tip: number | null; fetchMs: number | null }> {
  const start = Date.now()
  try {
    const r = await fetch(
      `${config.ORI_REST_URL}/cosmos/base/tendermint/v1beta1/blocks/latest`,
      { signal: AbortSignal.timeout(3000) },
    )
    if (!r.ok) return { tip: null, fetchMs: Date.now() - start }
    const j = (await r.json()) as { block?: { header?: { height?: string } } }
    const h = Number(j.block?.header?.height ?? 0)
    return { tip: h || null, fetchMs: Date.now() - start }
  } catch {
    return { tip: null, fetchMs: null }
  }
}

async function oracleFreshness(): Promise<{ stalenessSeconds: number | null }> {
  try {
    const r = await fetch(
      `${config.ORI_REST_URL}/connect/oracle/v2/get_price?currency_pair=BTC/USD`,
      { signal: AbortSignal.timeout(3000) },
    )
    if (!r.ok) return { stalenessSeconds: null }
    const j = (await r.json()) as { price?: { block_timestamp?: string } }
    const ts = j.price?.block_timestamp
    if (!ts) return { stalenessSeconds: null }
    const age = (Date.now() - new Date(ts).getTime()) / 1000
    return { stalenessSeconds: Math.round(age) }
  } catch {
    return { stalenessSeconds: null }
  }
}

async function listenerLag(): Promise<{ cursorHeight: number | null }> {
  try {
    const row = await prisma.eventCursor.findFirst({
      where: { listenerName: 'move_events' },
    })
    if (!row?.lastHeight) return { cursorHeight: null }
    // Prisma exposes BigInt columns as JS bigint; the rest of the API
    // uses plain numbers because block heights fit comfortably in u53.
    const h = typeof row.lastHeight === 'bigint' ? Number(row.lastHeight) : Number(row.lastHeight)
    return { cursorHeight: Number.isFinite(h) ? h : null }
  } catch {
    return { cursorHeight: null }
  }
}
