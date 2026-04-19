'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app-error]', error)
  }, [error])

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-danger/15 text-danger flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Something broke.</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The app hit an unexpected error. It's been logged. You can retry
            without losing your session.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-muted-foreground pt-2">
              ref: {error.digest}
            </p>
          )}
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 w-full rounded-2xl py-3 bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
        >
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
      </div>
    </main>
  )
}
