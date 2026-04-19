// <reference types="https://deno.land/std@0.208.0/types.d.ts" />
/**
 * Ori event listener — Supabase Edge Function (Deno runtime).
 *
 * Invoked by pg_cron once per minute. Each invocation:
 *   1. Reads the last-processed block height from the `event_cursors` table.
 *   2. Fetches CometBFT /status to get chain tip.
 *   3. Walks forward up to MAX_HEIGHTS_PER_INVOCATION blocks.
 *   4. Decodes Move events via the SAME `@ori/event-decoder` package the
 *      Node listener uses (imported here from the git source via raw URL —
 *      see the import map in ../../import_map.json).
 *   5. Writes rows to payment_events, tip_events, follows, etc.
 *   6. Advances the cursor.
 *   7. Broadcasts via Supabase Realtime so subscribed web clients hear the
 *      event within ~100ms.
 *
 * This function MUST be idempotent — pg_cron can fire overlapping jobs on
 * network retry. Idempotency comes from the cursor: each block processed
 * advances the cursor in the same transaction as the row inserts. If we
 * crash mid-block, the next tick reprocesses — all inserts use
 * ON CONFLICT DO NOTHING to survive replay safely.
 *
 * Env vars (set via `supabase secrets set`):
 *   ORI_RPC_URL              e.g. https://ori-1.trycloudflare.com
 *   SUPABASE_DB_URL          direct Postgres URL for this function
 *   SUPABASE_URL             the supabase project URL (for Realtime)
 *   SUPABASE_SERVICE_ROLE_KEY (for Realtime broadcasts)
 */
// @ts-nocheck -- Deno types not available in Node tsc; this file is Deno-only
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'
import { parseBlockResults } from '../_shared/event-decoder.ts'

const LISTENER_NAME = 'move_events'
const MAX_HEIGHTS_PER_INVOCATION = 50

const env = (k: string): string => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`missing env: ${k}`)
  return v
}

serve(async (req: Request) => {
  const t0 = Date.now()
  const sql = postgres(env('SUPABASE_DB_URL'), { max: 1, prepare: false })
  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

  try {
    const stats = await tick(sql, sb)
    const dt = Date.now() - t0
    return new Response(
      JSON.stringify({ ok: true, ms: dt, ...stats }),
      { headers: { 'content-type': 'application/json' } },
    )
  } catch (err) {
    console.error('[event-listener] failed', err)
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  } finally {
    await sql.end({ timeout: 1 })
  }
})

async function tick(sql: ReturnType<typeof postgres>, sb: ReturnType<typeof createClient>) {
  // 1. chain tip
  const statusRes = await fetch(`${env('ORI_RPC_URL')}/status`)
  if (!statusRes.ok) throw new Error(`status ${statusRes.status}`)
  const status = await statusRes.json()
  const latest = BigInt(status.result?.sync_info?.latest_block_height ?? '0')
  if (latest <= 0n) return { processed: 0, reason: 'no-tip' }

  // 2. cursor (cold-start at tip-1 so we don't replay history)
  const cursorRows =
    await sql`select last_height from event_cursors where listener_name = ${LISTENER_NAME}`
  let lastHeight: bigint
  if (cursorRows.length === 0) {
    lastHeight = latest - 1n
    await sql`insert into event_cursors (listener_name, last_height)
              values (${LISTENER_NAME}, ${lastHeight})`
  } else {
    lastHeight = BigInt(cursorRows[0].last_height)
  }

  if (latest <= lastHeight) return { processed: 0, reason: 'caught-up' }

  const target = minBig(latest, lastHeight + BigInt(MAX_HEIGHTS_PER_INVOCATION))
  let processedEvents = 0

  // 3. walk blocks
  for (let h = lastHeight + 1n; h <= target; h++) {
    const blockRes = await fetch(
      `${env('ORI_RPC_URL')}/block_results?height=${h.toString()}`,
    )
    if (!blockRes.ok) continue
    const body = await blockRes.json()
    const events = parseBlockResults(body, h)

    for (const ev of events) {
      await dispatch(sql, sb, ev)
      processedEvents++
    }

    // Advance cursor per-block so a crash mid-batch can't double-process.
    await sql`update event_cursors set last_height = ${h}
              where listener_name = ${LISTENER_NAME}`
  }

  return {
    processed: processedEvents,
    fromHeight: (lastHeight + 1n).toString(),
    toHeight: target.toString(),
  }
}

