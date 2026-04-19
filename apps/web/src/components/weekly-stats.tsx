'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Send, Heart, Trophy, Twitter } from 'lucide-react'
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
    return <Skeleton className="h-28 w-full rounded-2xl" />
  }
  if (error || !stats) {
    return null
  }

  // Hide the card entirely for brand-new users with zero activity —
  // an empty "Your agent this week" card reads as broken. Show a warmer
  // prompt instead.
  const allZero =
    stats.agentSpend.txCount === 0 &&
    stats.tipsGiven.count === 0 &&
    stats.tipsReceived.count === 0 &&
    stats.predictionResults.pendingMarkets === 0
  if (allZero) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">No agent activity yet</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Plug Claude Desktop in via the <span className="text-primary font-medium">Ask Claude</span>{' '}
          tab and a single prompt can tip creators, buy paywalled content,
          and open predictions. Your weekly digest lights up here.
        </p>
      </div>
    )
  }

  const agentSpendFmt = formatAmount(stats.agentSpend.totalBaseUnits)
  const tipVolFmt = formatAmount(stats.tipsGiven.totalBaseUnits)
  const predictRecord = `${stats.predictionResults.wins}-${stats.predictionResults.losses}`
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText(stats))}`

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Your agent this week</h3>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
        >
          <Twitter className="w-3 h-3" /> Tweet
        </a>
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory">
        <StatPill
          icon={<Send className="w-3.5 h-3.5" />}
          label="Agent sent"
          value={`${agentSpendFmt} INIT`}
          sub={`${stats.agentSpend.txCount} tx`}
        />
        <StatPill
          icon={<Heart className="w-3.5 h-3.5" />}
          label="Tipped"
          value={`${tipVolFmt} INIT`}
          sub={`${stats.tipsGiven.count} creators`}
        />
        {stats.topCreator && (
          <StatPill
            icon={<Trophy className="w-3.5 h-3.5" />}
            label="Top creator"
            value={stats.topCreator.displayName}
            sub="most-tipped this week"
          />
        )}
        <StatPill
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Predictions"
          value={predictRecord}
          sub={`${stats.predictionResults.pendingMarkets} open`}
        />
      </div>
    </div>
  )
}

function StatPill({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="snap-start shrink-0 min-w-[140px] rounded-xl bg-background border border-border px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums truncate">{value}</div>
      <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
    </div>
  )
}
