import { createServer } from 'node:http'
import { buildApp } from './server.js'
import { attachWebSocket } from './websocket/index.js'
import { config } from './config.js'
import { prisma } from './lib/prisma.js'
import { redis } from './lib/redis.js'
import { EventListener } from './services/eventListener.js'
import { AchievementIssuer } from './services/achievementIssuer.js'
import { outboxWorker } from './lib/outbox.js'
import { startWorker, stopWorker } from './lib/worker.js'
import { tasks } from './tasks/index.js'

async function main(): Promise<void> {
  // Build a Node HTTP server first so we can attach both Fastify AND Socket.IO
  // to the SAME underlying port. We then pass io into buildApp so routes can
  // see `app.io` from the first request.
  const httpServer = createServer()
  const io = attachWebSocket(httpServer)

  const app = await buildApp({ io })

  // Mount Fastify's router onto our pre-created HTTP server.
  app.server.close()
  httpServer.on('request', (req, res) => {
    app.routing(req, res)
  })
  await app.ready()

  httpServer.listen(config.PORT, config.HOST, () => {
    app.log.info(`Ori API (http + ws) listening on http://${config.HOST}:${config.PORT}`)
  })

  // Background services.
  // Start the outbox worker BEFORE the event listener so no event row sits
  // unpublished longer than one drain tick (500ms).
  outboxWorker.start()
  app.log.info('Outbox worker started')

  try {
    await startWorker(tasks)
    app.log.info('Graphile worker started (tasks: ' + Object.keys(tasks).join(', ') + ')')
  } catch (err) {
    app.log.error({ err }, 'Graphile worker failed to start; scheduled actions disabled')
  }

  const eventListener = new EventListener(io)
  eventListener.start()

  let issuer: AchievementIssuer | null = null
  if (config.BADGE_ISSUER_MNEMONIC) {
    try {
      issuer = await AchievementIssuer.create(config.BADGE_ISSUER_MNEMONIC)
      issuer.start()
      app.log.info('Achievement issuer started')
    } catch (err) {
      app.log.error({ err }, 'failed to start achievement issuer')
    }
  } else {
    app.log.warn('BADGE_ISSUER_MNEMONIC not set — badge auto-mint disabled')
  }

  const shutdown = async (signal: string) => {
    app.log.info(`received ${signal}, shutting down…`)
    try {
      await eventListener.stop()
      outboxWorker.stop()
      await stopWorker()
      if (issuer) await issuer.stop()
      io.close()
      await app.close()
      httpServer.close()
      await prisma.$disconnect()
      redis.disconnect()
      process.exit(0)
    } catch (err) {
      app.log.error({ err }, 'error during shutdown')
      process.exit(1)
    }
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'unhandled promise rejection')
  })
}

void main()

declare module 'fastify' {
  interface FastifyInstance {
    io: ReturnType<typeof attachWebSocket>
  }
}
