/**
 * OBS overlay — Server-Sent Events stream of live tips for a creator.
 *
 * A creator points their OBS "Browser Source" at:
 *   https://ori.chat/obs/<creator.init>
 * That page opens an EventSource to:
 *   GET /v1/obs/stream/:creatorAddress
 *
 * The backend's Move event listener publishes tip events to a Redis Pub/Sub
 * channel keyed by creator address. This SSE endpoint subscribes to that
 * channel and forwards payloads to the browser in real time.
 */
import type { FastifyInstance } from 'fastify'
import IORedis from 'ioredis'
import { config } from '../config.js'

export async function obsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { creatorAddress: string } }>(
    '/v1/obs/stream/:creatorAddress',
    async (request, reply) => {
      const { creatorAddress } = request.params

      if (!/^init1[a-z0-9]+$/.test(creatorAddress)) {
        await reply.status(400).send({ error: 'INVALID_ADDRESS' })
        return
      }

      // Dedicated subscriber client — ioredis subscriptions block the connection
      // for other commands, so we use a one-off subscriber here.
      const subscriber = new IORedis(config.REDIS_URL, { lazyConnect: true })
      try {
        await subscriber.connect()
      } catch (err) {
        request.log.error({ err }, 'obs: redis subscriber connect failed')
        await reply.status(503).send({ error: 'STREAM_UNAVAILABLE' })
        return
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      // Initial hello + comment ping every 15s so proxies don't time out.
      reply.raw.write(`event: hello\ndata: ${JSON.stringify({ creatorAddress })}\n\n`)
      const keepAlive = setInterval(() => {
        reply.raw.write(`: ping\n\n`)
      }, 15_000)

      const channel = `obs:${creatorAddress}`
      await subscriber.subscribe(channel)

      subscriber.on('message', (_chan, raw) => {
        reply.raw.write(`event: tip\ndata: ${raw}\n\n`)
      })

      request.raw.on('close', async () => {
        clearInterval(keepAlive)
        try {
          await subscriber.unsubscribe(channel)
        } catch {
          /* noop */
        }
        subscriber.disconnect()
      })
    },
  )
}
