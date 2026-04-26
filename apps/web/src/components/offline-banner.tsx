'use client'

/**
 * OfflineBanner — sticky-top notice when navigator.onLine reports offline.
 *
 * Without this, when a user loses connection every fetch silently fails
 * into a generic toast and any in-flight tx flow appears to hang. The
 * banner gives them context: 'you're disconnected, retries will start
 * automatically when you're back'. We also pause/resume React-Query
 * refetches and Socket.IO realtime via the standard browser online/offline
 * events that those libs already listen to.
 *
 * Not rendered server-side — relies on `navigator`. Mounts inside the
 * client `Providers`/`OriShell` tree.
 */
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  // Initial value: assume online (true) on first render. The effect below
  // syncs to the actual navigator state on mount and listens for changes.
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const sync = (): void => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[10000] flex items-center justify-center gap-2 border-b border-[#FFA500] bg-[#FFA500]/95 px-4 py-2 text-sm text-black backdrop-blur"
      data-testid="offline-banner"
    >
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      <span className="font-medium">
        You're offline. Retrying when the connection comes back…
      </span>
    </div>
  )
}
