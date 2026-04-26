'use client'

/**
 * SessionBoot — a mount-only component that runs side-effects after sign-in:
 *   - opens the WebSocket and authenticates
 *   - emits presence heartbeats
 *   - prompts for push notification permission once
 *
 * Placed once in the root layout (after Providers).
 */
import { useEffect } from 'react'
import { useSession } from '@/hooks/use-session'
import { usePresence } from '@/hooks/use-presence'
import { getSocket } from '@/lib/ws'
import { getSessionToken } from '@/lib/api'
import { ensurePushSubscription } from '@/lib/push-client'

export function SessionBoot() {
  const { isAuthenticated } = useSession()
  usePresence(isAuthenticated)

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
