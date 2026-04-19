'use client'

/**
 * usePresenceSet — keeps a live Set<initiaAddress> of currently-online users
 * for a given list of addresses. Combines an initial batch fetch with live
 * WebSocket presence updates.
 */
import { useEffect, useState } from 'react'
import { fetchPresence } from '@/lib/api-presence'
import { getSocket } from '@/lib/ws'

type WsPresencePayload = { initiaAddress: string; status: 'online' | 'offline' }

export function usePresenceSet(addresses: string[]): Set<string> {
  const [online, setOnline] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false
    if (addresses.length === 0) {
      setOnline(new Set())
      return
    }
    void fetchPresence(addresses)
      .then((set) => {
        if (!cancelled) setOnline(set)
      })
      .catch(() => {
        /* non-fatal */
      })

    const socket = getSocket()
    const relevant = new Set(addresses)
    const onPresence = (p: WsPresencePayload) => {
      if (!relevant.has(p.initiaAddress)) return
      setOnline((prev) => {
        const next = new Set(prev)
        if (p.status === 'online') next.add(p.initiaAddress)
        else next.delete(p.initiaAddress)
        return next
      })
    }
    socket.on('presence.update', onPresence)
    return () => {
      cancelled = true
      socket.off('presence.update', onPresence)
    }
    // stringify to avoid effect storms when the same list is re-rendered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.join('|')])

  return online
}
