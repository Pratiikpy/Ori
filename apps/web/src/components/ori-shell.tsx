'use client'

/**
 * OriShell — brutalist app chrome (sidebar + topbar + mobile bottom nav).
 *
 * Verbatim port of ui-ref-orii/frontend/src/components/OriShell.jsx with:
 *   - NavLink → Link, useLocation → usePathname, <Outlet /> → {children}
 *   - Sidebar wallet card pulls real address + .init username from
 *     useInterwovenKit() + useUsernameQuery() (the wallet provider chain
 *     is mounted by the (ori) layout, so these hooks resolve here).
 *   - Disconnect button calls InterwovenKit's disconnect().
 *
 * Balance still comes from the mock until a chain-balance fetcher exists.
 * (TODO: real balance via the bank/move modules.)
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  CircleDollarSign,
  Compass,
  Gamepad2,
  Inbox,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useInterwovenKit, useUsernameQuery } from '@initia/interwovenkit-react'

import { Button } from '@/components/ui/button'
import { currentUser, navItems } from '@/data/ori-data'

function shortenAddress(address: string | undefined | null): string {
  if (!address) return '—'
  if (address.length <= 16) return address
  return `${address.slice(0, 8)}...${address.slice(-4)}`
}

type NavId = (typeof navItems)[number]['id']

const icons: Record<NavId, LucideIcon> = {
  inbox: Inbox,
  money: CircleDollarSign,
  play: Gamepad2,
  explore: Compass,
  profile: UserRound,
}

export function OriShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? '/inbox'
  const active =
    navItems.find((item) => pathname.includes(item.id)) ?? navItems[0]
  const { initiaAddress, isConnected, openConnect, disconnect } =
    useInterwovenKit()
  const usernameQuery = useUsernameQuery(initiaAddress || undefined)
  const username = usernameQuery.data
  const handle = username ? `${username}.init` : currentUser.handle
  const address = isConnected ? shortenAddress(initiaAddress) : currentUser.address
  // TODO: real balance via bank/move balance fetcher; mock until then.
  const balance = currentUser.balance

  return (
    <div
      className="min-h-screen bg-white text-[#0A0A0A]"
      data-testid="ori-app-shell"
    >
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-black/10 bg-white lg:block"
        data-testid="desktop-sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-black/10 p-6">
            <Link
              href="/inbox"
              className="flex items-center gap-3"
              data-testid="sidebar-brand-link"
            >
              <span
                className="grid h-10 w-10 place-items-center bg-[#0022FF] font-heading text-lg font-black text-white"
                data-testid="sidebar-brand-mark"
              >
                O
              </span>
              <span
                className="font-heading text-2xl font-black tracking-tight"
                data-testid="sidebar-brand-name"
              >
                Ori
              </span>
            </Link>
          </div>

          <nav className="flex-1 p-4" data-testid="desktop-navigation">
            {navItems.map((item) => {
              const Icon = icons[item.id]
              const isActive = pathname.startsWith(item.path)
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`mb-2 flex items-center gap-3 border px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-[#0022FF] bg-[#0022FF] text-white'
                      : 'border-transparent hover:border-black hover:bg-black hover:text-white'
                  }`}
                  data-testid={`nav-${item.id}-link`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-black/10 p-4">
            <div
              className="border border-black/10 p-4"
              data-testid="sidebar-wallet-card"
            >
              <div
                className="flex items-center gap-2 text-sm font-bold"
                data-testid="sidebar-wallet-label"
              >
                <Wallet className="h-4 w-4" /> Simulated wallet
              </div>
              <p
                className="mt-3 font-mono text-sm"
                data-testid="sidebar-wallet-handle"
              >
                {handle}
              </p>
              <p
                className="font-mono text-xs text-[#52525B]"
                data-testid="sidebar-wallet-address"
              >
                {address}
              </p>
              <p
                className="mt-3 font-mono text-lg font-bold"
                data-testid="sidebar-wallet-balance"
              >
                {balance}
              </p>
              {isConnected ? (
                <Button
                  onClick={() => disconnect()}
                  variant="outline"
                  className="mt-4 w-full rounded-none border-black hover:bg-black hover:text-white"
                  data-testid="disconnect-wallet-button"
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={() => openConnect()}
                  className="mt-4 w-full rounded-none bg-[#0022FF] text-white hover:bg-[#0019CC]"
                  data-testid="connect-wallet-button"
                >
                  Connect wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <header
        className="sticky top-0 z-30 border-b border-black/10 bg-white/95 px-4 py-4 backdrop-blur lg:ml-72 lg:px-8"
        data-testid="app-topbar"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
              data-testid="active-section-label"
            >
              {active.label}
            </p>
            <h1
              className="font-heading text-2xl font-black tracking-tight sm:text-3xl"
              data-testid="active-section-title"
            >
              {active.label === 'Inbox'
                ? 'Chat wallet control room'
                : `${active.label} surface`}
            </h1>
          </div>
          <div
            className="hidden items-center gap-3 sm:flex"
            data-testid="topbar-policy-summary"
          >
            <span
              className="flex items-center gap-2 border border-black/10 px-3 py-2 text-sm"
              data-testid="topbar-trust-score"
            >
              <ShieldCheck className="h-4 w-4 text-[#0022FF]" /> Trust{' '}
              {currentUser.trust}
            </span>
            <span
              className="flex items-center gap-2 border border-black/10 px-3 py-2 text-sm"
              data-testid="topbar-agent-cap"
            >
              <Bot className="h-4 w-4 text-[#0022FF]" /> {currentUser.agentCap}
            </span>
          </div>
        </div>
      </header>

      <main
        className="pb-44 lg:ml-72 lg:pb-24"
        data-testid="app-main-content"
      >
        {children}
      </main>

      <nav
        className="fixed bottom-16 left-0 right-0 z-[9999] grid grid-cols-5 border-y border-black/10 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
        data-testid="mobile-bottom-navigation"
      >
        {navItems.map((item) => {
          const Icon = icons[item.id]
          const isActive = pathname.startsWith(item.path)
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-bold ${
                isActive
                  ? 'bg-[#0022FF] text-white'
                  : 'text-[#52525B]'
              }`}
              data-testid={`mobile-nav-${item.id}-link`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
