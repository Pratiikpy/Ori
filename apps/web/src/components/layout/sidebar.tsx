'use client'

/**
 * Sidebar — Emergent prototype OriShell port (desktop only, lg+).
 *
 *   • w-72 fixed left, white bg, 1px right border
 *   • Brand: #0022FF square with white "O" + heavy "Ori" wordmark
 *   • Nav items: bordered pills, active = solid blue, hover = solid black
 *   • Wallet card pinned bottom: "Connected wallet" (replaces prototype's
 *     "Simulated wallet"), real handle + address + Disconnect
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { APP_NAV } from './nav-config'

export function Sidebar() {
  const pathname = usePathname() ?? ''
  const { isConnected, openConnect, openWallet, username, initiaAddress } =
    useInterwovenKit()

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex fixed left-0 top-0 h-dvh w-72 bg-white border-r border-black/10 flex-col z-40"
    >
      {/* Brand */}
      <div className="border-b border-black/10 p-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Ori home">
          <span className="grid h-10 w-10 place-items-center bg-[#0022FF] font-display text-lg font-black text-white">
            O
          </span>
          <span className="font-display text-2xl font-black tracking-tight">
            Ori
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav aria-label="Sections" className="flex-1 p-4 overflow-y-auto">
        {APP_NAV.map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'mb-2 flex items-center gap-3 border px-4 py-3 text-sm font-semibold transition-colors',
                active
                  ? 'border-[#0022FF] bg-[#0022FF] text-white'
                  : 'border-transparent text-[#0A0A0A] hover:border-black hover:bg-black hover:text-white',
              ].join(' ')}
            >
              <NavGlyph kind={item.icon} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Wallet card pinned bottom */}
      <div className="border-t border-black/10 p-4 shrink-0">
        {isConnected ? (
          <div className="border border-black/10 p-4 bg-white">
            <div className="flex items-center gap-2 text-sm font-bold">
              <WalletGlyph /> Connected wallet
            </div>
            <p className="mt-3 font-mono text-sm">{username ?? 'wallet.init'}</p>
            <p className="font-mono text-xs text-[#52525B] truncate">
              {shortAddr(initiaAddress)}
            </p>
            <button
              type="button"
              onClick={() => openWallet()}
              className="mt-4 w-full border border-black px-4 py-2 text-sm font-semibold transition hover:bg-black hover:text-white cursor-pointer"
            >
              Open wallet
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void openConnect()}
            className="w-full bg-[#0A0A0A] text-white px-4 py-3 text-sm font-semibold transition hover:bg-[#0022FF] cursor-pointer"
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
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

/* Inline-SVG icons — server-safe. Mirrors lucide-react Inbox/CircleDollarSign/
   Gamepad2/Compass/UserRound + Wallet but without the createContext gotcha. */
function NavGlyph({ kind }: { kind: 'inbox' | 'money' | 'play' | 'explore' | 'profile' }) {
  const c = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (kind === 'inbox') return (
    <svg {...c}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  )
  if (kind === 'money') return (
    <svg {...c}>
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  )
  if (kind === 'play') return (
    <svg {...c}>
      <line x1="6" x2="10" y1="12" y2="12" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="15" x2="15.01" y1="13" y2="13" />
      <line x1="18" x2="18.01" y1="11" y2="11" />
      <rect width="20" height="12" x="2" y="6" rx="2" />
    </svg>
  )
  if (kind === 'explore') return (
    <svg {...c}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
  // profile
  return (
    <svg {...c}>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  )
}

function WalletGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2H17a2 2 0 0 1 0-4h4V9a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4Z" />
    </svg>
  )
}
