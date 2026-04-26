/**
 * Agent action routes.
 *
 * The agent attribution layer: every on-chain action an MCP signer takes
 * on behalf of a user is recorded here. Lets us build a "what has my
 * agent done lately" dashboard that's the same transparency guarantee
 * Caleb ships for trading, generalized to every tool.
 *
 * Routes:
 *   POST /v1/agent/log        -- MCP server writes an action (auth via
 *                                shared secret; this is backend-to-backend)
 *   GET  /v1/agent/:addr/actions -- read timeline for an agent signer
 *   GET  /v1/agent/user/:addr/actions -- read actions on behalf of a user
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { idempotentConfig } from '../middleware/idempotency.js'
import { enqueueJob } from '../lib/worker.js'

const AddressParam = z.string().regex(/^init1[a-z0-9]+$/, 'must be bech32 init1...')

const LogBody = z.object({
  ownerAddr: AddressParam,
  agentAddr: AddressParam,
  toolName: z.string().min(1).max(80),
  argsJson: z.record(z.string(), z.unknown()).or(z.string()),
  promptHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/, 'must be 64 hex chars (sha256)')
    .optional(),
  txHash: z.string().regex(/^[A-F0-9]+$/, 'must be uppercase hex').optional(),
  resultJson: z.record(z.string(), z.unknown()).or(z.string()).optional(),
  status: z.enum(['pending', 'success', 'failed']).optional().default('success'),
  errorMsg: z.string().max(500).optional(),
})

const PageQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const ScheduleBody = z.object({
  ownerAddr: AddressParam,
  agentAddr: AddressParam,
  kind: z.enum(['tip', 'purchase_paywall', 'subscribe_renew', 'predict']),
  args: z.record(z.string(), z.unknown()),
  // When to run. Either a one-shot timestamp OR a simple "every-N-seconds"
  // cadence. Both in seconds / ISO timestamps to keep the wire boring.
  runAt: z.string().datetime().optional(),
  runInSeconds: z.coerce.number().int().min(30).max(365 * 24 * 60 * 60).optional(),
  promptHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(25).optional().default(5),
})

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Append-only log endpoint. MCP server calls this after every tool
   * invocation. Idempotent via Idempotency-Key header (MCP generates a
   * UUID per-call) so a flaky network retry doesn't create duplicate
   * attribution rows.
   *
   * AUTH: shared-secret header (X-Agent-Log-Secret). The MCP server is
   * the only legitimate caller and runs in the same trust zone as the
   * API; without this guard, any anonymous client could POST forged
   * agent attribution rows for arbitrary owner/agent addresses, which
   * the profile / inbox UI surfaces directly. Configure
   * AGENT_LOG_SHARED_SECRET in the API env. If unset, requests are
   * rejected — fail-closed so a misconfigured deploy doesn't open the
   * endpoint.
   */
  app.post(
    '/v1/agent/log',
    { config: idempotentConfig },
    async (req, reply) => {
      const expected = process.env.AGENT_LOG_SHARED_SECRET ?? ''
      const provided = req.headers['x-agent-log-secret']
      if (!expected) {
        req.log.error(
          'AGENT_LOG_SHARED_SECRET not set — refusing /v1/agent/log',
        )
        await reply.status(503).send({
          error: 'AGENT_LOG_NOT_CONFIGURED',
          message: 'Server is missing AGENT_LOG_SHARED_SECRET env var.',
        })
        return
      }
      if (
        typeof provided !== 'string' ||
        provided.length === 0 ||
        provided !== expected
      ) {
        await reply.status(401).send({
          error: 'AGENT_LOG_UNAUTHORIZED',
          message: 'Missing or invalid X-Agent-Log-Secret header.',
        })
        return
      }
      const parsed = LogBody.safeParse(req.body)
      if (!parsed.success) {
        await reply.status(400).send({
          error: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        })
        return
      }
      const body = parsed.data
      const argsJsonStr =
        typeof body.argsJson === 'string' ? body.argsJson : JSON.stringify(body.argsJson)
      const resultJsonStr = body.resultJson
        ? typeof body.resultJson === 'string'
          ? body.resultJson
          : JSON.stringify(body.resultJson)
        : null

      const action = await prisma.agentAction.create({
        data: {
          ownerAddr: body.ownerAddr,
          agentAddr: body.agentAddr,
          toolName: body.toolName,
          argsJson: argsJsonStr,
          promptHash: body.promptHash ?? null,
          txHash: body.txHash ?? null,
          resultJson: resultJsonStr,
          status: body.status,
          errorMsg: body.errorMsg ?? null,
          settledAt:
            body.status === 'success' || body.status === 'failed' ? new Date() : null,
        },
      })

      await reply.status(201).send({ id: action.id, createdAt: action.createdAt })
    },
  )

  /**
   * Schedule an agent action for later execution via Graphile Worker.
   * Returns the job-key we used so the caller can cancel or inspect later.
   * Idempotent on Idempotency-Key header: a retry with the same key is a no-op.
   */
  app.post(
    '/v1/agent/schedule',
    { config: idempotentConfig },
    async (req, reply) => {
      const parsed = ScheduleBody.safeParse(req.body)
      if (!parsed.success) {
        await reply.status(400).send({
          error: 'VALIDATION_ERROR',
          issues: parsed.error.issues,
        })
        return
      }
      const body = parsed.data

      const runAt = body.runAt
        ? new Date(body.runAt)
        : body.runInSeconds
          ? new Date(Date.now() + body.runInSeconds * 1000)
          : null
      if (!runAt) {
        await reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Either runAt (ISO ts) or runInSeconds must be provided.',
        })
        return
      }
      if (runAt.getTime() < Date.now() + 20_000) {
        await reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'runAt must be at least 20 seconds in the future.',
        })
        return
      }

      // Use a deterministic jobKey so duplicate POSTs coalesce (in addition
      // to HTTP-level idempotency). Format: owner + agent + kind + ts.
      const jobKey = `schedule:${body.ownerAddr}:${body.agentAddr}:${body.kind}:${runAt.getTime()}`

      try {
        await enqueueJob(
          'scheduled-action',
          {
            kind: body.kind,
            ownerAddr: body.ownerAddr,
            agentAddr: body.agentAddr,
            promptHash: body.promptHash,
            args: body.args,
          },
          {
            runAt,
            maxAttempts: body.maxAttempts,
            jobKey,
            jobKeyMode: 'replace',
          },
        )
      } catch (err) {
        req.log.error({ err }, 'failed to enqueue scheduled-action')
        await reply.status(503).send({
          error: 'WORKER_UNAVAILABLE',
          message: 'Job queue not running; try again shortly.',
        })
        return
      }

      await reply.status(202).send({
        status: 'scheduled',
        kind: body.kind,
        runAt: runAt.toISOString(),
        jobKey,
      })
    },
  )

  /** Timeline for a specific agent signing address (regardless of owner). */
  app.get('/v1/agent/:addr/actions', async (req, reply) => {
    const addr = AddressParam.safeParse((req.params as { addr: string }).addr)
    if (!addr.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const q = PageQuery.safeParse(req.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }
    const cursor = q.data.cursor ? new Date(q.data.cursor) : null
    const rows = await prisma.agentAction.findMany({
      where: {
        agentAddr: addr.data,
        createdAt: cursor ? { lt: cursor } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: q.data.limit,
    })
    const nextCursor =
      rows.length === q.data.limit ? rows[rows.length - 1]!.createdAt.toISOString() : null
    await reply.send({
      agentAddr: addr.data,
      entries: rows.map(serialize),
      nextCursor,
    })
  })

  /** Timeline of everything done ON BEHALF OF a user (any signing agent). */
  app.get('/v1/agent/user/:addr/actions', async (req, reply) => {
    const addr = AddressParam.safeParse((req.params as { addr: string }).addr)
    if (!addr.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const q = PageQuery.safeParse(req.query)
    if (!q.success) {
      await reply.status(400).send({ error: 'INVALID_QUERY' })
      return
    }
    const cursor = q.data.cursor ? new Date(q.data.cursor) : null
    const rows = await prisma.agentAction.findMany({
      where: {
        ownerAddr: addr.data,
        createdAt: cursor ? { lt: cursor } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: q.data.limit,
    })
    const nextCursor =
      rows.length === q.data.limit ? rows[rows.length - 1]!.createdAt.toISOString() : null
    await reply.send({
      ownerAddr: addr.data,
      entries: rows.map(serialize),
      nextCursor,
    })
  })
}

function serialize(row: {
  id: string
  ownerAddr: string
  agentAddr: string
  toolName: string
  argsJson: string
  promptHash: string | null
  txHash: string | null
  resultJson: string | null
  status: string
  errorMsg: string | null
  createdAt: Date
  settledAt: Date | null
}): Record<string, unknown> {
  let args: unknown = row.argsJson
  try {
    args = JSON.parse(row.argsJson)
  } catch {
    // keep raw string
  }
  let result: unknown = null
  if (row.resultJson) {
    try {
      result = JSON.parse(row.resultJson)
    } catch {
      result = row.resultJson
    }
  }
  return {
    id: row.id,
    ownerAddr: row.ownerAddr,
    agentAddr: row.agentAddr,
    toolName: row.toolName,
    args,
    promptHash: row.promptHash,
    txHash: row.txHash,
    result,
    status: row.status,
    errorMsg: row.errorMsg,
    createdAt: row.createdAt.toISOString(),
    settledAt: row.settledAt?.toISOString() ?? null,
  }
}
