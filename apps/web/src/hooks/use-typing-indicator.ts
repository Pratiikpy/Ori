'use client'

/**
 * useTypingIndicator — bidirectional typing-indicator plumbing over Socket.IO.
 *
 * The server already relays `message.typing` events (see
 * apps/api/src/websocket/index.ts). This hook:
 *   - debounces outgoing `true`/`false` events so we don't spam the socket
 *   - tracks incoming typing state with auto-timeout (stale typing goes away
 *     if the counterpart's "false" event is lost)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from '@/lib/ws'

const IDLE_TIMEOUT_MS = 5_000
const EMIT_INTERVAL_MS = 2_000

type IncomingPayload = { chatId: string; from: string; isTyping: boolean }

export function useTypingIndicator(params: {
  chatId: string | null
  recipientAddress: string | null
}) {
  const { chatId, recipientAddress } = params
  const [remoteTyping, setRemoteTyping] = useState(false)
  const lastEmittedRef = useRef<{ ts: number; isTyping: boolean }>({ ts: 0, isTyping: false })
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen for incoming typing events scoped to this chat.
  useEffect(() => {
    if (!chatId) return
    const socket = getSocket()
    if (!socket) return // realtime disabled
    const onTyping = (payload: IncomingPayload) => {
      if (payload.chatId !== chatId) return
      setRemoteTyping(payload.isTyping)
      if (payload.isTyping) {
        // Auto-clear after idle timeout in case the remote's "false" is lost.
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        idleTimerRef.current = setTimeout(() => setRemoteTyping(false), IDLE_TIMEOUT_MS)
      }
    }
    socket.on('message.typing', onTyping)
    return () => {
      socket.off('message.typing', onTyping)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [chatId])

  /** Signal our own typing state. Debounced so we only emit ~once every 2s. */
  const setLocalTyping = useCallback(
    (isTyping: boolean) => {
      if (!chatId || !recipientAddress) return
      const now = Date.now()
      const last = lastEmittedRef.current
      const elapsed = now - last.ts
      // Always emit false immediately; throttle "true".
      if (isTyping && last.isTyping && elapsed < EMIT_INTERVAL_MS) return
      if (!isTyping && !last.isTyping) return
      lastEmittedRef.current = { ts: now, isTyping }
      getSocket()?.emit('message.typing', {
        chatId,
        recipientAddress,
        isTyping,
      })
    },
    [chatId, recipientAddress],
  )

  return { remoteTyping, setLocalTyping }
}
