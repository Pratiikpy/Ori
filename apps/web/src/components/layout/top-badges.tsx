'use client'

/**
 * TopBadges — Trust + Agent-spend pills, top-right of every signed-in surface.
 *
 *   ┌──────────────┐  ┌────────────────────────┐
 *   │ ⛨  Trust 92  │  │ ⚡ {n} INIT / week     │
 *   └──────────────┘  └────────────────────────┘
 *
 * Trust pulls from /v1/trust/:address (real).
 * Agent-spend pulls from /v1/profiles/:address/weekly-stats — total agent
 * tx volume in the last 7 days. We don't show a per-agent dailyCap here
 * because the on-chain policy is keyed by (owner, agent) pair and this
 * component has no agent context.
 */
import * as React from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useQuery } from '@tanstack/react-query'
import { getTrustScore, getWeeklyStats } from '@/lib/api'
import { Icon } from '@/components/ui/icon'

export function TopBadges() {
  const { initiaAddress } = useInterwovenKit()

  const { data: trust } = useQuery({
    queryKey: ['trust', initiaAddress],
    queryFn: () => getTrustScore(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })

  const { data: weekly } = useQuery({
    queryKey: ['weekly-stats', initiaAddress],
    queryFn: () => getWeeklyStats(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 60_000,
  })

  const trustScore = trust?.score ?? null
  const agentSpendInit = weekly
    ? (Number(weekly.agentSpend.totalBaseUnits) / 1e6).toFixed(0)
    : null

  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--color-line)] bg-white text-[13px] text-ink">
        <Icon name="shield-check" size={14} className="text-ink-2" />
        <span className="font-medium">
          Trust <span className="font-mono tnum">{trustScore ?? '—'}</span>
        </span>
      </span>
      <span className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--color-line)] bg-white text-[13px] text-ink">
        <Icon name="lightning" size={14} className="text-ink-2" />
        <span className="font-medium">
          <span className="font-mono tnum">{agentSpendInit ?? '0'}</span> INIT/week
        </span>
      </span>
    </div>
  )
}
