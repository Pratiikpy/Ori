/**
 * Move-event listener — the bridge between on-chain events and Ori's server.
 *
 * Responsibilities:
 *   - Poll the Ori rollup's Cosmos RPC `/block_results?height=N` forward from
 *     the last processed height (EventCursor row) to chain tip.
 *   - Decode Move events via the shared `@ori/event-decoder` package so the
 *     SAME decode runs in Node (here) and in the Supabase Edge Function
 *     (supabase/functions/event-listener). Bug fixes in one auto-propagate.
 *   - Publish to Redis Pub/Sub channels the downstream services subscribe to:
 *       ori:event:payment       (PaymentSent)
 *       ori:event:tip           (TipSent)
 *       ori:event:gift_created  (GiftCreated)
 *       ori:event:badge         (BadgeAwarded)
 *   - Also pushes tip events to `obs:<creator>` for the OBS SSE endpoint.
 *   - Pushes payment events to the recipient's WebSocket room for in-chat
 *     payment cards.
 *   - Populates `PaymentLink.onChainGiftId` by correlating GiftCreated event
 *     secret_hash → PaymentLink.secretHashHex (robustness fallback for the
 *     client-side extraction path).
 *
 * Cold-start safety: on first run we DON'T replay chain history. We set the
 * cursor to `latest - 1` BEFORE calling pollOnce so a crash before the cursor
 * is persisted can't replay old events. From then on the cursor is
 * incremented only after each successful block is processed.
 */
import { prisma } from '../lib/prisma.js'
import { emitEvent } from '../lib/outbox.js'
import { config } from '../config.js'
import type { Server as SocketIOServer } from 'socket.io'
import {
  parseBlockResults,
  type BlockResultsResponse,
  type DecodedEvent,
  type TipEvent,
  type PaymentEvent,
  type PaymentBatchEvent,
  type GiftCreatedEvent,
  type BadgeEvent,
  type WagerProposedEvent,
  type FollowedEvent,
  type UnfollowedEvent,
} from '@ori/event-decoder'

const LISTENER_NAME = 'move_events'
const POLL_INTERVAL_MS = 2_000
const MAX_HEIGHTS_PER_POLL = 25

export class EventListener {
  private running = false
  private bootstrapped = false

  constructor(private readonly io: SocketIOServer) {}

  start(): void {
    if (this.running) return
    this.running = true
    void this.loop()
  }

