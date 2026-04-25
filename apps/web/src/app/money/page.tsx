'use client'

/**
 * /money — Money surface.
 *
 * Header layout (matches Emergent prototype):
 *
 *   ┌─────────────────────────────────┐ ┌──────────────────────┐ ┌──────┐
 *   │ TOTAL WALLET                    │ │ AGENT DAILY CAP      │ │ image│
 *   │ 12,480.45 INIT                  │ │ 250 INIT             │ │ tile │
 *   │ description copy                │ │ ▰▰▱▱▱▱▱▱▱▱            │ │      │
 *   └─────────────────────────────────┘ └──────────────────────┘ └──────┘
 *
 * Stat row: INIT / USDC / Streams / Paywalls (4 tiles)
 * Tabs: Payments | Gifts | Streams | Subscriptions | Paywalls | Sponsor
 * Body: feature card grid (FlowCard components routing to legacy pages).
 */
import * as React from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'
import { FlowCard } from '@/components/ui/flow-card'
import { getPortfolio, getSponsorStatus, getAgentPolicy, getUserAgentActions } from '@/lib/api'
import { Icon } from '@/components/ui/icon'

type Tab = 'payments' | 'gifts' | 'streams' | 'subscriptions' | 'paywalls' | 'sponsor'

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: 'payments',     label: 'Payments',      subtitle: 'Send, split, and tip from chat or profile surfaces.' },
  { id: 'gifts',        label: 'Gifts',         subtitle: 'Directed, link-based, and group-claim gift packets.' },
  { id: 'streams',      label: 'Streams',       subtitle: 'Per-second payment streams that vest as time passes.' },
  { id: 'subscriptions',label: 'Subscriptions', subtitle: 'Recurring creator escrow with cancel-any-time.' },
  { id: 'paywalls',     label: 'Paywalls',      subtitle: 'On-chain content unlocks payable by humans or agents.' },
  { id: 'sponsor',      label: 'Sponsor',       subtitle: 'Gas + .init name sponsorship for first-time users.' },
]

export default function MoneyPage() {
  const [tab, setTab] = React.useState<Tab>('payments')
  const { initiaAddress } = useInterwovenKit()

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio', initiaAddress],
    queryFn: () => getPortfolio(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 15_000,
  })

  const { data: sponsor } = useQuery({
    queryKey: ['sponsor-status'],
    queryFn: getSponsorStatus,
    staleTime: 60_000,
  })

  const totalInit = portfolio?.totals?.totalSent ?? 0
  const totalUsdc = 0 // placeholder — backend doesn't surface USDC yet
  const streamsCount = portfolio?.streams?.length ?? 0
  const paywallSales = portfolio?.paywalls?.length ?? 0

  return (
    <AppShell eyebrow="Money" title="Money surface">
      {/* HEADLINE STRIP */}
      <section className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-3">
        {/* Total wallet — black card */}
        <div className="bg-[var(--color-ink)] text-white rounded-md p-7 min-h-[180px] flex flex-col">
          <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-white/55">
            Total wallet
          </span>
          <div className="mt-3 font-mono tnum text-[32px] leading-tight">
            {fmt(totalInit)} INIT
          </div>
          <p className="mt-3 text-[13.5px] text-white/65 leading-[1.55] max-w-md">
            Live portfolio rolls up balances, paywalls, streams, tips, subscriptions, gifts, and sponsored gas readiness.
          </p>
        </div>

        {/* Agent daily cap */}
        <div className="border border-[var(--color-line)] rounded-md p-6 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 text-[12px] text-[var(--color-accent)]">
            <Icon name="lightning" size={14} />
            <span className="font-mono tracking-[0.12em] uppercase">Agent daily cap</span>
          </div>
          <CapBlock address={initiaAddress ?? null} />
        </div>

        {/* Image / accent tile */}
        <div className="rounded-md overflow-hidden bg-gradient-to-br from-[#E0E7FF] via-[#F0F4FF] to-[#FFFFFF] min-h-[180px] border border-[var(--color-line)]" />
      </section>

      {/* STAT ROW */}
      <section className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="INIT"     value={`$${fmt(totalInit)}`}     delta="+8.2%" trendUp />
        <StatTile label="USDC"     value={`$${fmt(totalUsdc)}`}     delta="+0.0%" />
        <StatTile label="Streams"  value={streamsCount.toString()}  delta={`${streamsCount} active`} />
        <StatTile label="Paywalls" value={paywallSales.toString()}  delta={`${paywallSales} sales`} trendUp />
      </section>

      {/* TABS */}
      <section className="mt-8 border-b border-[var(--color-line)] flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'shrink-0 h-10 px-4 text-[13px] font-medium transition rounded-t-md cursor-pointer',
                active
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-ink-2 hover:text-ink hover:bg-[var(--color-surface-hover)]',
              ].join(' ')}
            >
              {t.label}
            </button>
          )
        })}
      </section>

      {/* SUBTITLE */}
      <section className="mt-6 border border-[var(--color-line)] rounded-md p-5 flex items-center justify-between gap-3 bg-[var(--color-bg-muted)]">
        <div>
          <span className="eyebrow">{tab.toUpperCase()}</span>
          <h2 className="mt-1 font-display font-bold text-[20px] leading-tight text-ink">
            {TABS.find((t) => t.id === tab)?.subtitle}
          </h2>
        </div>
        <span className="hidden md:inline-flex items-center gap-1.5 text-[13px] text-[var(--color-accent)] font-medium">
          {flowCount(tab)} flows
          <Icon name="arrow-up" size={14} />
        </span>
      </section>

      {/* FLOW GRID */}
      <section className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tab === 'payments' && (
          <>
            <FlowCard module="payment_router.move" title="Send payment"   description="Recipient .init or address. Amount. Memo." href="/send" />
            <FlowCard module="payment_router.move" title="Bulk send"      description="Recipients CSV. Total amount. Split rule." href="/send/bulk" />
            <FlowCard module="tip_jar.move"        title="Tip a creator"  description="Creator .init. Amount. Public message." href="/send" />
          </>
        )}
        {tab === 'gifts' && (
          <>
            <FlowCard module="gift_packet.move" title="Create directed gift" description="To a specific recipient. Lockable + reclaimable." href="/gift/new" />
            <FlowCard module="gift_packet.move" title="Create link gift"     description="Sharable claim URL — anyone with the link can redeem." href="/gift/new" />
            <FlowCard module="gift_group.move"  title="Group gift"           description="Pool with N slots. First N claimers win." href="/gift/new" />
            <FlowCard module="gift_box_catalog.move" title="Register gift box" description="Pre-funded gift template you can hand out." href="/gift" />
            <FlowCard module="gift_packet.move"  title="Reclaim expired gift" description="Sweep funds back from a never-claimed gift." href="/gift" />
          </>
        )}
        {tab === 'streams' && (
          <>
            <FlowCard module="payment_stream.move" title="Open stream"     description="Per-second payments to a recipient over a duration." href="/streams" />
            <FlowCard module="payment_stream.move" title="Withdraw vested" description="Pull whatever has vested so far." href="/streams" />
            <FlowCard module="payment_stream.move" title="Close stream"    description="End the stream and refund the unvested portion." href="/streams" />
          </>
        )}
        {tab === 'subscriptions' && (
          <>
            <FlowCard module="subscription_vault.move" title="Register plan"        description="Creator-side: define price + period for subscribers." href="/subscriptions" />
            <FlowCard module="subscription_vault.move" title="Subscribe"            description="User-side: lock funds for a recurring window." href="/subscriptions" />
            <FlowCard module="subscription_vault.move" title="Release period"       description="Creator pulls one period's worth of escrow." href="/subscriptions" />
            <FlowCard module="subscription_vault.move" title="Cancel subscription"  description="Stop the recurrence. Refund logic per plan." href="/subscriptions" />
            <FlowCard module="subscription_vault.move" title="Deactivate plan"      description="Stop new subscriptions to a plan you own." href="/subscriptions" />
          </>
        )}
        {tab === 'paywalls' && (
          <>
            <FlowCard module="paywall.move" title="Create paywall"     description="Lock content behind an INIT price tag." href="/paywall/new" />
            <FlowCard module="paywall.move" title="Purchase paywall"   description="Pay to unlock — humans or agents." href="/paywall/mine" />
            <FlowCard module="paywall.move" title="Deactivate paywall" description="Stop sales to one of your paywalls." href="/paywall/mine" />
            <FlowCard module="merchant_registry.move" title="Register merchant" description="Become an x402-payable merchant." href="/paywall/mine" />
          </>
        )}
        {tab === 'sponsor' && (
          <>
            <FlowCard
              module="sponsor.api"
              title="Claim seed payment"
              description={sponsor?.seedClaimable ? 'You qualify — 5 INIT to your wallet.' : 'Sponsor not configured or already claimed.'}
              href="/onboard"
              ctaLabel={sponsor?.seedClaimable ? 'Claim now' : 'View status'}
            />
            <FlowCard
              module="sponsor.api"
              title="Sponsored .init name"
              description="Pre-funded username registration — first-time only."
              href="/onboard"
            />
          </>
        )}
      </section>
    </AppShell>
  )
}

