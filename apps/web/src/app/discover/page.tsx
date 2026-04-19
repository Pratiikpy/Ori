'use client'

/**
 * /discover — who's interesting on Ori.
 *
 * Three shelves: Recent activity, Top creators (by tip volume),
 * and 24h Rising (most payments received today). Each card links to
 * the profile; no additional interaction on the shelf itself.
 */
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Trophy, TrendingUp } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import {
  getDiscoverRecent,
  getDiscoverRising,
  getDiscoverTopCreators,
  type DiscoverEntry,
} from '@/lib/api'
import { ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'

export default function DiscoverPage() {
  const { data: recent } = useQuery<DiscoverEntry[]>({
    queryKey: ['discover-recent'],
    queryFn: () => getDiscoverRecent(20),
    staleTime: 30_000,
  })
  const { data: topCreators } = useQuery<DiscoverEntry[]>({
    queryKey: ['discover-top-creators'],
    queryFn: () => getDiscoverTopCreators(20),
    staleTime: 60_000,
  })
  const { data: rising } = useQuery<DiscoverEntry[]>({
    queryKey: ['discover-rising'],
    queryFn: () => getDiscoverRising(20),
    staleTime: 60_000,
  })

  return (
    <AppShell title="Discover">
      <div className="max-w-md mx-auto w-full px-4 py-5 space-y-6">
        <section>
          <SectionHeader icon={<Trophy className="w-4 h-4 text-warning" />}>
            Top creators
          </SectionHeader>
          <Shelf entries={topCreators ?? []} metric="tip-volume" />
        </section>

        <section>
          <SectionHeader icon={<TrendingUp className="w-4 h-4 text-success" />}>
            Rising · last 24h
          </SectionHeader>
          <Shelf entries={rising ?? []} metric="payments-24h" />
        </section>

        <section>
          <SectionHeader icon={<Sparkles className="w-4 h-4 text-primary" />}>
            Recently active
          </SectionHeader>
          <Shelf entries={recent ?? []} metric="last-active" />
        </section>
      </div>
    </AppShell>
  )
}

function SectionHeader({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-2 inline-flex items-center gap-2">
      {icon}
      <h2 className="text-sm font-semibold">{children}</h2>
    </div>
  )
}

type Metric = 'tip-volume' | 'payments-24h' | 'last-active'

function Shelf({ entries, metric }: { entries: DiscoverEntry[]; metric: Metric }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        Nobody on this shelf yet — the first profile here gets the top slot.
      </div>
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-2">
      {entries.map((e) => (
        <li key={e.address}>
          <Link
            href={`/${encodeURIComponent(e.initName ?? e.address)}`}
            className="block rounded-2xl border border-border bg-muted/30 p-3 hover:border-primary/40 transition"
          >
            <div className="flex items-center gap-2">
              <Avatar seed={e.address} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {e.initName ?? shortAddr(e.address)}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {metricLabel(metric, e)}
                </div>
              </div>
            </div>
            {e.bio && (
              <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{e.bio}</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function metricLabel(metric: Metric, e: DiscoverEntry): string {
  if (metric === 'tip-volume' && e.tipsReceivedVolume != null) {
    return `${formatBase(e.tipsReceivedVolume)} tipped`
  }
  if (metric === 'payments-24h' && e.paymentsReceived24h != null) {
    return `${e.paymentsReceived24h} payments · 24h`
  }
  if (metric === 'last-active' && e.lastActiveAt) {
    const mins = Math.floor((Date.now() - new Date(e.lastActiveAt).getTime()) / 60_000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }
  return ''
}

function Avatar({ seed }: { seed: string }) {
  const hash = Array.from(seed).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
  const h1 = hash % 360
  const h2 = (h1 + 60) % 360
  return (
    <div
      className="w-10 h-10 rounded-xl flex-none"
      style={{ background: `linear-gradient(135deg, hsl(${h1} 60% 50%), hsl(${h2} 60% 40%))` }}
      aria-hidden
    />
  )
}

function shortAddr(a: string): string {
  return `${a.slice(0, 10)}…${a.slice(-4)}`
}

function formatBase(raw: string): string {
  const n = BigInt(raw || '0')
  const whole = n / 10n ** BigInt(ORI_DECIMALS)
  const frac = n % 10n ** BigInt(ORI_DECIMALS)
  const fracStr = frac.toString().padStart(ORI_DECIMALS, '0').replace(/0+$/, '')
  return `${whole}${fracStr ? '.' + fracStr : ''} ${ORI_SYMBOL}`
}
