/**
 * <MarketingTopbar /> + <MarketingFooter /> — shared chrome for all
 * marketing pages (landing + capabilities/flow/creators/system).
 * Server components: no client JS, no hooks. The connect button on the
 * right is a Client Component imported from landing-interactive.
 */
import Link from 'next/link'
import { HeaderConnectPill } from './landing-interactive'

const NAV = [
  { label: 'Capabilities', href: '/capabilities' },
  { label: 'Flow', href: '/flow' },
  { label: 'Creators', href: '/creators' },
  { label: 'System', href: '/system' },
]

export function MarketingTopbar({
  active,
}: {
  /** Path to mark as active in the nav. Pass `'/capabilities'` etc. */
  active?: string
}) {
  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center w-full px-4 pointer-events-none">
      <div className="flex items-center justify-between h-[56px] w-full max-w-4xl px-6 rounded-full border border-white/10 backdrop-blur-3xl bg-black/30 shadow-2xl transition-all pointer-events-auto">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="Ori home"
        >
          <OriMark className="h-7 w-7 text-foreground transition-transform group-hover:scale-[1.06]" />
          <span className="text-[15px] font-medium tracking-tight">
            <span className="font-serif">O</span>ri
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13px] text-ink-3">
          {NAV.map((item) => {
            const isActive = active === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'transition ' +
                  (isActive
                    ? 'text-foreground'
                    : 'hover:text-foreground')
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <HeaderConnectPill />
      </div>
    </header>
  )
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--color-line-hairline)] mt-24">
      <div className="shell py-14 lg:py-20">
        <div className="grid lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 lg:gap-14">
          <div className="lg:max-w-sm">
            <Link href="/" className="flex items-center gap-2.5">
              <OriMark className="h-7 w-7 text-foreground" />
              <span className="text-[15px] font-medium">
                <span className="font-serif">O</span>ri
              </span>
            </Link>
            <p className="mt-4 text-[13px] leading-[1.7] text-ink-3 max-w-sm font-mono">
              A chat wallet where your friends, your funds, and your AI agents
              live on the same screen. Built on Initia.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 lg:contents">
            <FooterCol
              title="Product"
              links={[
                { label: 'Capabilities', href: '/capabilities' },
                { label: 'Flow', href: '/flow' },
                { label: 'Creators', href: '/creators' },
                { label: 'System', href: '/system' },
              ]}
            />
            <FooterCol
              title="Develop"
              links={[
                { label: 'MCP server', href: '/ask' },
                { label: 'A2A protocol', href: '/.well-known/agent.json' },
                { label: 'Paywall API', href: '/paywall/new' },
                { label: 'GitHub', href: 'https://github.com/Pratiikpy/Ori' },
              ]}
            />
            <FooterCol
              title="App"
              links={[
                { label: 'Today', href: '/today' },
                { label: 'Create', href: '/create' },
                { label: 'Predict', href: '/predict' },
                { label: 'Settings', href: '/settings' },
              ]}
            />
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-[var(--color-line-hairline)] flex flex-wrap gap-y-3 gap-x-6 items-center justify-between text-[12px] text-ink-4 font-mono">
          <span className="shrink-0">© Ori — all quiet.</span>
          <span className="order-last md:order-none w-full md:w-auto md:text-center">
            Built on bridged INIT. No token launch.
          </span>
          <span className="shrink-0 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
            all systems green
          </span>
        </div>
      </div>
    </footer>
  )
}

export function OriMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3 font-mono">
        {title}
      </div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-[13.5px] text-ink-2 hover:text-foreground transition"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
