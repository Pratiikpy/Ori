'use client'

/**
 * BadgeRow — horizontal strip of on-chain achievement badges + an optional
 * "ghost" row of unearned badges to hint at what's possible.
 *
 * Pulls from /v1/profiles/:address/badges which proxies the Move view fn
 * `achievement_sbt::get_badges`. Each badge is soulbound — no transfer path.
 *
 * Tiered badges (level 1..4) render with a level-specific ring. Multiple
 * levels of the same type are collapsed to the highest level earned — the
 * lower tiers are subsumed by the higher one for compactness.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBadges, type BadgeRecord } from '@/lib/api'
import {
  allBadgeMeta,
  getBadgeMeta,
  LEVEL_LABEL,
  LEVEL_RING,
} from '@/lib/badge-meta'

type Props = {
  address: string
  showLocked?: boolean
}

export function BadgeRow({ address, showLocked = true }: Props) {
  const { data, isLoading } = useQuery<BadgeRecord[]>({
    queryKey: ['badges', address],
    queryFn: () => getBadges(address),
    enabled: Boolean(address),
    staleTime: 60_000,
  })

  // Collapse to the highest level seen per badge_type for tiered badges.
  const topByType = useMemo(() => {
    const map = new Map<number, BadgeRecord>()
    for (const b of data ?? []) {
      const meta = getBadgeMeta(b.badgeType)
      if (!meta.tiered) {
        map.set(b.badgeType + 1_000_000 + b.level, b) // unique key for milestones
        continue
      }
      const existing = map.get(b.badgeType)
      if (!existing || b.level > existing.level) {
        map.set(b.badgeType, b)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.badgeType - b.badgeType)
  }, [data])

  const earnedTypes = new Set(topByType.map((b) => b.badgeType))
  const lockedMeta = allBadgeMeta().filter((m) => !earnedTypes.has(m.id))

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Badges</h3>
          <p className="text-xs text-muted-foreground">
            Soulbound. Earned on-chain.{' '}
            <span className="text-foreground">{data?.length ?? 0}</span>{' '}
            {(data?.length ?? 0) === 1 ? 'badge' : 'badges'} minted.
          </p>
        </div>
      </div>

      {isLoading && <div className="text-xs text-muted-foreground">Reading chain…</div>}

      {!isLoading && topByType.length === 0 && !showLocked && (
        <div className="text-xs text-muted-foreground">No badges yet.</div>
      )}

      <div className="flex flex-wrap gap-2">
        {topByType.map((b) => {
          const meta = getBadgeMeta(b.badgeType)
          const tierLabel = meta.tiered && b.level > 0 ? ` · ${LEVEL_LABEL[b.level] ?? ''}` : ''
          const ring = meta.tiered && b.level > 0 ? LEVEL_RING[b.level] ?? '' : ''
          return (
            <div
              key={`${b.badgeType}-${b.level}`}
              title={`${meta.label}${tierLabel} — minted ${new Date(b.mintedAt).toLocaleDateString()}`}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border text-xs font-medium ${meta.accent} ${ring}`}
            >
              <meta.Icon className="w-3.5 h-3.5" />
              <span>
                {meta.label}
                {tierLabel && (
                  <span className="opacity-80 font-normal">{tierLabel}</span>
                )}
              </span>
            </div>
          )
        })}

        {showLocked &&
          lockedMeta.map((meta) => (
            <div
              key={`locked-${meta.id}`}
              title={meta.description}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border border-dashed border-border text-xs text-muted-foreground opacity-60"
            >
              <meta.Icon className="w-3.5 h-3.5" />
              {meta.label}
            </div>
          ))}
      </div>
    </section>
  )
}
