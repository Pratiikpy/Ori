'use client'

import Link from 'next/link'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Zap, ZapOff } from 'lucide-react'
import { useAutoSign } from '@/hooks/use-auto-sign'

/**
 * Shared app header for all logged-in pages. Matches the landing chrome:
 * sticky, glass-blurred, hairline border below. Brand lockup (outlined ring
 * + filled inner dot + serif O) is the same on every surface for continuity.
 */
export function Header({ title }: { title?: string }) {
  const { isConnected, openConnect, openWallet, username, initiaAddress } = useInterwovenKit()
  const { isEnabled: autoSignEnabled, enable, disable } = useAutoSign()

  const displayName = username ?? (initiaAddress ? shortenAddress(initiaAddress) : null)

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line-hairline)] backdrop-blur-xl bg-background/70 safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground" aria-hidden>
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
          <span className="text-[14px] font-medium tracking-tight">
            <span className="font-serif">{title ? title.charAt(0) : 'O'}</span>
            {title ? title.slice(1) : 'ri'}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              aria-label={autoSignEnabled ? 'Disable auto-sign' : 'Enable auto-sign'}
              title={autoSignEnabled ? 'Auto-sign on — payments are invisible' : 'Enable auto-sign'}
              onClick={() => void (autoSignEnabled ? disable() : enable())}
              className={
                'inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[11.5px] font-medium border transition ' +
                (autoSignEnabled
                  ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary-bright)]'
                  : 'bg-white/[0.04] border-border text-ink-3 hover:text-foreground hover:border-[var(--color-border-strong)]')
              }
            >
              {autoSignEnabled ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
              {autoSignEnabled ? '1-TAP' : 'OFF'}
            </button>
          )}

          {isConnected ? (
            <button
              onClick={openWallet}
              className="rounded-full px-3 h-8 bg-white/[0.04] hover:bg-white/[0.07] border border-border text-[11.5px] font-mono transition"
            >
              {displayName}
            </button>
          ) : (
            <button
              onClick={openConnect}
              className="rounded-full px-4 h-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-bright)] text-white text-[11.5px] font-medium transition"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function shortenAddress(addr: string): string {
  if (!addr) return ''
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}
