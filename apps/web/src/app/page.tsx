'use client'

/**
 * Landing — Emergent prototype parity.
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ ▢ Ori                                       [Launch app]    │  ← topbar
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ INITIA CHAT WALLET                                           │
 *   │ Messages, money, and AI agents          ┌──────────────┐    │
 *   │ under one .init name.                   │  hero card    │    │
 *   │ supporting copy                         │  rendered as  │    │
 *   │ [Connect wallet] [Explore surface]      │  CSS          │    │
 *   │                                          └──────────────┘    │
 *   ├─────────────────────────────────────────────────────────────┤
 *   │ Encrypted DMs · Wallet actions · Agent caps · Markets · ... │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Single coded hero composition (no image dep). When connected, the
 * primary CTA flips to "Open dashboard" and routes to /inbox.
 */
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightIcon } from '@/components/ui/static-icons'

export default function LandingPage() {
  const router = useRouter()
  const { isConnected, openConnect } = useInterwovenKit()

  const onPrimary = () => {
    if (isConnected) router.push('/inbox')
    else void openConnect()
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* TOP BAR */}
      <header className="h-16 border-b border-[var(--color-line)] flex items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Ori home">
          <span className="w-8 h-8 rounded-md bg-[var(--color-accent)] inline-flex items-center justify-center">
            <span className="block w-3 h-3 rounded-full bg-white" />
          </span>
          <span className="text-[18px] font-display font-bold text-ink tracking-[-0.02em]">Ori</span>
        </Link>
        <button
          type="button"
          onClick={onPrimary}
          className="h-9 px-4 rounded-md bg-[var(--color-ink)] text-white text-[13px] font-medium hover:opacity-85 active:scale-[0.98] transition cursor-pointer"
        >
          {isConnected ? 'Open dashboard' : 'Launch app'}
        </button>
      </header>

      {/* HERO */}
      <section className="px-5 sm:px-8 lg:px-16 py-12 lg:py-20 max-w-[1280px] mx-auto">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <span className="eyebrow">Initia chat wallet</span>
            <h1 className="mt-5 font-heavy text-ink leading-[1.02] tracking-[-0.025em] text-[44px] sm:text-[60px] lg:text-[72px]">
              Messages, money, and AI agents under one <span className="text-[var(--color-accent)]">.init</span> name.
            </h1>
            <p className="mt-5 text-[15px] sm:text-[16px] leading-[1.55] text-ink-2 max-w-xl">
              Ori turns the wallet into the conversation layer: chat, pay, gift, sell, wager, stream,
              subscribe, and give agents spending limits from one minimalist control room.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onPrimary}
                className="h-12 px-6 rounded-md bg-[var(--color-accent)] text-white text-[14px] font-medium hover:opacity-90 active:scale-[0.98] transition inline-flex items-center gap-2 cursor-pointer"
              >
                {isConnected ? 'Open dashboard' : 'Connect simulated wallet'}
                <ArrowRightIcon size={14} />
              </button>
              <Link
                href="/inbox"
                className="h-12 px-6 rounded-md bg-white border border-[var(--color-line-strong)] text-ink text-[14px] font-medium hover:bg-[var(--color-surface-hover)] active:scale-[0.98] transition inline-flex items-center cursor-pointer"
              >
                Explore surface
              </Link>
            </div>
          </div>

          {/* Hero card frame: image area on top + 3 stat tiles on bottom,
              all wrapped in one bordered shell to match the prototype. */}
          <div className="border border-[var(--color-line)] rounded-md bg-[var(--color-bg-muted)] overflow-hidden">
            <HeroCard />
            <div className="grid grid-cols-3 border-t border-[var(--color-line)] divide-x divide-[var(--color-line)]">
              <StatTile k="ONE SURFACE" v="Chat + Money + Agents" />
              <StatTile k="IDENTITY"    v=".init native" />
              <StatTile k="RAILS"       v="Move contracts" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE ROW — five icons + labels matching the prototype. */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-bg-muted)]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-16 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <Feature icon="chat"   label="Encrypted DMs"        body="Message friends with payments and read state." />
          <Feature icon="wallet" label="Wallet actions"       body="Send, split, tip, gift, stream, subscribe." />
          <Feature icon="bot"    label="Agent caps"           body="AI agents act only inside user-set limits." />
          <Feature icon="gift"   label="Markets + wagers"     body="PvP bets, YES/NO pools, lucky draws." />
          <Feature icon="shield" label="On-chain reputation"  body="Badges, attestations, social graph, trust." />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--color-line)] py-8 px-5 sm:px-8 lg:px-16 max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4 text-[12.5px] font-mono text-ink-3">
        <span>Built on bridged INIT · No token launch</span>
        <span>© Ori — all quiet.</span>
      </footer>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */

