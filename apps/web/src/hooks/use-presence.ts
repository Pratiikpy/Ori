'use client'

/**
 * usePresence — sends periodic `heartbeat` events to the WebSocket so the
 * backend's Redis presence key stays alive. This is what makes
 * "presence.update" events meaningful and what lets the Web Push dispatcher
 * know a user is NOT online and should receive a push instead.
 */
import { useEffect } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { getSocket } from '@/lib/ws'

const HEARTBEAT_MS = 15_000

export function usePresence(enabled: boolean) {
  const { isConnected } = useInterwovenKit()

  useEffect(() => {
    if (!enabled || !isConnected) return
    const socket = getSocket()
    if (!socket) return // realtime disabled (no WS host configured)
    // Re-emit heartbeat whenever we reconnect.
    const onConnect = () => socket.emit('heartbeat')
    socket.on('connect', onConnect)
    if (socket.connected) socket.emit('heartbeat')

    const interval = setInterval(() => {
      if (socket.connected) socket.emit('heartbeat')
    }, HEARTBEAT_MS)

    return () => {
      clearInterval(interval)
      socket.off('connect', onConnect)
    }
  }, [enabled, isConnected])
}
