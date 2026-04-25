'use client'

/**
 * /money — Money surface, ported 1:1 from prototype Money.jsx.
 *
 * Layout:
 *   • Top grid (4-col): black total card (col-span-2) + agent cap card +
 *     gift visual card
 *   • Stat row (4 tiles): Sent / Received / Tips received / Tips given
 *   • Tabs (Payments / Gifts / Streams / Subscriptions / Paywalls / Sponsor)
 *   • Per-tab summary banner + ActionCard grid
 *
 * No mocked numbers — the total card pulls volume from /v1/portfolio,
 * stats use the same response, agent cap shows weekly agent spend from
 * /v1/profiles/:address/weekly-stats, gift visual is CSS only.
 */
import * as React from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'
import { ActionCard, type ActionDef } from '@/components/ui/action-card'
import { ActionDialog } from '@/components/ui/action-dialog'
import { getPortfolio, getWeeklyStats } from '@/lib/api'
import { moneyTabs } from '@/lib/ori-data'

export default function MoneyPage() {
  const [activeTab, setActiveTab]   = React.useState(moneyTabs[0]!.id)
  const [modalAction, setModalAction] = React.useState<ActionDef | null>(null)
  const { initiaAddress } = useInterwovenKit()

  const portfolio = useQuery({
    queryKey: ['portfolio', initiaAddress],
    queryFn: () => getPortfolio(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })
  const weekly = useQuery({
    queryKey: ['weekly', initiaAddress],
    queryFn: () => getWeeklyStats(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 60_000,
  })

  const tipsReceivedInit = Number(portfolio.data?.stats?.tipsReceivedVolume ?? '0') / 1e6
  const tipsGivenInit    = Number(portfolio.data?.stats?.tipsGivenVolume    ?? '0') / 1e6
  const totalInit        = tipsReceivedInit + tipsGivenInit
  const paymentsSent     = portfolio.data?.stats?.paymentsSent ?? 0
  const paymentsReceived = portfolio.data?.stats?.paymentsReceived ?? 0
  const agentSpendInit   = Number(weekly.data?.agentSpend?.totalBaseUnits ?? '0') / 1e6
  const agentTxCount     = weekly.data?.agentSpend?.txCount ?? 0
  const dailyCapPct      = Math.min(100, (agentSpendInit / 250) * 100)

  const tab = moneyTabs.find((t) => t.id === activeTab)!

  return (
    <AppShell eyebrow="Money" title="Money surface">
      <section className="p-4 sm:p-6 lg:p-8">
        {/* Headline strip */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="border border-black/10 bg-black p-6 text-white lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
              Total wallet
            </p>
            <h2 className="mt-4 font-mono text-4xl font-black tracking-tight">
              {fmt(totalInit)} INIT
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
              Live portfolio rolls up balances, paywalls, streams, tips, subscriptions, gifts, and sponsored gas readiness.
            </p>
          </div>
          <div className="border border-black/10 bg-white p-6">
            <RadioGlyph />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
              Agent daily cap
            </p>
            <p className="mt-2 font-mono text-2xl font-black">
              {fmt(agentSpendInit)} / 250 INIT
            </p>
            <div className="mt-5 h-2 w-full bg-black/10">
              <div className="h-full bg-[#0022FF]" style={{ width: `${dailyCapPct}%` }} />
            </div>
            <p className="mt-2 font-mono text-xs text-[#52525B]">
              {agentTxCount} agent tx this week
            </p>
          </div>
          <div className="overflow-hidden border border-black/10 bg-[#F5F5F5]">
            <GiftArt />
          </div>
        </div>

        {/* Stat row */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <PortfolioTile label="Tips received" amount={`${fmt(tipsReceivedInit)} INIT`} sub={`${portfolio.data?.stats?.tipsReceived ?? 0} tips`} />
          <PortfolioTile label="Tips given"    amount={`${fmt(tipsGivenInit)} INIT`}    sub="" />
          <PortfolioTile label="Sent"          amount={paymentsSent.toString()}         sub={`${paymentsSent} tx`} />
          <PortfolioTile label="Received"      amount={paymentsReceived.toString()}     sub={`${paymentsReceived} tx`} />
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <div className="flex h-auto w-full flex-wrap justify-start border border-black/10 bg-white">
            {moneyTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={[
                  'border-r border-black/10 px-4 py-3 text-sm font-semibold transition cursor-pointer',
                  t.id === activeTab
                    ? 'bg-[#0022FF] text-white'
                    : 'bg-white text-[#0A0A0A] hover:bg-[#F5F5F5]',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab summary banner */}
          <div className="mt-4 flex flex-col justify-between gap-3 border border-black/10 bg-[#F5F5F5] p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">{tab.label}</p>
              <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                {tab.summary}
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm text-[#0022FF]">
              {tab.actions.length} flows
              <WalletGlyph />
            </div>
          </div>

          {/* Action grid */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tab.actions.map((action) => (
              <ActionCard
                key={action.id}
                scope={`money-${tab.id}`}
                action={action}
                onOpen={setModalAction}
              />
            ))}
          </div>
        </div>

        <ActionDialog action={modalAction} onClose={() => setModalAction(null)} />
      </section>
    </AppShell>
  )
}

/* ───────────────── Helpers ───────────────── */

function PortfolioTile({ label, amount, sub }: { label: string; amount: string; sub: string }) {
  return (
    <article className="border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xl font-bold">{label}</p>
        <span className="flex items-center gap-1 font-mono text-xs text-[#0022FF]">
          live
          <UpRightGlyph />
        </span>
      </div>
      <p className="mt-4 font-mono text-2xl font-black tnum">{amount}</p>
      {sub && <p className="mt-1 font-mono text-xs text-[#52525B]">{sub}</p>}
    </article>
  )
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function RadioGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </svg>
  )
}

function WalletGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

function UpRightGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  )
}

/** GiftArt — replaces the prototype's external gift photo. Bold geometric
 * gift box illustration in CSS, no image dep. */
function GiftArt() {
  return (
    <div className="relative h-full min-h-48 w-full bg-gradient-to-br from-[#FFE3A1] via-[#FFF1D0] to-[#F5F5F5]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="h-28 w-28 border-2 border-[#0A0A0A] bg-white" />
          <div className="absolute left-1/2 top-0 h-28 w-2 -translate-x-1/2 bg-[#0022FF]" />
          <div className="absolute left-0 top-1/2 h-2 w-28 -translate-y-1/2 bg-[#0022FF]" />
        </div>
      </div>
    </div>
  )
}
