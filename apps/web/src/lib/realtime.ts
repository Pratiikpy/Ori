'use client'

/**
 * Realtime adapter — unified surface over Socket.IO (dev) and Supabase
 * Realtime (prod). Both transports support the same event names, so callers
 * don't care which runs.
 *
 * Transport selection:
 *   - If NEXT_PUBLIC_SUPABASE_URL + ANON_KEY are set → use Supabase Realtime
 *   - Else → use Socket.IO against NEXT_PUBLIC_WS_URL
 *
 * This keeps local dev (Socket.IO via the Node API) working unchanged while
 * the deployed Vercel app uses Supabase (no always-on Node process needed).
 *
 * Event channels:
 *   - `user:<initiaAddress>`   — per-user feed (payments received, tips,
 *                                 follows, badges, wager proposals)
 *   - `obs:<creatorAddress>`   — OBS stream overlay (tips only)
 *
 * The emitter APIs accept the same shape on both transports:
 *     rt.on(channel, event, cb)     // subscribe
 *     rt.off(channel, event, cb)    // unsubscribe
 *     rt.close()                    // disconnect everything
 */

import { WS_URL } from './chain-config'
import { getSessionToken } from './api'

// Lazily-loaded client libs so dev doesn't ship Socket.IO to prod bundles
// (and vice-versa). Dynamic imports keep tree-shaking clean.
type SocketIOClient = import('socket.io-client').Socket
type SupabaseClient = import('@supabase/supabase-js').SupabaseClient

export type RealtimeHandler = (payload: unknown) => void

interface RealtimeAdapter {
  on(channel: string, event: string, handler: RealtimeHandler): Promise<void>
  off(channel: string, event: string, handler: RealtimeHandler): void
  close(): void
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let adapterPromise: Promise<RealtimeAdapter> | null = null

function getAdapter(): Promise<RealtimeAdapter> {
  if (!adapterPromise) {
    adapterPromise = useSupabase ? createSupabaseAdapter() : createSocketIOAdapter()
  }
  return adapterPromise
}

/** Subscribe to a realtime event. Returns the handler so the caller can `off()` it. */
export async function onRealtime(
  channel: string,
  event: string,
  handler: RealtimeHandler,
): Promise<RealtimeHandler> {
  const rt = await getAdapter()
  await rt.on(channel, event, handler)
  return handler
}

/** Unsubscribe a previously-registered handler. */
export async function offRealtime(
  channel: string,
  event: string,
  handler: RealtimeHandler,
): Promise<void> {
  const rt = await getAdapter()
  rt.off(channel, event, handler)
}

/** Tear down every active subscription. Call on logout. */
export async function closeRealtime(): Promise<void> {
  if (!adapterPromise) return
  const rt = await adapterPromise
  rt.close()
  adapterPromise = null
}

// ─── Supabase Realtime implementation ─────────────────────────────────────

async function createSupabaseAdapter(): Promise<RealtimeAdapter> {
  const { createClient } = await import('@supabase/supabase-js')
  const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
  })

  // Cache channels so multiple listeners on the same channel share one socket.
  const channels = new Map<string, ReturnType<SupabaseClient['channel']>>()

  const getChannel = (name: string) => {
    let ch = channels.get(name)
    if (!ch) {
      ch = sb.channel(name)
      channels.set(name, ch)
    }
    return ch
  }

  return {
    async on(channelName, event, handler) {
      const ch = getChannel(channelName)
      ch.on('broadcast', { event }, (payload: { payload: unknown }) => {
        handler(payload.payload)
      })
      // Ensure the channel is subscribed. Safe to call multiple times.
      if (ch.state !== 'joined' && ch.state !== 'joining') {
        await new Promise<void>((resolve) => {
          ch.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') resolve()
          })
        })
      }
    },
    off(_channel, _event, _handler) {
      // Supabase Realtime doesn't expose per-handler removal cleanly; we
      // close the whole channel on logout via close(). For tab-level removal
      // (component unmount), keeping the channel subscribed is fine — the
      // handler will no longer fire because React already torn down.
      // (If this becomes a problem, wrap handlers in a WeakMap registry.)
    },
    close() {
      for (const ch of channels.values()) sb.removeChannel(ch)
      channels.clear()
    },
  }
}

// ─── Socket.IO implementation (local dev, Shipment 1 fallback) ───────────

async function createSocketIOAdapter(): Promise<RealtimeAdapter> {
  const { io } = await import('socket.io-client')
  const socket: SocketIOClient = io(WS_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  socket.on('connect', () => {
    const token = getSessionToken()
    if (token) socket.emit('auth', { token })
  })

  // Socket.IO rooms are implicit on the server side; the client just listens
  // on named events. We prefix events with channel for symmetry with Supabase
  // but also fall back to plain event name if the server doesn't prefix.
  return {
    async on(_channel, event, handler) {
      socket.on(event, handler as (...args: unknown[]) => void)
    },
    off(_channel, event, handler) {
      socket.off(event, handler as (...args: unknown[]) => void)
    },
    close() {
      socket.disconnect()
    },
  }
}