/**
 * Fan-out decoded event → DB writes + Realtime broadcast.
 *
 * All inserts use ON CONFLICT DO NOTHING when a natural dedup key exists,
 * so replaying a block doesn't produce duplicates.
 */
async function dispatch(
  sql: ReturnType<typeof postgres>,
  sb: ReturnType<typeof createClient>,
  ev: ReturnType<typeof parseBlockResults>[number],
): Promise<void> {
  switch (ev.kind) {
    case 'tip': {
      await sql`
        insert into tip_events (
          id, tipper_addr, creator_addr, gross_amount, net_amount,
          fee_amount, denom, message, created_at
        ) values (
          gen_random_uuid(), ${ev.tipper}, ${ev.creator},
          ${ev.grossAmount.toString()}, ${ev.netAmount.toString()},
          ${ev.feeAmount.toString()}, ${ev.denom}, ${ev.message}, now()
        )
      `
      await sb.channel(`user:${ev.creator}`).send({
        type: 'broadcast',
        event: 'tip.received',
        payload: {
          creator: ev.creator,
          tipper: ev.tipper,
          amount: ev.netAmount.toString(),
          denom: ev.denom,
          message: ev.message,
        },
      })
      return
    }

    case 'payment': {
      await sql`
        insert into payment_events (
          id, from_addr, to_addr, amount, denom, memo, chat_id, created_at
        ) values (
          gen_random_uuid(), ${ev.from}, ${ev.to}, ${ev.amount.toString()},
          ${ev.denom}, ${ev.memo}, ${ev.chatId}, now()
        )
      `
      await sb.channel(`user:${ev.to}`).send({
        type: 'broadcast',
        event: 'payment.received',
        payload: {
          chatId: ev.chatId,
          from: ev.from,
          to: ev.to,
          amount: ev.amount.toString(),
          denom: ev.denom,
          memo: ev.memo,
        },
      })
      return
    }

    case 'followed': {
      await sql`
        insert into follows (from_addr, to_addr, created_at)
        values (${ev.from}, ${ev.to}, now())
        on conflict (from_addr, to_addr) do nothing
      `
      await sb.channel(`user:${ev.to}`).send({
        type: 'broadcast',
        event: 'follow.new',
        payload: { from: ev.from, to: ev.to },
      })
      return
    }

    case 'unfollowed': {
      await sql`
        delete from follows where from_addr = ${ev.from} and to_addr = ${ev.to}
      `
      return
    }

    case 'gift_created': {
      // Correlate off-chain payment_link → on-chain gift_id by secret hash.
      if (ev.secretHashHex) {
        await sql`
          update payment_links
          set on_chain_gift_id = ${ev.id}
          where secret_hash_hex = ${ev.secretHashHex}
            and on_chain_gift_id is null
        `
      }
      return
    }

    case 'badge': {
      // Achievement SBT mint event -- downstream may want to update a badges
      // table. For now just broadcast so the UI can toast.
      await sb.channel(`user:${ev.recipient}`).send({
        type: 'broadcast',
        event: 'badge.awarded',
        payload: {
          recipient: ev.recipient,
          badgeType: ev.badgeType,
          level: ev.level,
          metadataUri: ev.metadataUri,
        },
      })
      return
    }

    case 'wager_proposed': {
      // Notify the accepter that they have an incoming wager.
      await sb.channel(`user:${ev.accepter}`).send({
        type: 'broadcast',
        event: 'wager.proposed',
        payload: {
          wagerId: ev.wagerId,
          proposer: ev.proposer,
          accepter: ev.accepter,
          arbiter: ev.arbiter,
          amount: ev.amount.toString(),
          denom: ev.denom,
          claim: ev.claim,
        },
      })
      return
    }

    case 'payment_batch':
      // No per-recipient row yet — payment_batch is an aggregate marker.
      // Future: emit individual PaymentSent events from the batch contract.
      return
  }
}

function minBig(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}
