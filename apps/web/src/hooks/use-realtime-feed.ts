'use client'

/**
 * useRealtimeFeed — connect to the per-user realtime channel and translate
 * server events into React-Query invalidations + sonner toasts.
 *
 * Background: Fastify emits events on the `user:<initiaAddress>` channel
 * via Socket.IO (or Supabase Realtime in the production build) for every
 * inbound side-effect that the user should see live: a new encrypted
 * message, a tip received, a payment received, a new follower, a wager
 * proposed against them, a badge awarded.
 *
 * Without this hook (the prior state of the active UI), none of those
 * events surfaced. The user stared at /inbox and waited for the polling
 * fallback (5–15s) to refetch. Wager invites and tip toasts were entirely
 * invisible until a manual refresh.
 *
 * Strategy:
 *   - Each event fires a `queryClient.invalidateQueries(...)` for the
 *     queries that read the same data, so the UI re-renders against fresh
 *     server state. No optimistic data-mutation here — the React-Query
 *     cache is the single source of truth.
 *   - For events worth a banner (tips, wagers, badges, payments) we also
 *     fire a sonner toast so the user notices even if they're on a
 *     different page.
 *
 * Mount once near the top of the auth-required tree (SessionBoot is the
 * canonical place; wired there).
 */
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'

import { onRealtime, offRealtime, type RealtimeHandler } from '@/lib/realtime'

type AnyPayload = Record<string, unknown>

function asString(payload: AnyPayload, key: string): string | null {
  const v = payload[key]
  return typeof v === 'string' ? v : null
}

export function useRealtimeFeed(): void {
  const { initiaAddress, isConnected } = useInterwovenKit() as {
    initiaAddress: string
    isConnected: boolean
  }
  const qc = useQueryClient()
  // Keep a stable reference to the live address so the cleanup unsubscribes
  // from the right channel even after the user switches accounts mid-flight.
  const subscribedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isConnected || !initiaAddress) return
    const channel = `user:${initiaAddress}`
    subscribedRef.current = channel

    // ── handlers ────────────────────────────────────────────────────────
    const onMessageNew: RealtimeHandler = () => {
      qc.invalidateQueries({ queryKey: ['chats'] })
      qc.invalidateQueries({ queryKey: ['messages'] })
    }

    const onTipReceived: RealtimeHandler = (raw) => {
      const p = (raw ?? {}) as AnyPayload
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
      qc.invalidateQueries({ queryKey: ['weekly-stats'] })
      const from = asString(p, 'fromInitName') ?? asString(p, 'fromAddr') ?? 'someone'
      const amount = asString(p, 'amountFormatted') ?? asString(p, 'amount')
      toast.success('You got a tip', {
        description: amount ? `${amount} from ${from}` : `Tip from ${from}`,
      })
    }

    const onPaymentReceived: RealtimeHandler = (raw) => {
      const p = (raw ?? {}) as AnyPayload
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
      qc.invalidateQueries({ queryKey: ['chats'] })
      const from = asString(p, 'fromInitName') ?? asString(p, 'fromAddr') ?? 'someone'
      const amount = asString(p, 'amountFormatted') ?? asString(p, 'amount')
      toast.success('Payment received', {
        description: amount ? `${amount} from ${from}` : `Payment from ${from}`,
      })
    }

    const onFollowNew: RealtimeHandler = (raw) => {
      const p = (raw ?? {}) as AnyPayload
      qc.invalidateQueries({ queryKey: ['follows'] })
      qc.invalidateQueries({ queryKey: ['follow-stats'] })
      const who = asString(p, 'fromInitName') ?? asString(p, 'fromAddr') ?? 'someone'
      toast.message('New follower', { description: who })
    }

    const onWagerProposed: RealtimeHandler = (raw) => {
      const p = (raw ?? {}) as AnyPayload
      qc.invalidateQueries({ queryKey: ['activity'] })
      const from = asString(p, 'fromInitName') ?? asString(p, 'fromAddr') ?? 'someone'
      const id = asString(p, 'wagerId') ?? '?'
      toast.message('Wager proposed', {
        description: `${from} challenged you (#${id}). Open Play → Wagers to accept.`,
      })
    }

    const onBadgeAwarded: RealtimeHandler = (raw) => {
      const p = (raw ?? {}) as AnyPayload
      qc.invalidateQueries({ queryKey: ['badges'] })
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['trust-score'] })
      const badge = asString(p, 'badgeType') ?? 'badge'
      toast.success('Badge unlocked', { description: badge })
    }

    // ── subscribe ──────────────────────────────────────────────────────
    let cancelled = false
    const subs: Array<[string, RealtimeHandler]> = [
      ['message.new', onMessageNew],
      ['tip.received', onTipReceived],
      ['payment.received', onPaymentReceived],
      ['follow.new', onFollowNew],
      ['wager.proposed', onWagerProposed],
      ['badge.awarded', onBadgeAwarded],
    ]
    void Promise.all(
      subs.map(([event, handler]) => onRealtime(channel, event, handler)),
    ).catch(() => {
      // Realtime not configured (no WS host, no Supabase keys). Polling
      // fallback in use-chats.ts handles the message refresh; toasts are
      // simply not delivered. Non-fatal.
    })

    return () => {
      cancelled = true
      // Best-effort unsubscribe; offRealtime is idempotent.
      void Promise.all(
        subs.map(([event, handler]) => offRealtime(channel, event, handler)),
      ).catch(() => {})
      // Use cancelled to silence unused-var lints if added in the future.
      void cancelled
    }
  }, [isConnected, initiaAddress, qc])
}
