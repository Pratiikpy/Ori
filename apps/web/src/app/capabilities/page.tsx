'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  AtSign,
  Award,
  Bot,
  Coins,
  Gift,
  Handshake,
  Heart,
  Link2,
  Lock,
  Radio,
  RefreshCcw,
  Star,
  Swords,
  TrendingUp,
  Trophy,
  UserPlus,
  Users2,
  type LucideIcon,
} from 'lucide-react'

import { MarketingTopbar, MarketingFooter } from '@/components/marketing-chrome'
import { CapabilitiesGrid } from '@/components/landing/CapabilitiesGrid'
// Direct imports to skip the @/components/ui barrel — the barrel transitively
// pulls in Phosphor's Icon, whose `createContext` at module top breaks
// Turbopack's SSR config-collection for Server Components.
import { Eyebrow } from '@/components/ui/eyebrow'
import { Reveal } from '@/components/ui/reveal'
import { SectionHead, Serif } from '@/components/ui/section-head'

// metadata moved to <title> tag in component body since this is now a Client
// Component (Server-only `metadata` export isn't allowed here).

interface Primitive {
  num: string
  module: string
  icon: LucideIcon
  title: ReactNode
  blurb: ReactNode
  href: string
}

const PRIMITIVES: Primitive[] = [
  { num: '01', module: 'payment_router', icon: Coins, href: '/send',
    title: 'Pay without leaving the chat',
    blurb: 'Tap an amount, type a number, send. The recipient is already known from context.' },
  { num: '02', module: 'profile_registry', icon: AtSign, href: '/onboard',
    title: <>One name, <Serif>everywhere</Serif></>,
    blurb: <>Your <span className="font-mono">.init</span> name is your chat handle, your address, your profile URL, your agent endpoint.</> },
  { num: '03', module: 'tip_jar', icon: Heart, href: '/discover',
    title: 'Tip with one tap',
    blurb: "1% platform fee. Receipts surface on the recipient's profile in real time." },
  { num: '04', module: 'gift_packet', icon: Gift, href: '/gift/new',
    title: <><Serif>Gift</Serif> a link</>,
    blurb: 'Wrap a payment with a theme + message. First tap claims it.' },
  { num: '05', module: 'gift_group', icon: Users2, href: '/gift/new',
    title: 'Group gifts',
    blurb: 'One pot. Many recipients. Each slot sealed by its own secret.' },
  { num: '06', module: 'payment_stream', icon: Radio, href: '/streams',
    title: <><Serif>Stream</Serif> by the second</>,
    blurb: 'Recipient withdraws anytime; sender closes whenever.' },
  { num: '07', module: 'subscription_vault', icon: RefreshCcw, href: '/subscriptions',
    title: 'Subscriptions, escrowed',
    blurb: 'Funds release per-period — never leave the vault before service is rendered.' },
  { num: '08', module: 'paywall', icon: Lock, href: '/paywall/new',
    title: <><Serif>Unlock</Serif> with one tap</>,
    blurb: 'Gate any URL behind a price. x402 native, so agents can pay too.' },
  { num: '09', module: 'prediction_pool', icon: TrendingUp, href: '/predict',
    title: <><Serif>Predict</Serif> in a sentence</>,
    blurb: 'Parimutuel BTC/ETH/SOL markets. Connect-resolved. No counterparty.' },
  { num: '10', module: 'lucky_pool', icon: Trophy, href: '/lucky',
    title: 'Lucky pools',
    blurb: 'Entry fee, slot cap, draw to one winner. The whole pot.' },
  { num: '11', module: 'squads', icon: Users2, href: '/squads',
    title: 'Squads',
    blurb: 'Light groups. Share the ID, join, share context for tips and splits.' },
  { num: '12', module: 'follow_graph', icon: UserPlus, href: '/discover',
    title: 'Follows',
    blurb: 'On-chain, portable. Your audience moves with you.' },
  { num: '13', module: 'reputation', icon: Star, href: '/discover',
    title: 'Reputation',
    blurb: 'Thumbs up/down + signed attestations. Yelp without the platform.' },
  { num: '14', module: 'wager_escrow', icon: Swords, href: '/discover',
    title: 'Wager 1v1',
    blurb: 'Two parties, one outcome. Oracle or party-resolved. Never custodial.' },
  { num: '15', module: 'achievement_sbt', icon: Award, href: '/discover',
    title: 'Achievement badges',
    blurb: "Soulbound. Can't be bought. Surface on every profile." },
  { num: '16', module: 'agent_policy', icon: Bot, href: '/settings',
    title: <>Agent <Serif>policy</Serif></>,
    blurb: 'Daily cap + kill switch on-chain. Revoke from any device in one tx.' },
]

