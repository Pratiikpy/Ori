import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'
import type { Server as SocketIOServer } from 'socket.io'

import { config, isProd } from './config.js'
import { errorHandler } from './middleware/errorHandler.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { messageRoutes } from './routes/messages.js'
import { linkRoutes } from './routes/links.js'
import { profileRoutes } from './routes/profiles.js'
import { chatRoutes } from './routes/chats.js'
import { obsRoutes } from './routes/obs.js'
import { pushRoutes } from './routes/push.js'
import { presenceRoutes } from './routes/presence.js'
import { followRoutes } from './routes/follows.js'
import { leaderboardRoutes } from './routes/leaderboards.js'
import { discoverRoutes } from './routes/discover.js'
import { activityRoutes } from './routes/activity.js'
import { trustRoutes } from './routes/trust.js'
import { questRoutes } from './routes/quests.js'
import { portfolioRoutes } from './routes/portfolio.js'
import { sponsorRoutes } from './routes/sponsor.js'
import { oracleRoutes } from './routes/oracle.js'
import { wellKnownRoutes } from './routes/wellKnown.js'
import { agentRoutes } from './routes/agent.js'
import { idempotencyPlugin } from './middleware/idempotency.js'

export type BuildAppOptions = {
  io?: SocketIOServer
}

/**
 * Build the Fastify instance. Accepts an optional Socket.IO server so it can
 * be decorated on the instance BEFORE routes register — that way any route
 * handler calling `app.io.to(...).emit(...)` sees the io instance immediately.
 * (The original ordering had us decorating after route registration which
 * works via Fastify's prototype lookups but is fragile.)
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: isProd ? undefined : { target: 'pino-pretty' },
    },
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024,
    genReqId: () => {
      // Short request ID — easier to correlate in logs.
      return Math.random().toString(36).slice(2, 10)
    },
  })

  if (options.io) {
    app.decorate('io', options.io)
  }

  app.setErrorHandler(errorHandler)

  // CSP has historically been off on this API because Privy + InterwovenKit
  // inject inline scripts/styles from the frontend, and the API is not itself
  // serving the frontend. We still want the other helmet defaults (X-Frame,
  // noSniff, referrer policy, etc.) and a MINIMAL API-only CSP that blocks
  // inline anything in responses this server emits (mostly JSON, but sensible
  // defense-in-depth against any future HTML paths).
  await app.register(helmet, {
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", 'https:', 'wss:'],
          },
        }
      : false, // dev: tooling (Next, Prisma Studio) needs eval/inline
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
  })

  await app.register(sensible)

  // Idempotency: opt-in per route via `config.idempotent = true`.
  // Routes that explicitly opt in get Redis-backed response caching keyed
  // on the client-provided Idempotency-Key header. See middleware/idempotency.ts.
  await idempotencyPlugin(app)

  // Global base rate limit — routes that need tighter limits declare their own.
  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: '1 minute',
    allowList: (req: FastifyRequest) =>
      req.url === '/health' || req.url === '/health/ready',
    keyGenerator: (req: FastifyRequest) => {
      const user = (req as unknown as { user?: { id: string } }).user
      if (user?.id) return `user:${user.id}`
      return (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip
    },
  })

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(profileRoutes)
  await app.register(chatRoutes)
  await app.register(messageRoutes)
  await app.register(linkRoutes)
  await app.register(obsRoutes)
  await app.register(pushRoutes)
  await app.register(presenceRoutes)
  await app.register(followRoutes)
  await app.register(leaderboardRoutes)
  await app.register(discoverRoutes)
  await app.register(activityRoutes)
  await app.register(trustRoutes)
  await app.register(questRoutes)
  await app.register(portfolioRoutes)
  await app.register(sponsorRoutes)
  await app.register(oracleRoutes)
  await app.register(wellKnownRoutes)
  await app.register(agentRoutes)

  return app
}
