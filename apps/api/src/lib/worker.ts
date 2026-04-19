/**
 * Graphile Worker bootstrap.
 *
 * Why graphile-worker:
 *   - Postgres-backed (no new infrastructure -- reuses DATABASE_URL)
 *   - Exactly-once with automatic retries + exponential backoff
 *   - Built-in dead-letter queue (jobs that exhaust retries)
 *   - Cron-style scheduled jobs
 *   - LISTEN/NOTIFY for sub-second job pickup (not polling)
 *
 * Runs in-process with the API server. For high-volume deployments,
 * spin up a dedicated worker process with the same DATABASE_URL; both
 * speak to the same job table.
 *
 * Task registry: files in `src/tasks/` that default-export a handler.
 * Each filename is the task name. See `src/tasks/scheduled-action.ts`
 * for the pattern.
 */
import { run as runWorker, type Runner, type TaskList } from 'graphile-worker'
import { config } from '../config.js'

let runner: Runner | null = null

export async function startWorker(tasks: TaskList): Promise<void> {
  if (runner) return
  runner = await runWorker({
    connectionString: config.DATABASE_URL,
    concurrency: 4,
    // Sub-second job pickup via LISTEN/NOTIFY. Only falls back to polling
    // if the LISTEN connection drops.
    pollInterval: 2000,
    taskList: tasks,
  })
}

export async function stopWorker(): Promise<void> {
  if (!runner) return
  await runner.stop()
  runner = null
}

/**
 * Enqueue a job by task name. Falls through to the graphile_worker.jobs
 * table which the worker loop picks up. Options:
 *   - runAt: Date to schedule execution for
 *   - maxAttempts: retry budget (default 25)
 *   - jobKey + jobKeyMode: deduplication across enqueues
 */
export async function enqueueJob(
  taskName: string,
  payload: unknown,
  opts: {
    runAt?: Date
    maxAttempts?: number
    jobKey?: string
    jobKeyMode?: 'replace' | 'preserve_run_at' | 'unsafe_dedupe'
    queueName?: string
    priority?: number
  } = {},
): Promise<void> {
  if (!runner) throw new Error('worker not started; call startWorker() first')
  await runner.addJob(taskName, payload, {
    runAt: opts.runAt,
    maxAttempts: opts.maxAttempts,
    jobKey: opts.jobKey,
    jobKeyMode: opts.jobKeyMode,
    queueName: opts.queueName,
    priority: opts.priority,
  })
}