/* ─────────────────────────────────────────────────────────────────── */

function CapBlock({ address }: { address: string | null }) {
  const { data: policy } = useQuery({
    queryKey: ['agent-policy', address],
    queryFn: () => getAgentPolicy(address!),
    enabled: Boolean(address),
    staleTime: 30_000,
  })
  const { data: actions } = useQuery({
    queryKey: ['agent-actions', address],
    queryFn: () => getUserAgentActions(address!),
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  const cap = policy?.dailyCap ?? null
  const usedToday = actions?.usedToday ?? null
  const pct = cap && usedToday != null ? Math.min(100, (Number(usedToday) / Number(cap)) * 100) : 0

  return (
    <>
      <div className="mt-3 font-mono tnum text-[26px] leading-tight text-ink">
        {cap != null ? `${cap} INIT` : '— INIT'}
      </div>
      <div className="mt-auto h-1.5 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
        <div className="h-full bg-[var(--color-ink)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="mt-2 text-[11.5px] text-ink-3 font-mono">
        {usedToday != null && cap != null ? `${usedToday} / ${cap} INIT used today` : 'No agent policy yet'}
      </span>
    </>
  )
}

function StatTile({
  label,
  value,
  delta,
  trendUp,
}: {
  label: string
  value: string
  delta?: string
  trendUp?: boolean
}) {
  return (
    <div className="border border-[var(--color-line)] rounded-md bg-white p-4 min-h-[100px]">
      <div className="flex items-start justify-between">
        <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-3">
          {label}
        </span>
        {delta && (
          <span className={`font-mono text-[11px] ${trendUp ? 'text-[var(--color-success)]' : 'text-ink-3'}`}>
            {delta}
          </span>
        )}
      </div>
      <div className="mt-3 font-mono tnum text-[22px] font-medium text-ink">
        {value}
      </div>
    </div>
  )
}

function fmt(n: number | bigint): string {
  const num = typeof n === 'bigint' ? Number(n) : n
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function flowCount(t: Tab): number {
  switch (t) {
    case 'payments':      return 3
    case 'gifts':         return 5
    case 'streams':       return 3
    case 'subscriptions': return 5
    case 'paywalls':      return 4
    case 'sponsor':       return 2
  }
}
