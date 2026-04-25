'use client'

/**
 * TopBadges — the two pinned pills shown top-right on every signed-in
 * surface in the Emergent design.
 *
 *   ┌──────────────┐  ┌──────────────────┐
 *   │ ⛨  Trust 92  │  │ 💼 250 INIT/day │
 *   └──────────────┘  └──────────────────┘
 *
 * Trust pulls from /v1/trust/:address.
 * Daily cap pulls from /v1/agent/policy/:address (falls back to default).
 *
 * Static-friendly: when not connected, both badges show neutral defaults
 * so the layout doesn't shift.
 */
import * as React from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useQuery } from '@tanstack/react-query'
import { getTrustScore, getAgentPolicy } from '@/lib/api'
import { Icon } from '@/components/ui/icon'

export function TopBadges() {
  const { initiaAddress } = useInterwovenKit()

  const { data: trust } = useQuery({
    queryKey: ['trust', initiaAddress],
    queryFn: () => getTrustScore(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })

  const { data: policy } = useQuery({
    queryKey: ['agent-policy', initiaAddress],
    queryFn: () => getAgentPolicy(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })

  const trustScore = trust?.score ?? null
  const dailyCap = policy?.dailyCap ?? null

  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--color-line)] bg-white text-[13px] text-ink">
        <Icon name="shield-check" size={14} className="text-ink-2" />
        <span className="font-medium">
          Trust <span className="font-mono tnum">{trustScore ?? '—'}</span>
        </span>
      </span>
      <span className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--color-line)] bg-white text-[13px] text-ink">
        <Icon name="wallet" size={14} className="text-ink-2" />
        <span className="font-medium">
          <span className="font-mono tnum">{dailyCap ?? '250'}</span> INIT/day
        </span>
      </span>
    </div>
  )
}
