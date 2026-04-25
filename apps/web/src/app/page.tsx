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
            <h1 className="mt-4 font-display font-bold text-ink leading-[1.05] tracking-[-0.025em] text-[40px] sm:text-[52px] lg:text-[60px]">
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

          {/* Coded hero card — replaces the static image */}
          <HeroCard />
        </div>

        {/* HERO STATS RIBBON */}
        <div className="mt-10 grid grid-cols-3 max-w-md gap-6">
          <Stat k="USE SURFACE" v="Chat · Money · Agents" />
          <Stat k="IDENTITY" v=".init names" />
          <Stat k="RAILS" v="Move contracts" />
        </div>
      </section>

      {/* FEATURE ROW */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-bg-muted)]">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-16 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Feature
            label="Encrypted DMs"
            body="Message friends with payments and read state."
          />
          <Feature
            label="Wallet actions"
            body="Send, split, tip, gift, stream, subscribe."
          />
          <Feature
            label="Agent caps"
            body="AI agents act only inside on-chain limits you set."
          />
          <Feature
            label="Markets · wagers"
            body="PvP bets, YES/NO pools, lucky draws."
          />
          <Feature
            label="On-chain reputation"
            body="Badges, attestations, social graph, trust."
          />
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

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-ink-3">{k}</div>
      <div className="mt-1 text-[13.5px] text-ink font-medium">{v}</div>
    </div>
  )
}

function Feature({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="w-9 h-9 rounded-md bg-white border border-[var(--color-line)] inline-flex items-center justify-center mb-3">
        <span className="block w-2 h-2 rounded-full bg-[var(--color-accent)]" />
      </div>
      <h3 className="font-display font-bold text-[15px] text-ink">{label}</h3>
      <p className="mt-1.5 text-[12.5px] text-ink-3 leading-[1.55]">{body}</p>
    </div>
  )
}

/**
 * HeroCard — coded composition replacing the prototype's image.
 * Shows a chat bubble + payment card to convey "chat that pays."
 */
function HeroCard() {
  return (
    <div className="relative h-[320px] lg:h-[360px] border border-[var(--color-line)] rounded-md bg-gradient-to-br from-[#FFFFFF] via-[#F8F9FF] to-[#FCFCFF] overflow-hidden">
      {/* speech bubble */}
      <div className="absolute top-7 left-7 right-7 bg-white border border-[var(--color-line)] rounded-md p-4 shadow-sm">
        <div className="font-mono text-[10.5px] tracking-[0.10em] uppercase text-ink-3">mira.init · 09:18</div>
        <div className="mt-2 text-[14px] text-ink leading-[1.4]">
          Send 5 INIT to nova.init for the demo deck preview?
        </div>
      </div>

      {/* payment card */}
      <div className="absolute bottom-7 left-7 right-7 bg-[var(--color-ink)] text-white rounded-md p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10.5px] tracking-[0.10em] uppercase text-white/55">Sent · mira.init</div>
            <div className="mt-1.5 font-mono tnum text-[26px] font-medium">5.00 INIT</div>
          </div>
          <span className="inline-flex items-center gap-2 text-[12px] font-mono text-white/70">
            <span className="block w-1.5 h-1.5 rounded-full bg-[#34C759]" />
            Landed · 97ms
          </span>
        </div>
      </div>

      {/* dot accents */}
      <span className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
      <span className="absolute bottom-6 right-12 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]/40" />
    </div>
  )
}
