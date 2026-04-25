'use client'

/**
 * /play — Play surface, ported 1:1 from prototype Play.jsx.
 *
 * Layout:
 *   • Top grid (1.4fr/0.6fr): "Outcome markets" intro card + Slinky oracle
 *     mini panel (real prices via /v1/oracle/*)
 *   • Tabs: Wagers | Prediction markets | Lucky pools
 *   • Per-tab summary banner + ActionCard grid (3-col xl)
 */
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'
import { ActionCard, type ActionDef } from '@/components/ui/action-card'
import { ActionDialog } from '@/components/ui/action-dialog'
import { getOracleTickers, getOraclePrice } from '@/lib/api'
import { playTabs } from '@/lib/ori-data'

export default function PlayPage() {
  const [activeTab, setActiveTab]   = React.useState(playTabs[0]!.id)
  const [modalAction, setModalAction] = React.useState<ActionDef | null>(null)

  const tab = playTabs.find((t) => t.id === activeTab)!

  return (
    <AppShell eyebrow="Play" title="Play surface">
      <section className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="border border-black/10 bg-[#F5F5F5] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
              Outcome markets
            </p>
            <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
              Bet, predict, pool, resolve, and claim winnings.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#52525B]">
              Every wager, prediction market, and lucky pool action is escrowed on-chain via the Move modules and resolvable from a live Slinky price feed.
            </p>
          </div>
          <div className="border border-black/10 bg-black p-6 text-white">
            <TrophyGlyph />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
              Slinky pairs
            </p>
            <LiveOracleList />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <div className="flex h-auto w-full flex-wrap justify-start border border-black/10 bg-white">
            {playTabs.map((t) => (
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

          <div className="mt-4 border border-black/10 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">{tab.label}</p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight sm:text-3xl">
              {tab.summary}
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tab.actions.map((action) => (
              <ActionCard
                key={action.id}
                scope={`play-${tab.id}`}
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

/* ───────────────── Live oracle ───────────────── */

function LiveOracleList() {
  const tickers = useQuery({ queryKey: ['oracle-tickers'], queryFn: getOracleTickers, staleTime: 60_000 })

  if (tickers.isLoading) {
    return (
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-white/10 animate-pulse" />
        ))}
      </div>
    )
  }
  const list = (tickers.data?.tickers ?? []).slice(0, 3)
  if (list.length === 0) {
    return <p className="mt-4 font-mono text-xs text-white/50">Oracle offline.</p>
  }
  return (
    <div className="mt-4 space-y-2">
      {list.map((pair) => <OracleRow key={pair} pair={pair} />)}
    </div>
  )
}

function OracleRow({ pair }: { pair: string }) {
  const { data } = useQuery({
    queryKey: ['oracle-price', pair],
    queryFn: () => getOraclePrice(pair),
    refetchInterval: 5_000,
  })
  const display = data ? (Number(data.price) / 10 ** data.decimals).toFixed(2) : null
  return (
    <div className="flex items-center justify-between font-mono text-sm">
      <span>{pair}</span>
      <span className="text-[#00C566] tnum">${display ?? '—'}</span>
    </div>
  )
}

function TrophyGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFB800" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}
