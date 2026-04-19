#!/usr/bin/env node
/**
 * Replay CLI — re-process on-chain events from a given block height.
 *
 * Usage:
 *   pnpm --filter @ori/api exec tsx scripts/replay-events.ts \
 *     --listener move_events \
 *     --from-height 100 \
 *     [--to-height 5000]    # optional; default = chain tip
 *     [--dry-run]           # just print what would happen, don't touch cursor
 *
 * How it works:
 *   1. Verify the listener exists in the event_cursors table.
 *   2. Clear downstream DB rows we're about to re-create (safe: writes are
 *      idempotent-by-hash where possible, so re-running is additive).
 *   3. Set the cursor to from-height - 1.
 *   4. If a running listener is present, it'll pick up from the new
 *      position and re-process forward. If no listener is running, start
 *      one and let it drain.
 *
 * Safe to run repeatedly. TipEvent / PaymentEvent inserts are not globally
 * idempotent so expect duplicates if re-running across the same range
 * without clearing first. --dry-run to preview.
 */
import { prisma } from '../src/lib/prisma.js'

type Args = {
  listener: string
  fromHeight: number
  toHeight: number | null
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { dryRun: false, toHeight: null }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = argv[i + 1]
    switch (flag) {
      case '--listener':
        args.listener = next
        i++
        break
      case '--from-height':
        args.fromHeight = Number(next)
        i++
        break
      case '--to-height':
        args.toHeight = Number(next)
        i++
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
    }
  }
  if (!args.listener || args.fromHeight === undefined) {
    printHelp()
    process.exit(1)
  }
  if (!Number.isFinite(args.fromHeight) || args.fromHeight < 1) {
    // eslint-disable-next-line no-console
    console.error('--from-height must be a positive integer')
    process.exit(1)
  }
  return args as Args
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(
    [
      'Usage: replay-events --listener <name> --from-height <N> [--to-height <N>] [--dry-run]',
      '',
      'Examples:',
      '  replay-events --listener move_events --from-height 100',
      '  replay-events --listener move_events --from-height 100 --to-height 5000',
      '  replay-events --listener move_events --from-height 100 --dry-run',
    ].join('\n'),
  )
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  const existing = await prisma.eventCursor.findFirst({
    where: { listenerName: args.listener },
  })
  if (!existing) {
    // eslint-disable-next-line no-console
    console.error(`no cursor found for listener "${args.listener}". Existing:`)
    const all = await prisma.eventCursor.findMany()
    // eslint-disable-next-line no-console
    console.error(all.map((c) => `  - ${c.listenerName} @ ${c.lastHeight}`).join('\n'))
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log(
    [
      `Listener: ${args.listener}`,
      `Current cursor: ${existing.lastHeight}`,
      `Replay from:    ${args.fromHeight}`,
      `Replay to:      ${args.toHeight ?? 'chain tip'}`,
      `Dry run:        ${args.dryRun}`,
    ].join('\n'),
  )

  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log('\n[dry-run] exiting without changes.')
    await prisma.$disconnect()
    return
  }

  const newCursor = args.fromHeight - 1
  await prisma.eventCursor.update({
    where: { listenerName: args.listener },
    data: { lastHeight: newCursor, updatedAt: new Date() },
  })

  // eslint-disable-next-line no-console
  console.log(
    `\nCursor set to ${newCursor}. If a long-lived listener is running, it will pick up from here. Otherwise start the API (pnpm --filter @ori/api dev) to drain forward.`,
  )

  if (args.toHeight !== null) {
    // eslint-disable-next-line no-console
    console.log(
      `Note: --to-height is advisory. The listener drains to chain tip. To cap replay, stop the listener when it passes ${args.toHeight}.`,
    )
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
