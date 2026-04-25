'use client'

/**
 * Landing — Emergent prototype port (1:1 structure, real backend wiring).
 *
 * Layout:
 *   <nav>: Ori brand left, "Launch app" CTA right
 *   <section> Hero:
 *     left  (col-span-7) : kicker → headline → subheadline → CTA row →
 *                          login options grid (3 buttons) → sign-message note
 *     right (col-span-5) : art card with stage gradient + speech bubble +
 *                          3 stat tiles below
 *   <section> Feature grid: 5 tiles with icons
 *
 * Differences from prototype:
 *   • Image asset replaced by CSS art (no Emergent CDN dep)
 *   • All 3 login buttons + main CTA call useInterwovenKit().openConnect()
 *     since the InterwovenKit drawer covers Email/Google/Privy/MetaMask
 *   • If already connected, every CTA routes to /inbox instead of opening
 *     the drawer again
 */
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const featureTiles = [
  { id: 'chat',   title: 'Encrypted DMs',         detail: 'Message threads with payments and read state.',     glyph: 'chat' as const },
  { id: 'money',  title: 'Wallet actions',        detail: 'Send, split, tip, gift, stream, subscribe.',         glyph: 'wallet' as const },
  { id: 'agents', title: 'Agent caps',            detail: 'AI agents act only inside user-set limits.',         glyph: 'bot' as const },
  { id: 'play',   title: 'Markets + wagers',      detail: 'PvP bets, YES/NO pools, lucky draws.',               glyph: 'gift' as const },
  { id: 'trust',  title: 'On-chain reputation',   detail: 'Badges, attestations, social graph, trust.',         glyph: 'shield' as const },
]

const landingStats = [
  { id: 'surface',  label: 'One surface', value: 'Chat + Money + Agents' },
  { id: 'identity', label: 'Identity',    value: '.init native' },
  { id: 'rails',    label: 'Rails',       value: 'Move contracts' },
]

