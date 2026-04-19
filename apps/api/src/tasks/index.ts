/**
 * Task registry. Every file in this directory that default-exports a
 * handler becomes a graphile-worker task. To add a new task:
 *
 *   1. Create `src/tasks/my-task.ts` exporting default `Task`.
 *   2. Add it to the `tasks` object below.
 *   3. Enqueue from anywhere: `enqueueJob('my-task', payload)`.
 */
import type { Task, TaskList } from 'graphile-worker'
import scheduledAction from './scheduled-action.js'

export const tasks: TaskList = {
  'scheduled-action': scheduledAction as Task,
}
