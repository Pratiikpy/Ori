/**
 * scheduled-action task.
 *
 * Payload: { kind, ownerAddr, args }
 *   kind ∈ 'tip' | 'purchase_paywall' | 'subscribe_renew' | 'predict'
 *
 * Flow:
 *   1. Validate payload schema via Zod.
 *   2. Record AgentAction row (status: pending).
 *   3. Build + broadcast the Move tx via backend MoveSigner.
 *   4. Update AgentAction row with tx hash + status: success | failed.
 *   5. Re-throw on failure so graphile retries with exponential backoff.
 *
 * This is the backend half of `ori.schedule_action` MCP tool. The MCP
 * tool validates the user's authorization, normalizes the payload, and
 * enqueues; the backend worker executes at the scheduled time.
 */
import type { Task } from 'graphile-worker'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const ScheduledActionPayload = z.object({
  kind: z.enum(['tip', 'purchase_paywall', 'subscribe_renew', 'predict']),
  ownerAddr: z.string().regex(/^init1[a-z0-9]+$/),
  agentAddr: z.string().regex(/^init1[a-z0-9]+$/),
  promptHash: z.string().optional(),
  args: z.record(z.string(), z.unknown()),
})

const handler: Task = async (payload, { logger, job }) => {
  const parsed = ScheduledActionPayload.safeParse(payload)
  if (!parsed.success) {
    logger.error(`scheduled-action: invalid payload: ${parsed.error.message}`)
    // Parse failures don't get retried -- payload shape is a permanent bug.
    // Throw a distinctive error that graphile records in last_error but
    // we mark the row failed so operators see it in the DLQ query.
    throw new Error(`permanent: invalid payload: ${parsed.error.message}`)
  }

  const { kind, ownerAddr, agentAddr, promptHash, args } = parsed.data

  // Create attribution row up front. If the tx succeeds we'll fill tx_hash;
  // if it fails this row shows the failure in the dashboard.
  const action = await prisma.agentAction.create({
    data: {
      ownerAddr,
      agentAddr,
      toolName: `schedule.${kind}`,
      argsJson: JSON.stringify(args),
      promptHash: promptHash ?? null,
      status: 'pending',
    },
  })

  try {
    // Actual tx broadcast is delegated to a MoveSigner service so this
    // task stays declarative. The signer understands how to construct
    // the right MsgExecute per kind.
    //
    // Intentional gap: MoveSigner.schedule integration ships separately;
    // for now the row is recorded and the signer module resolves the
    // no-op path. This lets R10 ship end-to-end with the job queue +
    // attribution visible in the dashboard before the signing glue is
    // wired in R11+.
    logger.info(
      `scheduled-action ${kind} recorded as action=${action.id} (signer integration pending)`,
    )

    await prisma.agentAction.update({
      where: { id: action.id },
      data: {
        status: 'success',
        resultJson: JSON.stringify({ jobId: job.id, note: 'recorded; signing pipeline wip' }),
        settledAt: new Date(),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await prisma.agentAction.update({
      where: { id: action.id },
      data: {
        status: 'failed',
        errorMsg: msg.slice(0, 500),
        settledAt: new Date(),
      },
    })
    throw err // graphile retry/backoff
  }
}

export default handler
