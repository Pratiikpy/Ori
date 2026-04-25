'use client'

/**
 * TipLeaderboard — top-5 supporters of a creator, by total tip volume.
 *
 * Pulls from `/v1/profiles/:creator/top-tippers`. Each entry links to that
 * tipper's profile. Creator's self-profile sees this as "Your top fans".
 */
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { getCreatorTopTippers, type LeaderboardEntry } from '@/lib/api'
import { ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'

type Props = {
  creatorAddress: string
  isSelf: boolean
  limit?: number
}

export function TipLeaderboard({ creatorAddress, isSelf, limit = 5 }: Props) {
  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['top-tippers', creatorAddress, limit],
    queryFn: () => getCreatorTopTippers(creatorAddress, limit),
    enabled: Boolean(creatorAddress),
    staleTime: 30_000,
  })

  const entries = data ?? []

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold">{isSelf ? 'Your top fans' : 'Top fans'}</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">by volume</span>
      </div>

      {isLoading && (
        <div className="mt-3 text-xs text-muted-foreground">Tallying on-chain tips…</div>
      )}
      {!isLoading && entries.length === 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          {isSelf
            ? 'No fans yet. Drop your profile URL anywhere — every tip lands here, ranked by volume.'
            : 'No tips yet. Be the first — it lands on-chain instantly.'}
        </div>
      )}

      {entries.length > 0 && (
        <ol className="mt-3 space-y-2">
          {entries.map((e) => (
            <li key={e.address}>
              <Link
                href={`/${encodeURIComponent(e.initName ?? e.address)}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 hover:border-primary/40 transition"
              >
                <span className="w-6 text-center font-bold text-sm">{e.rank}</span>
                <Avatar seed={e.address} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {e.initName ?? shorten(e.address)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {e.tipCount ?? 0} {(e.tipCount ?? 0) === 1 ? 'tip' : 'tips'}
                  </div>
                </div>
                <div className="text-sm font-mono font-semibold text-success">
                  {formatBaseAmount(e.volume ?? '0')}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function Avatar({ seed }: { seed: string }) {
  const hash = Array.from(seed).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
  const h1 = hash % 360
  const h2 = (h1 + 60) % 360
  return (
    <div
      className="w-7 h-7 rounded-lg flex-none"
      style={{ background: `linear-gradient(135deg, hsl(${h1} 60% 50%), hsl(${h2} 60% 40%))` }}
      aria-hidden
    />
  )
}

function shorten(a: string): string {
  return `${a.slice(0, 10)}…${a.slice(-4)}`
}

function formatBaseAmount(raw: string): string {
  const n = BigInt(raw || '0')
  const whole = n / 10n ** BigInt(ORI_DECIMALS)
  const frac = n % 10n ** BigInt(ORI_DECIMALS)
  const fracStr = frac.toString().padStart(ORI_DECIMALS, '0').replace(/0+$/, '')
  return `${whole}${fracStr ? '.' + fracStr : ''} ${ORI_SYMBOL}`
}
