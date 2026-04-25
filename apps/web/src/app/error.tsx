'use client'

import { useEffect } from 'react'
import { LandingShell } from '@/components/layout/landing-shell'
import { Button, GlassCard, Icon } from '@/components/ui'

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
    <LandingShell>
      <section className="mx-auto w-full max-w-md px-5 py-20 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#B91C1C]/10 inline-flex items-center justify-center mb-5">
          <Icon name="warning" size={24} className="text-[#B91C1C]" />
        </div>
        <h1 className="text-[32px] font-display font-medium text-ink leading-tight tracking-[-0.02em]">
          Something broke.
        </h1>
        <p className="mt-3 text-[15px] text-ink-2 leading-[1.55]">
          The app hit an unexpected error. It's been logged. You can retry without losing your session.
        </p>
        {error.digest && (
          <GlassCard padding="sm" className="mt-4 inline-block">
            <span className="text-[11px] font-mono text-ink-3">
              ref: {error.digest}
            </span>
          </GlassCard>
        )}
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            leadingIcon="arrow-right"
            onClick={reset}
          >
            Try again
          </Button>
        </div>
      </section>
    </LandingShell>
  )
}
