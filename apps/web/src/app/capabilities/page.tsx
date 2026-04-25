import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  CalendarClock,
  CircleDollarSign,
  Gift,
  Lock,
  MessageCircle,
  Radio,
  Repeat,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Users2,
  type LucideIcon,
} from 'lucide-react'

import { MarketingTopbar, MarketingFooter } from '@/components/marketing-chrome'
import { Eyebrow, Reveal } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Capabilities · Ori',
  description:
    'Eighteen Move modules running on the ori-1 rollup. Every primitive a chat wallet needs, exposed to humans and agents alike.',
}

interface Capability {
  icon: LucideIcon
  module: string
  title: string
  blurb: string
  href: string
}

const CAPABILITIES: Capability[] = [
  {
    icon: CircleDollarSign,
    module: 'payment_router',
    title: 'Send by name',
    blurb:
      'Type a friend\'s .init handle, tap an amount, hit send. The money lands inside the conversation as a card both sides see at the same moment.',
    href: '/send',
  },
  {
    icon: Users2,
    module: 'payment_router',
    title: 'Bulk send',
    blurb:
      'Paste a list — up to 256 recipients in one transaction. Splits, payroll, raffles. One click, many receipts.',
    href: '/send/bulk',
  },
  {
    icon: Star,
    module: 'tip_jar',
    title: 'One-tap tips',
    blurb:
      'Creator tips with a 1% platform fee, batched for low gas. Receipts surface on the recipient\'s profile activity feed.',
    href: '/discover',
  },
  {
    icon: Gift,
    module: 'gift_packet',
    title: 'Gift a link',
    blurb:
      'Wrap a payment with a theme + message. First tap claims it — even before the recipient has set up Ori.',
    href: '/gift/new',
  },
  {
    icon: Gift,
    module: 'gift_group',
    title: 'Group gifts',
    blurb:
      'One pot, many recipients. Each slot is sealed by its own secret hash, claimed independently.',
    href: '/gift/new',
  },
  {
    icon: Lock,
    module: 'paywall',
    title: 'Paywalls',
    blurb:
      'Gate any URL behind a one-time price. Speaks x402 HTTP 402 so AI agents can unlock under your daily cap.',
    href: '/paywall/new',
  },
  {
    icon: Repeat,
    module: 'subscription_vault',
    title: 'Subscriptions',
    blurb:
      'Register a recurring plan. Funds release per-period, so they never leave the vault before service is rendered.',
    href: '/subscriptions',
  },
  {
    icon: Radio,
    module: 'payment_stream',
    title: 'Streams',
    blurb:
      'Pay by the second to anyone. Recipient withdraws anytime; sender closes when they want the unvested remainder back.',
    href: '/streams',
  },
  {
    icon: TrendingUp,
    module: 'prediction_pool',
    title: 'Prediction markets',
    blurb:
      'Parimutuel markets on BTC, ETH, SOL, ATOM, BNB. Resolved by the Connect oracle on-chain — no counterparty.',
    href: '/predict',
  },
  {
    icon: Ticket,
    module: 'lucky_pool',
    title: 'Lucky pools',
    blurb:
      'Open a raffle pool with an entry fee and participant cap. Anyone can join. Draw picks one recipient for the whole pot.',
    href: '/lucky',
  },
  {
    icon: Users2,
    module: 'squads',
    title: 'Squads',
    blurb:
      'Light groups for shared tipping, splits, and gift drops. Create one, share the ID, anyone can join.',
    href: '/squads',
  },
  {
    icon: MessageCircle,
    module: 'follow_graph',
    title: 'Follows',
    blurb:
      'Follow .init names, get a clean feed of who\'s shipping, tipping, and shipping back.',
    href: '/discover',
  },
  {
    icon: ShieldCheck,
    module: 'reputation',
    title: 'Reputation',
    blurb:
      'Thumbs up / down with retract, plus signed attestations. The chain is the source of truth, not a Yelp page.',
    href: '/discover',
  },
  {
    icon: Bot,
    module: 'agent_policy',
    title: 'Agent policy',
    blurb:
      'On-chain daily cap + kill switch for your AI agent. Set 50 INIT/day, revoke from any device in one tx.',
    href: '/settings',
  },
  {
    icon: Sparkles,
    module: 'achievement_sbt',
    title: 'Badges',
    blurb:
      'Soulbound achievements you can\'t buy. Surface on every profile — proof-of-craft, not pay-to-win.',
    href: '/discover',
  },
  {
    icon: CalendarClock,
    module: 'merchant_registry',
    title: 'Merchant profile',
    blurb:
      'List yourself in Discover with a category, logo, contact. Agents can route business pay to you by name.',
    href: '/settings',
  },
]

function CapabilityCard({ icon: Icon, module, title, blurb, href }: Capability) {
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
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {module}
          </div>
          <h3 className="mt-1.5 text-[17px] font-medium text-foreground tracking-tight">
            {title}
          </h3>
          <p className="mt-2 text-[13.5px] text-ink-2 leading-[1.55]">{blurb}</p>
        </div>
      </div>
    </Link>
  )
}

export default function CapabilitiesPage() {
  return (
    <main className="relative min-h-dvh backdrop-stars">
      <MarketingTopbar active="/capabilities" />
      <div className="relative z-10">
        <section className="shell pt-20 lg:pt-28 pb-12">
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
            Sixteen primitives.{' '}
            <span className="font-serif">One conversation</span>.
          </h1>
          <p
            className="mt-8 leading-[1.55] text-ink-2 max-w-[60ch]"
            style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
          >
            Every action a user takes, an agent can take too — over a standard
            protocol, with on-chain caps and a kill switch you control. Each
            tile below is a deployed Move module on the ori-1 rollup. Tap one
            to use it.
          </p>
        </section>

        <section className="shell pb-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c.title} delay={i * 30}>
                <CapabilityCard {...c} />
              </Reveal>
            ))}
          </div>
        </section>

        <section className="shell pb-20">
          <div className="rounded-3xl border border-primary/30 bg-primary/[0.05] p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
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
                Pick a flow and start <span className="font-serif">moving money</span>.
              </h2>
            </div>
            <Link
              href="/create"
              className="shrink-0 inline-flex items-center gap-2 rounded-full h-12 px-6 text-[14px] font-medium bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px transition"
            >
              Open the hub <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
      <MarketingFooter />
    </main>
  )
}
