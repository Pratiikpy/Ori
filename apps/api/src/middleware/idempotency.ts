/**
 * Idempotency middleware.
 *
 * Pattern: client sends `Idempotency-Key: <uuid>` on mutating requests.
 * If we've seen this key before, we return the cached response instead of
 * re-executing the handler. Mobile networks retry -- without this, users
 * double-tip, double-pay, or double-claim gift links.
 *
 * Storage: Redis `idem:<route_fingerprint>:<key>` with 24h TTL. The
 * fingerprint combines method + path + body-hash so a client can't reuse
 * a key across different operations (Stripe does this for safety).
 *
 * Only applies to POST / PATCH / DELETE. Reads (GET) are idempotent by
 * definition and this plugin is a no-op for them.
 *
 * Scope: opt-in per route. Register the plugin, then on routes that
 * need it set `config.idempotent = true`. We don't want GET-body or
 * streaming endpoints to be blanket-cached.
 */
import type { FastifyInstance, FastifyRequest, onSendHookHandler } from 'fastify'
import { createHash, randomUUID } from 'node:crypto'
import { redis } from '../lib/redis.js'

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60
const HEADER_NAME = 'idempotency-key'
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

type CachedResponse = {
  statusCode: number
  headers: Record<string, string | string[] | number | undefined>
  body: string
  createdAt: number
}

type IdempotencyState = {
  key: string
  redisKey: string
  /** true when preHandler served from cache; onSend must skip writing back. */
  replayed: boolean
}

declare module 'fastify' {
  interface FastifyRequest {
    idempotency?: IdempotencyState
  }
  interface FastifyContextConfig {
    idempotent?: boolean
  }
}

function fingerprint(req: FastifyRequest, key: string): string {
  const body =
    typeof req.body === 'string'
      ? req.body
      : req.body == null
        ? ''
        : JSON.stringify(req.body)
  // Fastify 5 renamed req.routerPath -> req.routeOptions.url.
  const route = req.routeOptions?.url ?? req.url
  const hash = createHash('sha256')
    .update(req.method)
    .update('\n')
    .update(route)
    .update('\n')
    .update(body)
    .digest('hex')
    .slice(0, 16)
  return `idem:${hash}:${key}`
}

export async function idempotencyPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (req, reply) => {
    const routeConfig = req.routeOptions.config as { idempotent?: boolean } | undefined
    if (!routeConfig?.idempotent) return
    if (!MUTATING_METHODS.has(req.method)) return

    const keyHeader = req.headers[HEADER_NAME]
    if (!keyHeader || Array.isArray(keyHeader)) return // absent or multi-header => skip

    const key = keyHeader.trim()
    // UUID-ish check -- not strict, just blocking obvious junk.
    if (key.length < 16 || key.length > 128 || !/^[a-zA-Z0-9_\-]+$/.test(key)) {
      await reply.status(400).send({
        error: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be 16-128 chars of [a-zA-Z0-9_-].',
      })
      return
    }

    const redisKey = fingerprint(req, key)
    req.idempotency = { key, redisKey, replayed: false }

    try {
      const cached = await redis.get(redisKey)
      if (cached) {
        const parsed = JSON.parse(cached) as CachedResponse
        // Mark so onSend knows to skip its own header-write + cache-write.
        req.idempotency.replayed = true
        // Restore headers from cache BUT strip the miss-flavored replay
        // header that was captured at original write time.
        for (const [k, v] of Object.entries(parsed.headers)) {
          if (v !== undefined && k.toLowerCase() !== 'x-idempotent-replay') {
            reply.header(k, v)
          }
        }
        reply.header('X-Idempotent-Replay', 'hit')
        await reply.status(parsed.statusCode).send(parsed.body)
        return
      }
    } catch (err) {
      req.log.warn({ err }, '[idempotency] redis lookup failed; proceeding')
    }
  })

  const onSend: onSendHookHandler<string> = async (req, reply, payload) => {
    const state = req.idempotency
    if (!state) return payload
    // On replay, preHandler already wrote the header + body from cache.
    // Skip both the cache-write and the "miss" header here to avoid
    // overwriting the "hit" we just set.
    if (state.replayed) return payload
    if (reply.sent) return payload
    // Only cache 2xx responses -- errors should retry.
    const status = reply.statusCode
    if (status < 200 || status >= 300) return payload

    const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const headers: CachedResponse['headers'] = {}
    // Capture content-type + any X-* headers.
    const rawHeaders = reply.getHeaders()
    for (const [k, v] of Object.entries(rawHeaders)) {
      if (k.toLowerCase() === 'content-type' || k.toLowerCase().startsWith('x-')) {
        headers[k] = v
      }
    }
    const cached: CachedResponse = {
      statusCode: status,
      headers,
      body,
      createdAt: Date.now(),
    }
    try {
      await redis.set(state.redisKey, JSON.stringify(cached), 'EX', IDEMPOTENCY_TTL_SECONDS)
      reply.header('X-Idempotent-Replay', 'miss')
    } catch (err) {
      req.log.warn({ err }, '[idempotency] redis write failed; not fatal')
    }
    return payload
  }
  // Typed onSend works with generic <string> payloads; any others pass through.
  app.addHook('onSend', onSend as never)
}

/**
 * Helper for routes that want to declare idempotency once: spread into
 * `config` on app.post/etc:
 *
 *   app.post('/thing', { config: idempotentConfig }, handler)
 */
export const idempotentConfig = { idempotent: true } as const

/**
 * Useful in tests and CLI to generate a key the way a client would.
 */
export function newIdempotencyKey(): string {
  return randomUUID().replace(/-/g, '')
}
