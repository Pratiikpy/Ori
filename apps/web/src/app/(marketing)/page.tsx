/**
 * Landing — public homepage. Server Component.
 *
 * Verbatim port of ui-ref-orii/frontend/src/pages/Landing.jsx with these
 * Server-Component-required adaptations:
 *   1. NO "use client" — all page content (headline, copy, buttons, hero
 *      image, feature grid) is static and server-renderable.
 *   2. framer-motion removed (motion.* tags require client). The reference's
 *      entry animations are nice-to-have; correctness > polish.
 *   3. The reference's onLaunch callback (passed as prop in their SPA) is
 *      replaced with <Link href="/onboard"> wrapped in <Button asChild>.
 *      Buttons retain their styling and ArrowRight icon.
 *
 * Hero image uses the reference's external CDN URL verbatim per spec.
 */
import Link from "next/link"
import { ArrowRight, Bot, Gift, Mail, MessageSquareText, Shield, Sparkles, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { landingStats, media } from "@/data/ori-data"

const featureTiles = [
  { id: "chat", title: "Encrypted DMs", detail: "Message threads with payments and read state.", icon: MessageSquareText },
  { id: "money", title: "Wallet actions", detail: "Send, split, tip, gift, stream, subscribe.", icon: WalletCards },
  { id: "agents", title: "Agent caps", detail: "AI agents act only inside user-set limits.", icon: Bot },
  { id: "play", title: "Markets + wagers", detail: "PvP bets, YES/NO pools, lucky draws.", icon: Gift },
  { id: "trust", title: "On-chain reputation", detail: "Badges, attestations, social graph, trust.", icon: Shield },
]

export default function Landing() {
  return (
    <main className="min-h-screen bg-white text-[#0A0A0A]" data-testid="landing-page">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8" data-testid="landing-nav">
        <div className="flex items-center gap-3" data-testid="landing-brand">
          <span className="grid h-10 w-10 place-items-center bg-[#0022FF] font-heading text-lg font-black text-white" data-testid="landing-brand-mark">O</span>
          <span className="font-heading text-2xl font-black tracking-tight" data-testid="landing-brand-name">Ori</span>
        </div>
        <Button asChild className="rounded-none bg-black px-5 text-white hover:bg-[#0022FF]" data-testid="landing-connect-wallet-button">
          <Link href="/onboard">
            Launch app <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </nav>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:pb-16" data-testid="landing-hero-section">
        <div className="lg:col-span-7">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]" data-testid="landing-kicker">Initia chat wallet</p>
          <h1 className="font-heading text-5xl font-black leading-none tracking-tighter sm:text-6xl lg:text-7xl" data-testid="landing-headline">Messages, money, and AI agents under one .init name.</h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-[#52525B] sm:text-lg" data-testid="landing-subheadline">Ori turns the wallet into the conversation layer: chat, pay, gift, sell, wager, stream, subscribe, and give agents spending limits from one minimalist control room.</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row" data-testid="landing-cta-row">
            <Button asChild className="rounded-none bg-[#0022FF] px-7 py-6 text-base text-white hover:bg-[#0019CC]" data-testid="landing-launch-app-button">
              <Link href="/onboard">
                Connect simulated wallet <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <a href="#feature-grid" className="inline-flex items-center justify-center border border-black px-7 py-3 font-semibold transition-colors hover:bg-black hover:text-white" data-testid="landing-explore-features-link">Explore surface</a>
          </div>
          <div className="mt-6 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3" data-testid="landing-login-options">
            <Button asChild variant="outline" className="h-auto whitespace-normal rounded-none border-black/20 px-3 py-3 text-xs hover:bg-black hover:text-white" data-testid="login-email-privy-button">
              <Link href="/onboard"><Mail className="h-4 w-4" /> Email / Privy</Link>
            </Button>
            <Button asChild variant="outline" className="h-auto whitespace-normal rounded-none border-black/20 px-3 py-3 text-xs hover:bg-black hover:text-white" data-testid="login-google-privy-button">
              <Link href="/onboard"><Sparkles className="h-4 w-4" /> Google / Privy</Link>
            </Button>
            <Button asChild variant="outline" className="h-auto whitespace-normal rounded-none border-black/20 px-3 py-3 text-xs hover:bg-black hover:text-white" data-testid="login-metamask-button">
              <Link href="/onboard"><WalletCards className="h-4 w-4" /> MetaMask</Link>
            </Button>
          </div>
          <p className="mt-3 font-mono text-xs text-[#52525B]" data-testid="landing-sign-message-note">Prototype signs one tiny login message and can claim mira.init as the starter name.</p>
        </div>

        <div className="relative border border-black/10 bg-[#F5F5F5] p-4 lg:col-span-5" data-testid="landing-hero-art-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.hero} alt="Minimal chat bubble and coin render" className="aspect-square w-full object-contain" data-testid="landing-hero-image" />
          <div className="grid grid-cols-3 border-t border-black/10 bg-white" data-testid="landing-stats-grid">
            {landingStats.map((stat) => (
              <div key={stat.id} className="border-r border-black/10 p-3 last:border-r-0" data-testid={`landing-stat-${stat.id}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#52525B]" data-testid={`landing-stat-label-${stat.id}`}>{stat.label}</p>
                <p className="mt-2 font-mono text-xs font-bold" data-testid={`landing-stat-value-${stat.id}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="feature-grid" className="border-y border-black/10 bg-[#F5F5F5]" data-testid="landing-feature-section">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px bg-black/10 px-5 py-px sm:px-8 md:grid-cols-2 lg:grid-cols-5">
          {featureTiles.map((tile) => {
            const Icon = tile.icon
            return (
              <article key={tile.id} className="min-h-56 bg-white p-6" data-testid={`landing-feature-${tile.id}`}>
                <Icon className="h-7 w-7 text-[#0022FF]" />
                <h2 className="mt-8 font-heading text-2xl font-black tracking-tight" data-testid={`landing-feature-title-${tile.id}`}>{tile.title}</h2>
                <p className="mt-4 text-sm leading-6 text-[#52525B]" data-testid={`landing-feature-detail-${tile.id}`}>{tile.detail}</p>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
