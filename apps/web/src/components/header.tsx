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
      {/* Inner row keeps the same chrome height but caps width on desktop
          so brand-mark + actions are visually anchored to the same column
          as the page content below. */}
      <div className="flex items-center justify-between px-4 h-14 max-w-md md:max-w-2xl lg:max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Ori home">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground" aria-hidden>
            <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
          </svg>
          <span className="text-[14px] font-medium tracking-tight">
            <span className="font-serif">O</span>ri
          </span>
          {title && title !== 'Ori' && (
            <>
              <span className="text-ink-4 mx-1.5" aria-hidden>
                /
              </span>
              <span className="text-[13px] text-ink-2 font-medium">{title}</span>
            </>
          )}
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
              className="rounded-full px-3.5 h-8 text-[12px] text-foreground border border-[var(--color-border-strong)] hover:bg-white/[0.04] hover:border-[var(--color-border-emphasis)] transition inline-flex items-center gap-1.5"
            >
              Sign in
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
