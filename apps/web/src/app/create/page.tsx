'use client'

/**
 * /create — hub for every creator-side action.
 *
 * Surfaces all 18 Move modules as discoverable entry points. Ordered by
 * demo impact: send first (most common), then recurring/gating features,
 * then social (squads, lucky), then power-user (predict, wager).
 */
import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Gift,
  Lock,
  Radio,
  Repeat,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Users2,
  Store,
} from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import { Eyebrow, Reveal } from '@/components/ui'

interface Entry {
  href: string
  title: string
  sub: string
  icon: typeof Gift
  tag: string
}

const SEND: Entry[] = [
  {
    href: '/send',
    title: 'Send a payment',
    sub: 'One-tap transfer to anyone by .init name.',
    icon: CircleDollarSign,
    tag: 'payment_router',
  },
  {
    href: '/send/bulk',
    title: 'Bulk send',
    sub: 'Paste a list, send to many at once.',
    icon: Users,
    tag: 'payment_router',
  },
]

const RECURRING: Entry[] = [
  {
    href: '/streams',
    title: 'Open a stream',
    sub: 'Pay by the second for any duration.',
    icon: Radio,
    tag: 'payment_stream',
  },
  {
    href: '/subscriptions',
    title: 'Subscription plan',
    sub: 'Register a recurring plan, or subscribe to a creator.',
    icon: Repeat,
    tag: 'subscription_vault',
  },
]

const CONTENT: Entry[] = [
  {
    href: '/paywall/new',
    title: 'Gate a URL',
    sub: 'One-time price, x402-compatible.',
    icon: Lock,
    tag: 'paywall',
  },
  {
    href: '/gift/new',
    title: 'Gift a payment',
    sub: 'Directed, link, or group — three ways to wrap it.',
    icon: Gift,
    tag: 'gift_packet · gift_group',
  },
]

const SOCIAL: Entry[] = [
  {
    href: '/squads',
    title: 'Start a squad',
    sub: 'Group context for tips, splits, and drops.',
    icon: Users2,
    tag: 'squads',
  },
  {
    href: '/lucky',
    title: 'Run a lucky pool',
    sub: 'Entry fee, cap, one winner.',
    icon: Ticket,
    tag: 'lucky_pool',
  },
]

const MARKETS: Entry[] = [
  {
    href: '/predict',
    title: 'Open a prediction',
    sub: 'Parimutuel BTC/ETH/SOL markets, Connect-resolved.',
    icon: TrendingUp,
    tag: 'prediction_pool',
  },
]

const SETTINGS: Entry[] = [
  {
    href: '/paywall/mine',
    title: 'My paywalls',
    sub: 'Manage or retire your gated links.',
    icon: Lock,
    tag: 'paywall',
  },
  {
    href: '/settings',
    title: 'Merchant profile',
    sub: 'List yourself in Discover and route business pay.',
    icon: Store,
    tag: 'merchant_registry',
  },
  {
    href: '/settings',
    title: 'Agent policy',
    sub: 'Daily cap + kill switch for your Claude Desktop agent.',
    icon: Sparkles,
    tag: 'agent_policy',
  },
]

function EntryCard({ href, title, sub, icon: Icon, tag }: Entry) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-5 panel-hover"
    >
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-[var(--color-border)] inline-flex items-center justify-center shrink-0 group-hover:border-primary/40 transition">
          <Icon className="w-5 h-5 text-ink-2 group-hover:text-primary-bright transition" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15.5px] font-medium text-foreground tracking-tight">
            {title}
          </h3>
          <p className="mt-1 text-[13px] text-ink-2 leading-[1.55]">{sub}</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {tag}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-ink-3 shrink-0 mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
      </div>
    </Link>
  )
}

function Bucket({
  eyebrow,
  entries,
}: {
  eyebrow: string
  entries: Entry[]
}) {
  return (
    <section className="space-y-3">
      <Eyebrow>{eyebrow}</Eyebrow>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map((e, i) => (
          <Reveal key={e.href + e.title} delay={i * 40}>
            <EntryCard {...e} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default function CreatePage() {
  return (
    <AppShell title="Create">
      <div className="max-w-3xl mx-auto w-full px-5 pt-8 pb-12 space-y-10">
        <PageHeader
          kicker="04 · Create"
          title={
            <>
              Every way to <Serif>move money</Serif> on Ori.
            </>
          }
          sub="Sixteen Move modules, one hub. Pick a flow. Every action runs on-chain under the same agent policy — so whatever you create, Claude can call later."
        />

        <Bucket eyebrow="Send" entries={SEND} />
        <Bucket eyebrow="Recurring" entries={RECURRING} />
        <Bucket eyebrow="Content & gifts" entries={CONTENT} />
        <Bucket eyebrow="Social" entries={SOCIAL} />
        <Bucket eyebrow="Markets" entries={MARKETS} />
        <Bucket eyebrow="Manage" entries={SETTINGS} />
      </div>
    </AppShell>
  )
}
