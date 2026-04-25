'use client'

/**
 * TopBadges — sticky top-right pills on every signed-in surface.
 *
 *   ┌───────────────┐  ┌──────────────────┐
 *   │ ⛨ Trust 92    │  │ ⚡ 250 INIT/day  │
 *   └───────────────┘  └──────────────────┘
 *
 * Sharp 0-radius border boxes per the prototype. Trust pulls from
 * /v1/trust live. The agent-cap pill shows a static "250 INIT/day"
 * label since on-chain dailyCap is per-(owner, agent) pair and we
 * don't have an agent context at this layer; if the user has set a
 * policy via /profile, we surface it on the Profile surface instead.
 */
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useQuery } from '@tanstack/react-query'
import { getTrustScore } from '@/lib/api'

export function TopBadges() {
  const { initiaAddress } = useInterwovenKit()

  const { data: trust } = useQuery({
    queryKey: ['trust', initiaAddress],
    queryFn: () => getTrustScore(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 30_000,
  })

  const trustScore = trust?.score ?? null

  return (
    <>
      <span className="flex items-center gap-2 border border-black/10 px-3 py-2 text-sm">
        <ShieldGlyph />
        Trust <span className="font-mono tnum">{trustScore ?? '—'}</span>
      </span>
      <span className="flex items-center gap-2 border border-black/10 px-3 py-2 text-sm">
        <BotGlyph />
        <span className="font-mono tnum">250</span> INIT/day
      </span>
    </>
  )
}

function ShieldGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function BotGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  )
}