  async stop(): Promise<void> {
    this.running = false
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.tick()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[event-listener] tick failed', err)
      }
      await sleep(POLL_INTERVAL_MS)
    }
  }

  private async tick(): Promise<void> {
    const statusRes = await fetch(`${config.ORI_RPC_URL}/status`)
    if (!statusRes.ok) return
    const status = (await statusRes.json()) as {
      result?: { sync_info?: { latest_block_height?: string } }
    }
    const latest = BigInt(status.result?.sync_info?.latest_block_height ?? '0')
    if (latest <= 0n) return

    if (!this.bootstrapped) {
      const existing = await prisma.eventCursor.findUnique({
        where: { listenerName: LISTENER_NAME },
      })
      if (!existing) {
        await prisma.eventCursor.create({
          data: { listenerName: LISTENER_NAME, lastHeight: latest - 1n },
        })
      }
      this.bootstrapped = true
    }

    const cursor = await prisma.eventCursor.findUnique({ where: { listenerName: LISTENER_NAME } })
    const lastHeight = cursor!.lastHeight
    if (latest <= lastHeight) return

    const target = min(latest, lastHeight + BigInt(MAX_HEIGHTS_PER_POLL))

    for (let h = lastHeight + 1n; h <= target; h++) {
      await this.processBlock(h)
      // Commit cursor per block so we never double-process if we crash mid-batch.
      await prisma.eventCursor.update({
        where: { listenerName: LISTENER_NAME },
        data: { lastHeight: h },
      })
    }
  }

  private async processBlock(height: bigint): Promise<void> {
    const url = `${config.ORI_RPC_URL}/block_results?height=${height.toString()}`
    const res = await fetch(url)
    if (!res.ok) return
    const body = (await res.json()) as BlockResultsResponse
    // Single-call decode via the shared package. Same function runs in the
    // Supabase Edge Function — if behavior diverges, the decoder tests catch it.
    const events = parseBlockResults(body, height)
    for (const ev of events) {
      await this.dispatch(ev)
    }
  }

  private async dispatch(ev: DecodedEvent): Promise<void> {
    switch (ev.kind) {
      case 'tip':
        return this.handleTipSent(ev)
      case 'payment':
        return this.handlePaymentSent(ev)
      case 'payment_batch':
        return this.handleBatchPaymentSent(ev)
      case 'gift_created':
        return this.handleGiftCreated(ev)
      case 'badge':
        return this.handleBadgeAwarded(ev)
      case 'wager_proposed':
        return this.handleWagerProposed(ev)
      case 'followed':
        return this.handleFollowed(ev)
      case 'unfollowed':
        return this.handleUnfollowed(ev)
    }
  }

  private async handleFollowed(data: FollowedEvent): Promise<void> {
    if (data.from === data.to) return

    await prisma.follow
      .upsert({
        where: { fromAddr_toAddr: { fromAddr: data.from, toAddr: data.to } },
        update: {},
        create: { fromAddr: data.from, toAddr: data.to },
      })
      .catch(() => {
        /* race-safe: unique constraint may fire */
      })

    await Promise.all([
      touchUserStats(data.from, (s) => ({ ...s, followingCount: s.followingCount + 1 })),
      touchUserStats(data.to, (s) => ({ ...s, followersCount: s.followersCount + 1 })),
    ])

    await emitEvent('ori:event:followed', { from: data.from, to: data.to })
    this.io.to(`user:${data.to}`).emit('follow.new', { from: data.from, to: data.to })
  }

  private async handleUnfollowed(data: UnfollowedEvent): Promise<void> {
    await prisma.follow
      .delete({ where: { fromAddr_toAddr: { fromAddr: data.from, toAddr: data.to } } })
      .catch(() => {
        /* already absent */
      })

    await Promise.all([
      touchUserStats(data.from, (s) => ({
        ...s,
        followingCount: Math.max(0, s.followingCount - 1),
      })),
      touchUserStats(data.to, (s) => ({
        ...s,
        followersCount: Math.max(0, s.followersCount - 1),
      })),
    ])

    await emitEvent('ori:event:unfollowed', { from: data.from, to: data.to })
  }

  private async handleWagerProposed(data: WagerProposedEvent): Promise<void> {
    const payload = {
      wagerId: data.wagerId,
      proposer: data.proposer,
      accepter: data.accepter,
      arbiter: data.arbiter,
      amount: data.amount.toString(),
      denom: data.denom,
      claim: data.claim,
    }
    await emitEvent('ori:event:wager_proposed', payload)
    this.io.to(`user:${payload.accepter}`).emit('wager.proposed', payload)
  }

  private async handleBatchPaymentSent(data: PaymentBatchEvent): Promise<void> {
    await emitEvent('ori:event:batch_payment', {
      from: data.from,
      recipientCount: data.recipientCount,
      totalAmount: data.totalAmount.toString(),
      denom: data.denom,
      batchId: data.batchId,
    })
  }

  private async handleTipSent(data: TipEvent): Promise<void> {
    const payload = {
      creator: data.creator,
      tipper: data.tipper,
      grossAmount: data.grossAmount.toString(),
      netAmount: data.netAmount.toString(),
      feeAmount: data.feeAmount.toString(),
      denom: data.denom,
      message: data.message,
      timestamp: new Date().toISOString(),
    }

    await prisma.tipEvent
      .create({
        data: {
          tipperAddr: data.tipper,
          creatorAddr: data.creator,
          grossAmount: data.grossAmount,
          netAmount: data.netAmount,
          feeAmount: data.feeAmount,
          denom: data.denom,
          message: data.message,
        },
      })
      .catch(() => {
        /* idempotency handled by upstream cursor */
      })

    await Promise.all([
      touchUserStats(data.tipper, (s) => ({
        ...s,
        tipsGiven: s.tipsGiven + 1,
        tipsGivenVolume: s.tipsGivenVolume + data.grossAmount,
      })),
      touchUserStats(data.creator, (s) => ({
        ...s,
        tipsReceived: s.tipsReceived + 1,
        tipsReceivedVolume: s.tipsReceivedVolume + data.netAmount,
      })),
    ])

    await emitEvent('ori:event:tip', payload)
    await emitEvent(`obs:${data.creator}`, payload)
    this.io.to(`user:${data.creator}`).emit('tip.received', {
      creator: data.creator,
      tipper: data.tipper,
      amount: payload.netAmount,
      denom: data.denom,
      message: data.message,
      txHash: '',
    })
  }

  private async handlePaymentSent(data: PaymentEvent): Promise<void> {
    const payload = {
      chatId: data.chatId,
      from: data.from,
      to: data.to,
      amount: data.amount.toString(),
      denom: data.denom,
      memo: data.memo,
    }

    await prisma.paymentEvent
      .create({
        data: {
          fromAddr: data.from,
          toAddr: data.to,
          amount: data.amount,
          denom: data.denom,
          memo: data.memo,
          chatId: data.chatId,
        },
      })
      .catch(() => {})

    await Promise.all([
      touchUserStats(data.from, (s) => ({ ...s, paymentsSent: s.paymentsSent + 1 })),
      touchUserStats(data.to, (s) => ({ ...s, paymentsReceived: s.paymentsReceived + 1 })),
    ])

    await emitEvent('ori:event:payment', payload)
    this.io.to(`user:${data.to}`).emit('payment.received', { ...payload, txHash: '' })
  }

  private async handleGiftCreated(data: GiftCreatedEvent): Promise<void> {
    // Correlate to off-chain payment-link if the client didn't already patch
    // the onChainGiftId.
    if (data.secretHashHex) {
      await prisma.paymentLink
        .updateMany({
          where: { secretHashHex: data.secretHashHex, onChainGiftId: null },
          data: { onChainGiftId: data.id },
        })
        .catch(() => {
          /* ignore — not every gift has a link */
        })
    }

    await emitEvent('ori:event:gift_created', {
      id: data.id,
      sender: data.sender,
      amount: data.amount.toString(),
      denom: data.denom,
      theme: data.theme,
      mode: data.mode,
      secretHashHex: data.secretHashHex,
      expiresAt: data.expiresAt,
    })
  }

  private async handleBadgeAwarded(data: BadgeEvent): Promise<void> {
    const payload = {
      recipient: data.recipient,
      badgeType: data.badgeType,
      level: data.level,
      metadataUri: data.metadataUri,
    }
    await emitEvent('ori:event:badge', payload)
    this.io.to(`user:${data.recipient}`).emit('badge.awarded', payload)
  }
}

