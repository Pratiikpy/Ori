import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { redis } from '../lib/redis.js'
import { CircuitBreakerOpenError, createBreaker } from '../lib/circuit-breaker.js'

// Breaker name is surfaced on /health/deep. 5 failures -> open 30s.
// Tracked pairs returning code 2 are NOT failures (expected upstream state).
const oracleBreaker = createBreaker({
  name: 'connect-oracle',
  threshold: 5,
  cooldownMs: 30_000,
  expectedErrors: [/not tracking this CurrencyPair/],
})

/**
 * Thin proxy over the rollup REST endpoint's Connect (Slinky) oracle pages.
 * Exists because Next.js on the web app can't directly hit a local `ori-1`
 * RPC from the browser when deployed behind Cloudflare/Vercel (CORS + private
 * address). We cache in Redis with a 2s TTL since prices only update every
 * few blocks and polling every 2s is fine for the Predict UI.
 */
export async function oracleRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { pair?: string } }>('/v1/oracle/price', async (req, reply) => {
    const rawPair = (req.query.pair ?? '').trim().toUpperCase()
    if (!rawPair) {
      return reply.status(400).send({ error: 'pair query required, e.g. ?pair=BTC/USD' })
    }
    const pair = rawPair.includes('/') ? rawPair : `${rawPair}/USD`

    const cacheKey = `oracle:price:${pair}`
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        reply.header('X-Ori-Oracle-Cache', 'hit')
        return JSON.parse(cached)
      }
    } catch (err) {
      req.log.warn({ err }, 'oracle cache read failed; falling through to upstream')
    }

    const upstreamUrl = `${config.ORI_REST_URL}/connect/oracle/v2/get_price?currency_pair=${encodeURIComponent(pair)}`
    let upstream: Response
    try {
      upstream = await oracleBreaker.run(async () => {
        const r = await fetch(upstreamUrl, { signal: AbortSignal.timeout(5000) })
        // Convert 5xx/network failures to thrown errors so the breaker trips.
        // The "not tracking" code-2 upstream is 5xx but matches expectedErrors.
        if (r.status >= 500) {
          const body = await r.clone().text()
          throw new Error(`oracle upstream ${r.status}: ${body.slice(0, 200)}`)
        }
        return r
      })
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) {
        reply.header('Retry-After', Math.ceil(err.retryAfterMs / 1000))
        return reply.status(503).send({
          error: 'oracle temporarily unavailable',
          pair,
          reason: 'circuit breaker open',
          retryAfterMs: err.retryAfterMs,
        })
      }
      // "not tracking" cases throw with the message; map to clean 404.
      const msg = err instanceof Error ? err.message : String(err)
      if (/not tracking this CurrencyPair/.test(msg)) {
        return reply.status(404).send({
          error: 'pair not tracked on this rollup',
          pair,
          hint: 'Query /v1/oracle/tickers for the full list of tracked pairs.',
        })
      }
      req.log.error({ err, pair }, 'oracle upstream fetch failed')
      return reply.status(502).send({ error: 'oracle upstream unreachable', pair })
    }
    if (!upstream.ok) {
      const body = await upstream.text()
      // Unsupported pair → upstream returns code 2 "not tracking this CurrencyPair".
      // Map that to a clean 404 so callers can fall back gracefully.
      if (body.includes('not tracking this CurrencyPair')) {
        return reply.status(404).send({
          error: 'pair not tracked on this rollup',
          pair,
          hint: 'Query /v1/oracle/tickers for the full list of tracked pairs.',
        })
      }
      return reply.status(upstream.status).send({
        error: 'oracle upstream error',
        pair,
        upstreamStatus: upstream.status,
        upstreamBody: body.slice(0, 500),
      })
    }

    const json = (await upstream.json()) as {
      price?: { price?: string; block_timestamp?: string; block_height?: string }
      decimals?: string | number
      nonce?: string
      id?: string
    }
    const rawPrice = json.price?.price
    if (!rawPrice) {
      return reply.status(502).send({
        error: 'oracle response missing price',
        pair,
        raw: json,
      })
    }

    const result = {
      pair,
      price: rawPrice,
      decimals: Number(json.decimals ?? 0),
      blockTimestamp: json.price?.block_timestamp ?? null,
      blockHeight: json.price?.block_height ?? null,
      nonce: json.nonce ?? null,
      id: json.id ?? null,
    }

    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 2)
    } catch (err) {
      req.log.warn({ err }, 'oracle cache write failed; not fatal')
    }

    reply.header('X-Ori-Oracle-Cache', 'miss')
    return result
  })

  app.get('/v1/oracle/tickers', async (req, reply) => {
    const cacheKey = 'oracle:tickers:all'
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        reply.header('X-Ori-Oracle-Cache', 'hit')
        return JSON.parse(cached)
      }
    } catch (err) {
      req.log.warn({ err }, 'tickers cache read failed')
    }

    const upstreamUrl = `${config.ORI_REST_URL}/connect/oracle/v2/get_all_tickers`
    try {
      const upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(5000) })
      if (!upstream.ok) {
        return reply.status(upstream.status).send({ error: 'upstream error', status: upstream.status })
      }
      const body = (await upstream.json()) as { currency_pairs?: Array<{ Base: string; Quote: string }> }
      const tickers = (body.currency_pairs ?? [])
        .filter((p) => p.Quote === 'USD')
        .map((p) => p.Base)

      const result = { tickers, updated: new Date().toISOString() }
      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 300)
      } catch (err) {
        req.log.warn({ err }, 'tickers cache write failed')
      }

      reply.header('X-Ori-Oracle-Cache', 'miss')
      return result
    } catch (err) {
      req.log.error({ err }, 'tickers upstream fetch failed')
      return reply.status(502).send({ error: 'oracle upstream unreachable' })
    }
  })
}
