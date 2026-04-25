'use client'

import { useEffect, useState } from 'react'
import { Twitter } from 'lucide-react'
import { getWeeklyStats, type WeeklyStats } from '@/lib/api'
import { Skeleton } from './skeleton'

const ORI_DECIMALS = 6

function formatAmount(baseUnits: string): string {
  const n = Number(baseUnits) / 10 ** ORI_DECIMALS
  if (n >= 1000) return n.toFixed(0)
  if (n >= 10) return n.toFixed(1)
  if (n > 0) return n.toFixed(3)
  return '0'
}

function tweetText(stats: WeeklyStats): string {
  const sent = formatAmount(stats.agentSpend.totalBaseUnits)
  const tips = stats.tipsGiven.count
  const top = stats.topCreator?.displayName ?? null
  const parts: string[] = [
    `My agent wallet sent ${sent} INIT on Ori this week`,
  ]
  if (tips > 0) {
    parts.push(`${tips} tips to creators${top ? ` (top: ${top})` : ''}`)
  }
  if (stats.predictionResults.pendingMarkets > 0) {
    parts.push(`${stats.predictionResults.pendingMarkets} open predictions`)
  }
  parts.push('The agent wallet for @initia_xyz. ori.chat')
  return parts.join('. ')
}

export function WeeklyStatsRow({ address }: { address: string }) {
  const [stats, setStats] = useState<WeeklyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getWeeklyStats(address)
      .then((s) => {
        if (!cancelled) {
          setStats(s)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed to load stats')
      })
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [address])

  if (loading && !stats) {
    return <Skeleton className="h-16 w-full rounded-lg" />
  }
  if (error || !stats) {
    return null
  }

  const allZero =
    stats.agentSpend.txCount === 0 &&
    stats.tipsGiven.count === 0 &&
    stats.tipsReceived.count === 0 &&
    stats.predictionResults.pendingMarkets === 0
  if (allZero) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-3 text-[12px] text-ink-3">
        No on-chain activity yet this week. Tips, predictions, and agent
        spend land here as you use Ori.
      </div>
    )
  }

  const agentSpendFmt = formatAmount(stats.agentSpend.totalBaseUnits)
  const tipVolFmt = formatAmount(stats.tipsGiven.totalBaseUnits)
  const predictRecord = `${stats.predictionResults.wins}-${stats.predictionResults.losses}`
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText(stats))}`

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          This week
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[11px] text-ink-3 hover:text-foreground transition"
        >
          <Twitter className="w-3 h-3" /> Tweet
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Agent sent" value={`${agentSpendFmt} INIT`} sub={`${stats.agentSpend.txCount} tx`} />
        <MiniStat label="Tipped" value={`${tipVolFmt} INIT`} sub={`${stats.tipsGiven.count} creators`} />
        {stats.topCreator ? (
          <MiniStat label="Top creator" value={stats.topCreator.displayName} sub="most-tipped" />
        ) : (
          <MiniStat label="Top creator" value="—" sub="" />
        )}
        <MiniStat label="Predictions" value={predictRecord} sub={`${stats.predictionResults.pendingMarkets} open`} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
        {label}
      </div>
      <div className="mt-1 font-mono text-[14px] text-foreground tabular-nums truncate">
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-ink-4 mt-0.5">{sub}</div>}
    </div>
  )
}

