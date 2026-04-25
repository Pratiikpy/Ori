'use client'

/**
 * MobileBottomNav — fixed 5-tab nav at the bottom of mobile (<lg).
 *
 * Mirrors APP_NAV. Active item gets the solid #0022FF treatment.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { APP_NAV } from './nav-config'

export function MobileBottomNav() {
  const pathname = usePathname() ?? ''

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-black/10 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
    >
      {APP_NAV.map((item) => {
        const active = item.match(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-bold transition',
              active ? 'bg-[#0022FF] text-white' : 'text-[#52525B]',
            ].join(' ')}
          >
            <Glyph kind={item.icon} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Glyph({ kind }: { kind: 'inbox' | 'money' | 'play' | 'explore' | 'profile' }) {
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
    <svg {...c}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></svg>
  )
  if (kind === 'money') return (
    <svg {...c}><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
  )
  if (kind === 'play') return (
    <svg {...c}><line x1="6" x2="10" y1="12" y2="12" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="15" x2="15.01" y1="13" y2="13" /><line x1="18" x2="18.01" y1="11" y2="11" /><rect width="20" height="12" x="2" y="6" rx="2" /></svg>
  )
  if (kind === 'explore') return (
    <svg {...c}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
  )
  return (
    <svg {...c}><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
  )
}
