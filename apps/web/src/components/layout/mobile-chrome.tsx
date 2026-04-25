'use client'

/**
 * Mobile chrome — sticky topbar with hamburger that opens a slide-in drawer.
 *
 * Architecture:
 *   • <MobileTopbar/> renders at top on <lg breakpoints. Hamburger sets a
 *     "drawer open" state that we hold here in component-local state.
 *   • <MobileDrawer/> is the slide-in panel (full-height, w-72) that
 *     duplicates the desktop sidebar's nav items.
 *   • Backdrop click + ESC key both close it.
 *
 * Why duplicate nav rather than share a primitive: the rendering shapes are
 * different enough (sticky w-full vs slide-in w-72) that abstracting them
 * costs more than it saves. Source of truth is `APP_NAV` config.
 */
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Icon } from '@/components/ui/icon'
import { Avatar } from '@/components/ui/avatar'
import { APP_NAV, MORE_NAV } from './nav-config'

export function MobileChrome() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname() ?? ''
  const { isConnected, openConnect, openWallet, username, initiaAddress } =
    useInterwovenKit()

  // Close drawer on route change
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  // ESC closes drawer
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Lock body scroll when drawer open
  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  return (
    <>
      {/* Sticky topbar */}
      <header className="lg:hidden sticky top-0 z-30 glass-sidebar safe-area-top">
        <div className="flex items-center gap-2 h-14 px-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/60 border border-black/5 hover:bg-white/80 active:scale-95 transition"
          >
            <Icon name="menu" size={18} className="text-ink-2" />
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 ml-1"
            aria-label="Ori home"
          >
            <span className="w-7 h-7 rounded-xl bg-[#1D1D1F] inline-flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white" />
            </span>
            <span className="text-[16px] font-display font-medium text-ink tracking-[-0.02em]">
              Ori
            </span>
          </Link>
          <div className="ml-auto">
            {isConnected ? (
              <button
                type="button"
                onClick={() => openWallet()}
                className="rounded-full px-3 h-9 bg-white/60 border border-black/5 inline-flex items-center gap-2 text-[12px] text-ink"
              >
                <Avatar
                  seed={initiaAddress ?? username ?? 'ori'}
                  initial={username?.[0] ?? 'O'}
                  size="sm"
                  className="!w-6 !h-6"
                />
                <span className="font-mono">
                  {(username ?? shortAddr(initiaAddress)).slice(0, 12)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void openConnect()}
                className="rounded-full px-4 h-9 bg-[#1D1D1F] text-white text-[12.5px] font-medium hover:bg-black active:scale-95 transition"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />
          {/* Panel */}
          <aside
            role="dialog"
            aria-label="Navigation menu"
            className="lg:hidden fixed left-0 top-0 z-50 h-dvh w-72 glass-sidebar p-5 flex flex-col gap-6 safe-area-top"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                aria-label="Ori home"
              >
                <span className="w-9 h-9 rounded-2xl bg-[#1D1D1F] inline-flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                </span>
                <span className="text-[18px] font-display font-medium text-ink tracking-[-0.02em]">
                  Ori
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-white/60 border border-black/5 hover:bg-white/80 active:scale-95 transition"
              >
                <Icon name="x" size={16} className="text-ink-2" />
              </button>
            </div>

            <nav aria-label="Sections" className="flex-1 flex flex-col gap-1 overflow-y-auto -mx-2 px-2">
              {APP_NAV.map((item) => {
                const active = item.match(pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex items-center gap-3 h-12 px-4 rounded-full text-[14px] font-medium transition',
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

              <div className="mt-4 mb-1.5 px-4 text-[10.5px] uppercase tracking-[0.14em] text-ink-4 font-mono">
                More
              </div>
              {MORE_NAV.map((item) => {
                const active = item.match(pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex items-center gap-3 h-11 px-4 rounded-full text-[13.5px] font-medium transition',
                      active
                        ? 'bg-[#1D1D1F] text-white'
                        : 'text-ink-3 hover:text-ink hover:bg-black/5',
                    ].join(' ')}
                  >
                    <Icon
                      name={item.icon}
                      size={16}
                      weight={active ? 'fill' : 'regular'}
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="text-[11px] text-ink-4 font-mono">
              Built on bridged INIT.
            </div>
          </aside>
        </>
      )}
    </>
  )
}

function shortAddr(addr: string | null | undefined): string {
  if (!addr) return ''
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}
