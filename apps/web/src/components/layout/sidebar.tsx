'use client'

/**
 * Sidebar — fixed left rail for the signed-in app, lg+ only.
 *
 * Anatomy (top → bottom):
 *   1. Brand lockup — small Ori mark + wordmark
 *   2. Nav items — pill-active style; current route fills with ink black
 *   3. Wallet status — connected pill OR Sign in button
 *
 * Hidden on <lg; mobile uses the drawer instead.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Icon } from '@/components/ui/icon'
import { Avatar } from '@/components/ui/avatar'
import { APP_NAV } from './nav-config'

export function Sidebar() {
  const pathname = usePathname() ?? ''
  const { isConnected, openConnect, openWallet, username, initiaAddress } =
    useInterwovenKit()

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex fixed left-0 top-0 h-dvh w-72 glass-sidebar p-6 flex-col gap-8 z-40"
    >
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-3 group shrink-0"
        aria-label="Ori home"
      >
        <span className="w-9 h-9 rounded-2xl bg-[#1D1D1F] inline-flex items-center justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-white" />
        </span>
        <span className="text-[18px] font-display font-medium text-ink tracking-[-0.02em]">
          Ori
        </span>
      </Link>

      {/* Wallet pill */}
      {isConnected ? (
        <button
          type="button"
          onClick={() => openWallet()}
          className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 border border-black/5 hover:bg-white/80 transition text-left"
        >
          <Avatar seed={initiaAddress ?? username ?? 'ori'} initial={username?.[0] ?? 'O'} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-ink truncate">
              {username ?? shortAddr(initiaAddress)}
            </div>
            <div className="text-[11px] text-ink-3 font-mono truncate">
              {initiaAddress ? shortAddr(initiaAddress) : 'Tap to connect'}
            </div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void openConnect()}
          className="h-12 rounded-full bg-[#1D1D1F] text-white text-[14px] font-medium hover:bg-black active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
        >
          Connect wallet
          <Icon name="arrow-right" size={14} />
        </button>
      )}

      {/* Nav */}
      <nav aria-label="Sections" className="flex-1 flex flex-col gap-1">
        {APP_NAV.map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex items-center gap-3 h-11 px-4 rounded-full text-[14px] font-medium transition',
                active
                  ? 'bg-[#1D1D1F] text-white'
                  : 'text-ink-2 hover:text-ink hover:bg-black/5',
              ].join(' ')}
            >
              <Icon
                name={item.icon}
                size={18}
                weight={active ? 'fill' : 'regular'}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer note */}
      <div className="text-[11px] text-ink-4 font-mono">
        Built on bridged INIT.
      </div>
    </aside>
  )
}

function shortAddr(addr: string | null | undefined): string {
  if (!addr) return ''
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}