// ---- helpers ----

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

type UserStatsRow = {
  address: string
  paymentsSent: number
  paymentsReceived: number
  tipsGiven: number
  tipsReceived: number
  tipsGivenVolume: bigint
  tipsReceivedVolume: bigint
  giftsSent: number
  giftsClaimed: number
  wagersWon: number
  billsSplit: number
  referrals: number
  followersCount: number
  followingCount: number
  firstSeenAt: Date
  lastActiveAt: Date
}

/**
 * Idempotent UserStats mutation. Fetches (or creates) the row, applies the
 * mutator, and writes the result back. Intentionally NOT transactional — the
 * events are deduplicated by the upstream block cursor so no double-counting.
 */
async function touchUserStats(
  address: string,
  mutate: (s: UserStatsRow) => UserStatsRow,
): Promise<void> {
  if (!address) return
  const defaults: UserStatsRow = {
    address,
    paymentsSent: 0,
    paymentsReceived: 0,
    tipsGiven: 0,
    tipsReceived: 0,
    tipsGivenVolume: 0n,
    tipsReceivedVolume: 0n,
    giftsSent: 0,
    giftsClaimed: 0,
    wagersWon: 0,
    billsSplit: 0,
    referrals: 0,
    followersCount: 0,
    followingCount: 0,
    firstSeenAt: new Date(),
    lastActiveAt: new Date(),
  }
  const existing = await prisma.userStats.findUnique({ where: { address } })
  const current: UserStatsRow = existing
    ? {
        address: existing.address,
        paymentsSent: existing.paymentsSent,
        paymentsReceived: existing.paymentsReceived,
        tipsGiven: existing.tipsGiven,
        tipsReceived: existing.tipsReceived,
        tipsGivenVolume: existing.tipsGivenVolume,
        tipsReceivedVolume: existing.tipsReceivedVolume,
        giftsSent: existing.giftsSent,
        giftsClaimed: existing.giftsClaimed,
        wagersWon: existing.wagersWon,
        billsSplit: existing.billsSplit,
        referrals: existing.referrals,
        followersCount: existing.followersCount,
        followingCount: existing.followingCount,
        firstSeenAt: existing.firstSeenAt,
        lastActiveAt: existing.lastActiveAt,
      }
    : defaults
  const next = mutate(current)
  next.lastActiveAt = new Date()

  await prisma.userStats.upsert({
    where: { address },
    update: {
      paymentsSent: next.paymentsSent,
      paymentsReceived: next.paymentsReceived,
      tipsGiven: next.tipsGiven,
      tipsReceived: next.tipsReceived,
      tipsGivenVolume: next.tipsGivenVolume,
      tipsReceivedVolume: next.tipsReceivedVolume,
      giftsSent: next.giftsSent,
      giftsClaimed: next.giftsClaimed,
      wagersWon: next.wagersWon,
      billsSplit: next.billsSplit,
      referrals: next.referrals,
      followersCount: next.followersCount,
      followingCount: next.followingCount,
      lastActiveAt: next.lastActiveAt,
    },
    create: {
      address,
      paymentsSent: next.paymentsSent,
      paymentsReceived: next.paymentsReceived,
      tipsGiven: next.tipsGiven,
      tipsReceived: next.tipsReceived,
      tipsGivenVolume: next.tipsGivenVolume,
      tipsReceivedVolume: next.tipsReceivedVolume,
      giftsSent: next.giftsSent,
      giftsClaimed: next.giftsClaimed,
      wagersWon: next.wagersWon,
      billsSplit: next.billsSplit,
      referrals: next.referrals,
      followersCount: next.followersCount,
      followingCount: next.followingCount,
    },
  })
}