function StatTile({ k, v }: { k: string; v: string }) {
  return (
    <div className="px-5 py-4">
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-3">{k}</div>
      <div className="mt-1.5 font-mono text-[12.5px] text-ink">{v}</div>
    </div>
  )
}

type FeatureIcon = 'chat' | 'wallet' | 'bot' | 'gift' | 'shield'

function Feature({ icon, label, body }: { icon: FeatureIcon; label: string; body: string }) {
  return (
    <div>
      <FeatureGlyph kind={icon} />
      <h3 className="mt-3 font-display font-bold text-[16px] text-ink leading-tight">{label}</h3>
      <p className="mt-2 text-[13px] text-ink-3 leading-[1.55]">{body}</p>
    </div>
  )
}

/**
 * Tiny inline-SVG glyph set for the feature row. Rendered server-safe (no
 * Phosphor / lucide → avoids the createContext SSR gotcha) and stroked in
 * the brand accent so they read as a coherent set.
 */
function FeatureGlyph({ kind }: { kind: FeatureIcon }) {
  const stroke = 'var(--color-accent)'
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <span className="block" aria-hidden>
      {kind === 'chat' && (
        <svg {...common}>
          <path d="M4 5h16v11H8l-4 4z" />
        </svg>
      )}
      {kind === 'wallet' && (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="13" rx="1.5" />
          <path d="M3 9h18" />
          <circle cx="17" cy="14" r="1.2" fill={stroke} />
        </svg>
      )}
      {kind === 'bot' && (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="11" rx="2" />
          <path d="M12 7V4" />
          <circle cx="12" cy="3" r="0.9" fill={stroke} />
          <circle cx="9" cy="12.5" r="1" fill={stroke} />
          <circle cx="15" cy="12.5" r="1" fill={stroke} />
        </svg>
      )}
      {kind === 'gift' && (
        <svg {...common}>
          <rect x="3.5" y="9" width="17" height="11" rx="1" />
          <path d="M3.5 13h17" />
          <path d="M12 9v11" />
          <path d="M12 9c-2-3-6-3-6 0 0 1.5 1.5 2 6 0z" />
          <path d="M12 9c2-3 6-3 6 0 0 1.5-1.5 2-6 0z" />
        </svg>
      )}
      {kind === 'shield' && (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )}
    </span>
  )
}

/**
 * HeroCard — replaces the prototype's 3D coin+bubble image with a coded
 * composition: soft gradient stage + a tilted chat bubble with the
 * landing message. Sits inside the bordered hero card frame.
 */
function HeroCard() {
  return (
    <div className="relative h-[300px] sm:h-[340px] bg-white overflow-hidden flex items-center justify-center">
      {/* abstract stage gradient behind the bubble — replaces the image */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 70% 60% at 60% 55%, #F8F4E3 0%, #FFFFFF 70%)',
      }} />

      {/* coin / wordmark blob */}
      <div className="absolute left-[28%] top-[42%] -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-[#F4C95D] via-[#E8B23B] to-[#C48E1A] shadow-lg" />

      {/* speech bubble */}
      <div className="absolute right-[12%] top-[28%] bg-white border border-[var(--color-line)] rounded-2xl rounded-br-sm p-3.5 max-w-[200px] shadow-sm">
        <div className="font-mono text-[10px] tracking-[0.10em] uppercase text-ink-3">mira.init · 09:18</div>
        <div className="mt-1.5 text-[13px] text-ink leading-[1.4]">
          Send 5 INIT to nova.init for the demo deck preview?
        </div>
      </div>

      {/* dot accent */}
      <span className="absolute top-5 right-5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
    </div>
  )
}
