'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Bot, TrendingUp, PlusCircle, MessageCircle } from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'

/**
 * Mobile bottom nav. Only renders when wallet is connected (landing +
 * /onboard stay clean). Each item has a `match` predicate so nested routes
 * (e.g. /chat/[id] under the Friends tab) light up correctly.
 */
export function BottomNav() {
  const pathname = usePathname()
  const { isConnected } = useInterwovenKit()

  if (!isConnected) return null

  const items = [
    { href: '/today', label: 'Today', icon: Activity, match: (p: string) => p.startsWith('/today') },
    { href: '/ask', label: 'Ask', icon: Bot, match: (p: string) => p.startsWith('/ask') },
    { href: '/predict', label: 'Predict', icon: TrendingUp, match: (p: string) => p.startsWith('/predict') },
    {
      href: '/send',
      label: 'Create',
      icon: PlusCircle,
      match: (p: string) =>
        p.startsWith('/send') || p.startsWith('/gift') || p.startsWith('/paywall/new'),
    },
    {
      href: '/chats',
      label: 'Chats',
      icon: MessageCircle,
      match: (p: string) => p.startsWith('/chat') || p.startsWith('/discover'),
    },
  ]

  return (
    <nav className="sticky bottom-0 z-20 backdrop-blur-xl bg-background/80 border-t border-[var(--color-line-hairline)] safe-area-bottom">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={label}>
              <Link
                href={href}
                className={
                  'relative flex flex-col items-center justify-center gap-1 h-14 text-[10.5px] transition ' +
                  (active ? 'text-foreground' : 'text-ink-3 hover:text-foreground')
                }
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[1.5px] w-8 rounded-full bg-[var(--color-primary-bright)]" />
                )}
                <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                <span className={active ? 'font-medium' : ''}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
