'use client'

/**
 * Sidebar — Emergent design parity.
 *
 *   • Top: small blue square brand mark + "Ori" wordmark
 *   • 5-item nav: Inbox / Money / Play / Explore / Profile
 *     (active = solid electric-blue pill, white text)
 *   • Pinned bottom: simulated/connected wallet card with .init name,
 *     short address, INIT balance, and Disconnect button.
 *
 * White sidebar, 1px right border. No glass, no blur.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Icon } from '@/components/ui/icon'
import { APP_NAV } from './nav-config'

export function Sidebar() {
  const pathname = usePathname() ?? ''
  const { isConnected, openConnect, openWallet, username, initiaAddress } =
    useInterwovenKit()

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex fixed left-0 top-0 h-dvh w-64 bg-white border-r border-[var(--color-line)] flex-col z-40"
    >
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--color-line)] shrink-0"
        aria-label="Ori home"
      >
        <span className="w-8 h-8 rounded-md bg-[var(--color-accent)] inline-flex items-center justify-center">
          <span className="block w-3 h-3 rounded-full bg-white" />
        </span>
        <span className="text-[18px] font-display font-bold text-ink tracking-[-0.02em]">
          Ori
        </span>
      </Link>

      {/* Nav */}
      <nav aria-label="Sections" className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {APP_NAV.map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex items-center gap-3 h-10 px-3 rounded-md text-[14px] font-medium transition cursor-pointer',
                active
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-ink-2 hover:text-ink hover:bg-[var(--color-surface-hover)]',
              ].join(' ')}
            >
              <Icon name={item.icon} size={16} weight={active ? 'fill' : 'regular'} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Wallet card — pinned bottom */}
      <div className="p-4 border-t border-[var(--color-line)] shrink-0">
        {isConnected ? (
          <div className="border border-[var(--color-line)] rounded-md p-3.5 bg-white">
            <div className="flex items-center gap-2 text-[12px] text-ink-3">
              <Icon name="wallet" size={14} />
              <span className="font-medium">Connected wallet</span>
            </div>
            <div className="mt-2.5 font-mono text-[13.5px] text-ink">
              {username ?? 'wallet.init'}
            </div>
            <div className="mt-1 font-mono text-[11px] text-ink-3 truncate">
              {shortAddr(initiaAddress)}
            </div>
            <button
              type="button"
              onClick={() => openWallet()}
              className="mt-3 w-full h-9 rounded-md border border-[var(--color-line-strong)] text-[12.5px] font-medium hover:bg-[var(--color-surface-hover)] transition cursor-pointer"
            >
              Open wallet
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void openConnect()}
            className="w-full h-10 rounded-md bg-[var(--color-ink)] text-white text-[13px] font-medium hover:opacity-85 active:scale-[0.98] transition cursor-pointer"
          >
            Connect wallet
          </button>
        )}
      </div>
    </aside>
  )
}

function shortAddr(addr: string | null | undefined): string {
  if (!addr) return ''
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}
