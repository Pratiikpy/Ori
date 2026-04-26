/**
 * Cron routes — single-shot endpoints external schedulers (Vercel Cron,
 * GitHub Actions, cron-job.org) can hit on a fixed cadence to drive
 * background work that doesn't fit Vercel's stateless function model.
 *
 * Currently:
 *   POST /v1/cron/sync-events
 *     Pulls one batch of new blocks from the rollup, decodes Move events,
 *     persists to Postgres + emits Redis pub/sub. Replaces the
 *     long-running EventListener loop on serverless deploys.
 *
 * Auth: shared-secret header (X-Cron-Secret) compared against
 * CRON_SHARED_SECRET. Fail-closed if the env var is unset so a
 * misconfigured deploy doesn't accidentally expose the route.
 */
import type { FastifyInstance } from 'fastify'

export async function cronRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/cron/sync-events', async (request, reply) => {
    const expected = process.env.CRON_SHARED_SECRET ?? ''
    const provided = request.headers['x-cron-secret']
    if (!expected) {
      await reply.status(503).send({
        error: 'CRON_NOT_CONFIGURED',
        message: 'Server is missing CRON_SHARED_SECRET env var.',
      })
      return
    }
    if (
      typeof provided !== 'string' ||
      provided.length === 0 ||
      provided !== expected
    ) {
      await reply
        .status(401)
        .send({ error: 'CRON_UNAUTHORIZED', message: 'Bad or missing X-Cron-Secret.' })
      return
    }
    try {
      // Dynamic import keeps EventListener (and its @ori/event-decoder
      // dependency) OUT of the web catchall's static bundle. Next's
      // bundler can't resolve event-decoder's .js extension imports
      // when statically analysed; loading it lazily at request time
      // works around that without forcing every other route through
      // the same dynamic-import dance.
      const { EventListener } = await import('../services/eventListener.js')
      const noopIo = {
        to: () => ({ emit: (): void => {} }),
        emit: (): void => {},
      } as unknown as ConstructorParameters<typeof EventListener>[0]
      const listener = new EventListener(noopIo)
      const result = await listener.scanOnce()
      await reply.send(result)
    } catch (err) {
      request.log.error({ err }, 'cron sync-events failed')
      await reply.status(500).send({
        error: 'CRON_SYNC_FAILED',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  })
}