function PrimitiveCard({ num, module, icon: Icon, title, blurb, href }: Primitive) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-6 panel-hover h-full"
    >
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-[var(--color-border)] inline-flex items-center justify-center shrink-0 group-hover:border-primary/40 transition">
          <Icon className="w-5 h-5 text-ink-2 group-hover:text-primary-bright transition" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            <span className="text-ink-4">{num}</span>
            <span aria-hidden className="text-ink-4">·</span>
            <span>{module}</span>
          </div>
          <h3 className="mt-1.5 text-[17px] font-medium text-foreground tracking-tight leading-[1.25]">
            {title}
          </h3>
          <p className="mt-2 text-[13.5px] text-ink-2 leading-[1.55]">{blurb}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-ink-3 font-mono group-hover:text-foreground transition">
            <span className="opacity-70 group-hover:opacity-100">Open</span>
            <Link2 className="w-3 h-3 opacity-70 group-hover:opacity-100" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function CapabilitiesPage() {
  return (
    <main id="main-content" className="relative min-h-dvh backdrop-stars">
      <MarketingTopbar active="/capabilities" />
      <div className="relative z-10">
        {/* Hero */}
        <section className="shell pt-[clamp(48px,10vw,140px)] pb-[clamp(48px,8vw,100px)]">
          <Reveal>
            <Eyebrow>· Capabilities</Eyebrow>
            <h1
              className="mt-5 leading-[0.98] text-foreground"
              style={{
                fontSize: 'clamp(36px, 6vw, 80px)',
                fontWeight: 400,
                letterSpacing: '-0.04em',
                maxWidth: '17ch',
              }}
            >
              Sixteen primitives. <Serif>One conversation</Serif>.
            </h1>
            <p
              className="mt-8 leading-[1.55] text-ink-2 max-w-[60ch]"
              style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
            >
              Every action a user takes, an agent can take too — over a standard
              protocol, with on-chain caps and a kill switch you control. Each
              tile is a deployed Move module on the ori-1 rollup.
            </p>
          </Reveal>
        </section>

        {/* Top tile-grid block — section 01 from the landing, the visual hook */}
        <CapabilitiesGrid />

        {/* Sixteen-primitive table */}
        <section className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <SectionHead
              eyebrow="The Sixteen"
              title={
                <>
                  Every primitive, <Serif>routed</Serif>.
                </>
              }
              sub="The full set of Move modules deployed on ori-1. Tap a tile to land directly on the surface that uses it."
            />
          </Reveal>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRIMITIVES.map((p, i) => (
              <Reveal key={p.module + p.num} delay={i * 30}>
                <PrimitiveCard {...p} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section className="shell pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <Eyebrow>Try it now</Eyebrow>
                <h2
                  className="mt-3 leading-[1.1] text-foreground"
                  style={{
                    fontSize: 'clamp(24px, 2.5vw, 36px)',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Open the hub and pick a <Serif>flow</Serif>.
                </h2>
              </div>
              <Link
                href="/create"
                className="shrink-0 inline-flex items-center gap-2 rounded-full h-12 px-6 text-[14px] font-medium bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px transition"
              >
                <Handshake className="w-4 h-4" /> Open the hub{' '}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
      <MarketingFooter />
    </main>
  )
}
