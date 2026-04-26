'use client'

/**
 * SessionBoot — a mount-only component that drives the post-connect lifecycle:
 *   1. Auto-trigger the EIP-191 challenge → JWT exchange once the wallet is
 *      connected but no valid session token exists. Without this the user
 *      sees "Authorization required" on every protected API call (chats,
 *      profiles, etc.) because the Bearer header is empty.
 *   2. Once authenticated: open the WebSocket and authenticate it, emit
 *      presence heartbeats, and prompt for push notification permission.
 *
 * Placed once in the root layout (after Providers).
 */
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useSession } from '@/hooks/use-session'
import { usePresence } from '@/hooks/use-presence'
import { useRealtimeFeed } from '@/hooks/use-realtime-feed'
import { getSocket } from '@/lib/ws'
import { getSessionToken, clearSessionToken } from '@/lib/api'
import { ensurePushSubscription } from '@/lib/push-client'

export function SessionBoot() {
  const { status, isAuthenticated, signIn } = useSession()
  usePresence(isAuthenticated)

  // ─── Wallet-switch cache reset ─────────────────────────────────────────
  // When the connected wallet changes mid-session, every cached query is
  // for the previous user. Without an explicit reset the UI keeps showing
  // the old user's chats/portfolio/badges until each query's keyed `enabled`
  // boundary re-evaluates. Worse, the JWT in localStorage is for the old
  // address — the next protected call would 401 and trigger the auth-error
  // handler in providers.tsx, which we don't want when the user explicitly
  // switched accounts. Wipe the cache and the JWT together so the new
  // identity gets a clean slate.
  const qc = useQueryClient()
  const { initiaAddress } = useInterwovenKit() as { initiaAddress: string | null }
  const lastAddrRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = lastAddrRef.current
    if (prev && initiaAddress && prev !== initiaAddress) {
      // Address changed → clear cached data + auth token. SessionBoot's
      // signIn effect below will re-run for the new address.
      qc.removeQueries()
      clearSessionToken()
    }
    lastAddrRef.current = initiaAddress ?? null
  }, [initiaAddress, qc])
  // Subscribe the connected wallet to its per-user realtime channel and
  // wire each event to the appropriate React-Query invalidation + toast.
  // Lives inside SessionBoot so it auto-mounts everywhere (ori) routes
  // render through Providers, and unmounts on disconnect.
  useRealtimeFeed()

  // Auto-trigger sign-in when the wallet has connected but we don't yet have
  // a valid backend session. Fire-and-forget — errors surface in the
  // useSession hook's `error` state and the user can retry manually if a
  // signature prompt was rejected. The ref guards against repeating the
  // signature request when status flips between checking ↔ unauthenticated.
  const signedInOnce = useRef(false)
  useEffect(() => {
    if (status !== 'unauthenticated') return
    if (signedInOnce.current) return
    signedInOnce.current = true
    void signIn().catch(() => {
      // Allow retry on next status change (e.g. user reconnects wallet).
      signedInOnce.current = false
    })
  }, [status, signIn])

  useEffect(() => {
    if (!isAuthenticated) return
    const socket = getSocket()
    const token = getSessionToken()
    if (socket && token && socket.connected) {
      socket.emit('auth', { token })
    } else if (socket && token) {
      socket.once('connect', () => socket.emit('auth', { token }))
    }
    // Best-effort push subscription (awaits user permission on first call).
    void ensurePushSubscription().catch(() => {})
  }, [isAuthenticated])

  return null
}
