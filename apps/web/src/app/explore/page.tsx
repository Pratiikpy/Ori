'use client'

/**
 * /explore — Explore surface.
 *
 * Top: 3 columns — Recent / Top Creators / Rising — each driven by
 * /v1/discover/* endpoints.
 * Tabs: Leaderboards | Oracle prices | Activity | Squads.
 * Body: 3-column ranked list cards (top creators, top tippers, etc.)
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
import { Icon } from '@/components/ui/icon'

type Tab = 'leaderboards' | 'oracle' | 'activity' | 'squads'

export default function ExplorePage() {
  const [tab, setTab] = React.useState<Tab>('leaderboards')

  const recent = useQuery({ queryKey: ['discover-recent'],   queryFn: () => getDiscoverRecent(8),       staleTime: 30_000 })
  const top    = useQuery({ queryKey: ['discover-top'],      queryFn: () => getDiscoverTopCreators(8),  staleTime: 30_000 })
  const rising = useQuery({ queryKey: ['discover-rising'],   queryFn: () => getDiscoverRising(8),       staleTime: 30_000 })

  return (
    <AppShell eyebrow="Explore" title="Explore surface">
      {/* DISCOVER COLUMNS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DiscoverColumn title="Recent" items={recent.data ?? []} loading={recent.isLoading} format="event" />
        <DiscoverColumn title="Top Creators" items={top.data ?? []} loading={top.isLoading} format="creator" />
        <DiscoverColumn title="Rising" items={rising.data ?? []} loading={rising.isLoading} format="creator" />
      </section>

      {/* TABS */}
      <section className="mt-8 border-b border-[var(--color-line)] flex items-center gap-1 overflow-x-auto">
        {(['leaderboards', 'oracle', 'activity', 'squads'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'shrink-0 h-10 px-4 text-[13px] font-medium transition rounded-t-md cursor-pointer capitalize',
              t === tab ? 'bg-[var(--color-accent)] text-white' : 'text-ink-2 hover:text-ink hover:bg-[var(--color-surface-hover)]',
            ].join(' ')}
          >
            {t === 'oracle' ? 'Oracle prices' : t}
          </button>
        ))}
      </section>

      {/* TAB CONTENT */}
      <section className="mt-6">
        {tab === 'leaderboards' && <LeaderboardsTab />}
        {tab === 'oracle' && <OracleTab />}
        {tab === 'activity' && (
          <div className="border border-[var(--color-line)] rounded-md p-8 text-center text-ink-3 text-[14px]">
            Realtime activity feed — coming live as transactions land.
          </div>
        )}
        {tab === 'squads' && (
          <div className="border border-[var(--color-line)] rounded-md p-8 text-center text-ink-3 text-[14px]">
            Squads directory — link from <Link href="/squads" className="text-[var(--color-accent)] underline">Squads page</Link>.
          </div>
        )}
      </section>
    </AppShell>
  )
}

/* ───────────────────────────────────────────────────────────── */

function DiscoverColumn({
  title,
  items,
  loading,
  format,
}: {
  title: string
  items: Array<{ address?: string; username?: string | null; subject?: string; predicate?: string }>
  loading: boolean
  format: 'event' | 'creator'
}) {
  return (
    <div className="border border-[var(--color-line)] rounded-md p-5 bg-white min-h-[280px]">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="eye" size={14} className="text-[var(--color-accent)]" />
        <h3 className="font-display font-bold text-[18px] text-ink">{title}</h3>
      </div>
      <ul className="flex flex-col gap-2">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="h-9 rounded-md bg-[var(--color-bg-muted)] animate-pulse" />
        ))}
        {!loading && items.length === 0 && (
          <li className="text-[13px] text-ink-3">No data yet.</li>
        )}
        {!loading && items.map((item, i) => (
          <li
            key={i}
            className="h-10 px-3 rounded-md border border-[var(--color-line)] flex items-center font-mono text-[13px] text-ink"
          >
            {format === 'event'
              ? `${item.username ?? short(item.address)} ${item.predicate ?? 'opened a flow'}`
              : (item.username ?? short(item.address))}
          </li>
        ))}
      </ul>
    </div>
  )
}

function LeaderboardsTab() {
  const creators = useQuery({ queryKey: ['top-creators'], queryFn: () => getTopCreators(5), staleTime: 30_000 })
  const tippers  = useQuery({ queryKey: ['top-tippers'],  queryFn: () => getTopTippers(5),  staleTime: 30_000 })

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <RankedList title="Top creators" items={creators.data ?? []} unit="sales" />
      <RankedList title="Top tippers" items={tippers.data ?? []} unit="INIT" />
      <RankedList title="Creator top tippers" items={tippers.data?.slice(0, 3) ?? []} unit="INIT" />
    </div>
  )
}

function RankedList({
  title,
  items,
  unit,
}: {
  title: string
  items: Array<{ address?: string; username?: string | null; total?: bigint | number }>
  unit: string
}) {
  return (
    <div className="border border-[var(--color-line)] rounded-md p-5 bg-white min-h-[200px]">
      <h3 className="font-display font-bold text-[18px] text-ink mb-4">{title}</h3>
      <ol className="flex flex-col gap-1.5 font-mono text-[13px]">
        {items.length === 0 && <li className="text-ink-3">No data yet.</li>}
        {items.map((item, i) => (
          <li key={i} className="flex items-center justify-between">
            <span className="text-ink">
              {i + 1}. {item.username ?? short(item.address)}
            </span>
            <span className="text-ink-3 tnum">
              {Number(item.total ?? 0).toLocaleString()} {unit}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function OracleTab() {
  const tickers = useQuery({ queryKey: ['oracle-tickers'], queryFn: getOracleTickers, staleTime: 60_000 })

  return (
    <div className="border border-[var(--color-line)] rounded-md p-5 bg-white">
      <h3 className="font-display font-bold text-[18px] text-ink mb-4">Slinky oracle</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {(tickers.data?.tickers ?? []).map((pair) => (
          <OracleTile key={pair} pair={pair} />
        ))}
        {tickers.isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-md bg-[var(--color-bg-muted)] animate-pulse" />
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
  return (
    <div className="border border-[var(--color-line)] rounded-md p-3 bg-white">
      <div className="font-mono text-[10.5px] uppercase text-ink-3 tracking-[0.10em]">{pair}</div>
      <div className="mt-1 font-mono tnum text-[15px] font-medium text-ink">
        ${data?.price?.toFixed(2) ?? '—'}
      </div>
    </div>
  )
}

function short(addr: string | undefined): string {
  if (!addr) return '—'
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}