export default function LandingPage() {
  const router = useRouter()
  const { isConnected, openConnect } = useInterwovenKit()

  const launch = () => {
    if (isConnected) router.push('/inbox')
    else void openConnect()
  }

  return (
    <main className="min-h-screen bg-white text-[#0A0A0A]">
      {/* TOP NAV */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Ori home">
          <span className="grid h-10 w-10 place-items-center bg-[#0022FF] font-display text-lg font-black text-white">
            O
          </span>
          <span className="font-display text-2xl font-black tracking-tight">Ori</span>
        </Link>
        <button
          type="button"
          onClick={launch}
          className="inline-flex items-center gap-2 bg-[#0A0A0A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0022FF] cursor-pointer"
        >
          {isConnected ? 'Open app' : 'Launch app'}
          <ArrowRightGlyph />
        </button>
      </nav>

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:pb-16">
        {/* Hero copy */}
        <div className="lg:col-span-7">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
            Initia chat wallet
          </p>
          <h1 className="font-display text-5xl font-black leading-none tracking-tighter sm:text-6xl lg:text-7xl">
            Messages, money, and AI agents under one .init name.
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-[#52525B] sm:text-lg">
            Ori turns the wallet into the conversation layer: chat, pay, gift, sell, wager, stream, subscribe, and give agents spending limits from one minimalist control room.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={launch}
              className="inline-flex items-center justify-center gap-2 bg-[#0022FF] px-7 py-4 text-base font-semibold text-white transition hover:bg-[#0019CC] cursor-pointer"
            >
              {isConnected ? 'Open dashboard' : 'Connect wallet'}
              <ArrowRightGlyph />
            </button>
            <a
              href="#feature-grid"
              className="inline-flex items-center justify-center border border-black px-7 py-3 font-semibold transition hover:bg-black hover:text-white cursor-pointer"
            >
              Explore surface
            </a>
          </div>

          {/* Login options — all three open the same InterwovenKit drawer.
              The drawer surfaces Privy (email + Google) + MetaMask + any
              installed EVM wallet. Three buttons match prototype labels. */}
          <div className="mt-6 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={launch}
              className="inline-flex items-center justify-center gap-2 border border-black/20 px-3 py-3 text-xs font-semibold transition hover:bg-black hover:text-white cursor-pointer"
            >
              <MailGlyph /> Email / Privy
            </button>
            <button
              type="button"
              onClick={launch}
              className="inline-flex items-center justify-center gap-2 border border-black/20 px-3 py-3 text-xs font-semibold transition hover:bg-black hover:text-white cursor-pointer"
            >
              <SparkGlyph /> Google / Privy
            </button>
            <button
              type="button"
              onClick={launch}
              className="inline-flex items-center justify-center gap-2 border border-black/20 px-3 py-3 text-xs font-semibold transition hover:bg-black hover:text-white cursor-pointer"
            >
              <WalletGlyph /> MetaMask
            </button>
          </div>
          <p className="mt-3 font-mono text-xs text-[#52525B]">
            Sign one tiny EIP-191 message after wallet connect — no transaction fee.
          </p>
        </div>

        {/* Hero art card */}
        <div className="relative border border-black/10 bg-[#F5F5F5] p-4 lg:col-span-5">
          {/* Coded illustration replacing the Emergent CDN image */}
          <HeroArt />
          <div className="grid grid-cols-3 border-t border-black/10 bg-white">
            {landingStats.map((stat, i) => (
              <div
                key={stat.id}
                className={[
                  'p-3',
                  i < landingStats.length - 1 ? 'border-r border-black/10' : '',
                ].join(' ')}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#52525B]">
                  {stat.label}
                </p>
                <p className="mt-2 font-mono text-xs font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section id="feature-grid" className="border-y border-black/10 bg-[#F5F5F5]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px bg-black/10 px-5 py-px sm:px-8 md:grid-cols-2 lg:grid-cols-5">
          {featureTiles.map((tile) => (
            <article key={tile.id} className="min-h-56 bg-white p-6">
              <FeatureGlyph kind={tile.glyph} />
              <h2 className="mt-8 font-display text-2xl font-black tracking-tight">
                {tile.title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#52525B]">
                {tile.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p className="font-mono text-xs text-[#52525B]">
          Built on bridged INIT · No token launch · © Ori
        </p>
      </footer>
    </main>
  )
}

/* ───────────────── Inline-SVG glyphs ───────────────── */

function ArrowRightGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

function MailGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function SparkGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8L4 10l5.8 1.9L12 18l1.9-6L20 10l-6.1-1.2Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}

function WalletGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2H17a2 2 0 0 1 0-4h4V9a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4Z" />
    </svg>
  )
}

function FeatureGlyph({ kind }: { kind: 'chat' | 'wallet' | 'bot' | 'gift' | 'shield' }) {
  const c = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: '#0022FF', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'chat')   return <svg {...c}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  if (kind === 'wallet') return <svg {...c}><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>
  if (kind === 'bot')    return <svg {...c}><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
  if (kind === 'gift')   return <svg {...c}><rect x="3" y="8" width="18" height="13" rx="0" /><path d="M3 12h18" /><path d="M12 8v13" /><path d="M19 12v9H5v-9" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>
  return <svg {...c}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
}

/**
 * HeroArt — coded illustration for the hero card. Replaces the Emergent
 * CDN image. Soft warm gradient stage + a small "send" speech bubble +
 * an offset payment chip. No image dependency.
 */
function HeroArt() {
  return (
    <div className="relative aspect-square w-full bg-white" style={{
      background: 'radial-gradient(ellipse 70% 60% at 60% 55%, #FFF1D0 0%, #FFFFFF 70%)',
    }}>
      {/* coin / wordmark */}
      <div className="absolute left-[28%] top-[42%] -translate-y-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-[#FFD66B] via-[#E8B23B] to-[#B07A12] shadow-[6px_6px_0px_0px_rgba(0,0,0,0.08)]" />

      {/* speech bubble */}
      <div className="absolute right-[10%] top-[24%] border border-black bg-white p-3 max-w-[210px] shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-[#52525B]">mira.init · 09:18</p>
        <p className="mt-1.5 text-[13px] leading-snug">
          Send 5 INIT to nova.init for the demo deck preview?
        </p>
      </div>

      {/* settlement chip */}
      <div className="absolute bottom-[10%] right-[10%] border border-black bg-[#0A0A0A] px-3 py-2 text-white shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/60">Sent · mira.init</p>
        <p className="mt-1 font-mono tnum text-base font-bold">5.00 INIT</p>
      </div>

      {/* dot accent */}
      <span className="absolute top-4 right-4 h-1.5 w-1.5 bg-[#0022FF]" />
    </div>
  )
}
