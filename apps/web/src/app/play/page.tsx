'use client'

/**
 * /play — Play surface (Emergent design parity).
 *
 * Header: black "Outcome markets" hero card + live oracle board ribbon
 * (real Slinky prices via /v1/oracle/*).
 * Tabs: Wagers | Prediction markets | Lucky pools.
 * Body: FlowCard grid wired to real Move contract pages.
 */
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'
import { FlowCard } from '@/components/ui/flow-card'
import { Icon } from '@/components/ui/icon'
import { getOracleTickers, getOraclePrice } from '@/lib/api'

type Tab = 'wagers' | 'prediction' | 'lucky'

const TABS: { id: Tab; label: string; subtitle: string }[] = [
  { id: 'wagers',     label: 'Wagers',             subtitle: 'Escrowed 1v1, PvP, and oracle-resolved predictions.' },
  { id: 'prediction', label: 'Prediction markets', subtitle: 'Stake YES / NO on outcomes with deadlines and oracle resolution.' },
  { id: 'lucky',      label: 'Lucky pools',        subtitle: 'Entry-fee pools with random winner draw.' },
]

export default function PlayPage() {
  const [tab, setTab] = React.useState<Tab>('wagers')

  return (
    <AppShell eyebrow="Play" title="Play surface">
      {/* HERO STRIP */}
      <section className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr] gap-3">
        <div className="bg-[var(--color-ink)] text-white rounded-md p-7 min-h-[200px]">
          <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-white/55">
            Outcome markets
          </span>
          <h2 className="mt-2 font-display font-bold text-[26px] leading-tight">
            Bet, predict, pool, resolve, and claim winnings.
          </h2>
          <p className="mt-3 text-[13.5px] text-white/65 leading-[1.55] max-w-md">
            Every wager, prediction, and lucky pool is escrowed on-chain and resolvable from a live Slinky price feed.
          </p>
        </div>

        <div className="border border-[var(--color-line)] rounded-md p-6 min-h-[200px] flex flex-col">
          <div className="flex items-center gap-2 text-[12px] text-[var(--color-accent)]">
            <Icon name="lightning" size={14} />
            <span className="font-mono tracking-[0.12em] uppercase">Oracle board</span>
          </div>
          <LiveOracleList />
        </div>
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

      <section className="mt-6 border border-[var(--color-line)] rounded-md p-5 bg-[var(--color-bg-muted)]">
        <span className="eyebrow">{TABS.find((t) => t.id === tab)?.label.toUpperCase()}</span>
        <h2 className="mt-1 font-display font-bold text-[20px] leading-tight text-ink">
          {TABS.find((t) => t.id === tab)?.subtitle}
        </h2>
      </section>

      <section className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tab === 'wagers' && (
          <>
            <FlowCard module="wager_escrow.move" title="Propose wager"          description="1v1 prediction. Stake, opponent, deadline." href="/predict" />
            <FlowCard module="wager_escrow.move" title="Propose PvP wager"      description="Head-to-head. Both sides escrow." href="/predict" />
            <FlowCard module="wager_escrow.move" title="Accept wager"           description="Match a proposed wager." href="/predict" />
            <FlowCard module="wager_escrow.move" title="Resolve wager"          description="Winner takes the pot." href="/predict" />
            <FlowCard module="wager_escrow.move" title="Concede wager"          description="Forfeit — counterparty wins." href="/predict" />
            <FlowCard module="wager_escrow.move" title="Cancel pending wager"   description="Cancel before any acceptor steps in." href="/predict" />
            <FlowCard module="wager_escrow.move" title="Refund expired wager"   description="Return stake on a wager nobody accepted." href="/predict" />
            <FlowCard module="wager_escrow.move" title="Propose oracle wager"   description="Resolves automatically from a Slinky price feed." href="/predict" />
            <FlowCard module="wager_escrow.move" title="Resolve from oracle"    description="Trigger oracle-driven resolution at deadline." href="/predict" />
          </>
        )}
        {tab === 'prediction' && (
          <>
            <FlowCard module="prediction_pool.move" title="Create market"      description="YES / NO market with deadline and resolver." href="/predict" />
            <FlowCard module="prediction_pool.move" title="Stake YES / NO"     description="Take a side on an open market." href="/predict" />
            <FlowCard module="prediction_pool.move" title="Resolve market"     description="Settle YES or NO at deadline." href="/predict" />
            <FlowCard module="prediction_pool.move" title="Claim winnings"     description="Pull your share of the resolved pot." href="/predict" />
          </>
        )}
        {tab === 'lucky' && (
          <>
            <FlowCard module="lucky_pool.move" title="Create lucky pool" description="Entry fee + N participants. First to fill wins random." href="/lucky" />
            <FlowCard module="lucky_pool.move" title="Join pool"         description="Pay entry to enter the draw." href="/lucky" />
            <FlowCard module="lucky_pool.move" title="Draw winner"       description="Trigger the random selection once full." href="/lucky" />
          </>
        )}
      </section>
    </AppShell>
  )
}

/* ───────────────────────────────────────────────────────────── */

function LiveOracleList() {
  const tickers = useQuery({
    queryKey: ['oracle-tickers'],
    queryFn: getOracleTickers,
    staleTime: 60_000,
  })

  if (tickers.isLoading) {
    return (
      <ul className="mt-4 flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <li key={i} className="h-6 rounded bg-[var(--color-bg-muted)] animate-pulse" />
        ))}
      </ul>
    )
  }

  return (
    <ul className="mt-4 flex flex-col gap-2 text-[13px] font-mono">
      {(tickers.data?.tickers ?? []).slice(0, 4).map((pair) => (
        <OracleRow key={pair} pair={pair} />
      ))}
      {(tickers.data?.tickers ?? []).length === 0 && (
        <li className="text-ink-3 text-[12px]">Oracle not live.</li>
      )}
    </ul>
  )
}

function OracleRow({ pair }: { pair: string }) {
  const { data } = useQuery({
    queryKey: ['oracle-price', pair],
    queryFn: () => getOraclePrice(pair),
    refetchInterval: 5_000,
  })
  // OraclePrice.price is a string (raw integer); divide by 10**decimals.
  const display = data
    ? (Number(data.price) / 10 ** data.decimals).toFixed(2)
    : null
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink-3">{pair}</span>
      <span className="tnum text-ink">${display ?? '—'}</span>
    </li>
  )
}
