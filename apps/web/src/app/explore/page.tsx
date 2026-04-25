'use client'

/**
 * /explore — Explore surface, ported from prototype Explore.jsx.
 *
 * Sections:
 *   • Three discovery columns (Recent / Top Creators / Rising) — real
 *     data via /v1/discover/*
 *   • Tabs: Leaderboards / Oracle prices / Activity / Squads
 *   • Per-tab content driven by real backend
 */
import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'
import {
  getDiscoverRecent,
  getDiscoverTopCreators,
  getDiscoverRising,
  getTopCreators,
  getTopTippers,
  getOracleTickers,
  getOraclePrice,
} from '@/lib/api'

type Tab = 'leaderboards' | 'oracle' | 'activity' | 'squads'

export default function ExplorePage() {
  const [tab, setTab] = React.useState<Tab>('leaderboards')

  const recent = useQuery({ queryKey: ['discover-recent'], queryFn: () => getDiscoverRecent(8),      staleTime: 30_000 })
  const top    = useQuery({ queryKey: ['discover-top'],    queryFn: () => getDiscoverTopCreators(8), staleTime: 30_000 })
  const rising = useQuery({ queryKey: ['discover-rising'], queryFn: () => getDiscoverRising(8),      staleTime: 30_000 })

  return (
    <AppShell eyebrow="Explore" title="Explore surface">
      <section className="p-4 sm:p-6 lg:p-8">
        {/* 3 discovery columns */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DiscoverColumn title="Recent"        items={recent.data ?? []} loading={recent.isLoading} />
          <DiscoverColumn title="Top Creators"  items={top.data    ?? []} loading={top.isLoading} />
          <DiscoverColumn title="Rising"        items={rising.data ?? []} loading={rising.isLoading} />
        </div>

        {/* Tabs */}
        <div className="mt-8">
          <div className="flex h-auto w-full flex-wrap justify-start border border-black/10 bg-white">
            {(['leaderboards', 'oracle', 'activity', 'squads'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  'border-r border-black/10 px-4 py-3 text-sm font-semibold transition cursor-pointer capitalize',
                  t === tab ? 'bg-[#0022FF] text-white' : 'bg-white text-[#0A0A0A] hover:bg-[#F5F5F5]',
                ].join(' ')}
              >
                {t === 'oracle' ? 'Oracle prices' : t}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {tab === 'leaderboards' && <LeaderboardsTab />}
            {tab === 'oracle'       && <OracleTab />}
            {tab === 'activity'     && (
              <div className="border border-black/10 bg-white p-8 text-center font-mono text-sm text-[#52525B]">
                Real-time activity feed appears here as transactions land.
              </div>
            )}
            {tab === 'squads'       && (
              <div className="border border-black/10 bg-white p-8 text-center font-mono text-sm text-[#52525B]">
                Squads directory — visit{' '}
                <Link href="/squads" className="text-[#0022FF] underline">
                  /squads
                </Link>{' '}
                for the full list.
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  )
}

/* ───────────────── Discovery columns ───────────────── */

interface DiscoverItem {
  address: string
  initName: string | null
}

function DiscoverColumn({
  title,
  items,
  loading,
}: {
  title: string
  items: DiscoverItem[]
  loading: boolean
}) {
  return (
    <div className="border border-black/10 bg-white p-5 min-h-[280px]">
      <div className="flex items-center gap-2 mb-4">
        <CompassGlyph />
        <h3 className="font-display text-xl font-black tracking-tight">{title}</h3>
      </div>
      <ul className="flex flex-col gap-2">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="h-10 bg-[#F5F5F5] animate-pulse" />
        ))}
        {!loading && items.length === 0 && (
          <li className="text-sm text-[#52525B]">No data yet.</li>
        )}
        {!loading && items.map((item) => (
          <li
            key={item.address}
            className="border border-black/10 px-3 py-2 font-mono text-xs"
          >
            {item.initName ?? short(item.address)}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────────── Leaderboards tab ───────────────── */

function LeaderboardsTab() {
  const creators = useQuery({ queryKey: ['top-creators'], queryFn: () => getTopCreators(5), staleTime: 30_000 })
  const tippers  = useQuery({ queryKey: ['top-tippers'],  queryFn: () => getTopTippers(5),  staleTime: 30_000 })

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <RankedList
        title="Top creators"
        items={creators.data ?? []}
        unit="tips"
        valueKey="tipsReceived"
      />
      <RankedList
        title="Top tippers"
        items={tippers.data ?? []}
        unit="tips"
        valueKey="tipsGiven"
      />
      <RankedList
        title="Creator top tippers"
        items={(tippers.data ?? []).slice(0, 3)}
        unit="count"
        valueKey="tipCount"
      />
    </div>
  )
}

interface LeaderRow {
  rank?: number
  address: string
  initName: string | null
  tipsReceived?: number
  tipsGiven?: number
  tipCount?: number
}

function RankedList({
  title,
  items,
  unit,
  valueKey,
}: {
  title: string
  items: LeaderRow[]
  unit: string
  valueKey: 'tipsReceived' | 'tipsGiven' | 'tipCount'
}) {
  return (
    <div className="border border-black/10 bg-white p-5 min-h-[200px]">
      <h3 className="font-display text-xl font-black tracking-tight mb-4">{title}</h3>
      <ol className="flex flex-col gap-1.5 font-mono text-sm">
        {items.length === 0 && <li className="text-[#52525B]">No data yet.</li>}
        {items.map((row, i) => (
          <li key={row.address} className="flex items-center justify-between">
            <span>
              {i + 1}. {row.initName ?? short(row.address)}
            </span>
            <span className="text-[#52525B] tnum">
              {(row[valueKey] ?? 0).toLocaleString()} {unit}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ───────────────── Oracle tab ───────────────── */

function OracleTab() {
  const tickers = useQuery({
    queryKey: ['oracle-tickers'],
    queryFn: getOracleTickers,
    staleTime: 60_000,
  })
  return (
    <div className="border border-black/10 bg-white p-5">
      <h3 className="font-display text-xl font-black tracking-tight mb-4">Slinky oracle</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {tickers.isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-[#F5F5F5] animate-pulse" />
        ))}
        {(tickers.data?.tickers ?? []).map((pair) => (
          <OracleTile key={pair} pair={pair} />
        ))}
      </div>
    </div>
  )
}

function OracleTile({ pair }: { pair: string }) {
  const { data } = useQuery({
    queryKey: ['oracle-price', pair],
    queryFn: () => getOraclePrice(pair),
    refetchInterval: 5_000,
  })
  const display = data ? (Number(data.price) / 10 ** data.decimals).toFixed(2) : null
  return (
    <div className="border border-black/10 bg-white p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.10em] text-[#52525B]">
        {pair}
      </div>
      <div className="mt-1 font-mono tnum text-[15px] font-bold">
        ${display ?? '—'}
      </div>
    </div>
  )
}

/* ───────────────── Glyphs ───────────────── */

function CompassGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function short(addr: string | null | undefined): string {
  if (!addr) return '—'
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}
