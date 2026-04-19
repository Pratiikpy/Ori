'use client'

/**
 * /portfolio — self-only rollup of all your on-chain activity.
 *
 * Aggregates UserStats + recent events + badges in one request. Auth is not
 * required — the page just needs the user's wallet address from InterwovenKit.
 *
 * Attribution: layout inspired by dmpz19x-creator/Hunch's portfolio view.
 */
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import {
  Zap,
  Heart,
  Gift,
  Trophy,
  Users,
  Split,
  UserPlus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { BadgeRow } from '@/components/badge-row'
import { TrustScore } from '@/components/trust-score'
import { QuestPanel } from '@/components/quest-panel'
import { getPortfolio, type PortfolioResponse } from '@/lib/api'
import { ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'

export default function PortfolioPage() {
  const router = useRouter()
  const { initiaAddress, isConnected, openConnect } = useInterwovenKit()

  const { data, isLoading, error } = useQuery<PortfolioResponse>({
    queryKey: ['portfolio', initiaAddress],
    queryFn: () => getPortfolio(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 15_000,
  })

  const displayName = useMemo(() => {
    if (!initiaAddress) return ''
    return data?.initName ?? `${initiaAddress.slice(0, 10)}…${initiaAddress.slice(-4)}`
  }, [data, initiaAddress])

  if (!isConnected || !initiaAddress) {
    return (
      <AppShell title="Portfolio">
        <div className="max-w-md mx-auto w-full px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Connect a wallet to see your portfolio.
          </p>
          <button
            onClick={() => openConnect()}
            className="mt-4 rounded-full px-4 py-2 bg-primary text-primary-foreground text-sm font-medium"
          >
            Connect
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Portfolio">
      <div className="max-w-md mx-auto w-full px-4 py-5 space-y-4">
        <header>
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          {data?.stats.firstSeenAt && (
            <p className="text-xs text-muted-foreground">
              On Ori since {new Date(data.stats.firstSeenAt).toLocaleDateString()}
            </p>
          )}
        </header>

        {isLoading && (
          <div className="text-xs text-muted-foreground">
            Reading balances and payment history from the chain — usually ~1s.
          </div>
        )}
        {error && (
          <div className="text-xs text-danger">
            Couldn't reach the RPC. Check your connection and refresh.
          </div>
        )}

        {data && (
          <>
            <section className="grid grid-cols-2 gap-2">
              <StatCard
                icon={Zap}
                label="Payments sent"
                value={String(data.stats.paymentsSent)}
                sub={`${data.stats.paymentsReceived} received`}
              />
              <StatCard
                icon={Heart}
                label="Tips given"
                value={String(data.stats.tipsGiven)}
                sub={formatBase(data.stats.tipsGivenVolume)}
              />
              <StatCard
                icon={Trophy}
                label="Tips received"
                value={String(data.stats.tipsReceived)}
                sub={formatBase(data.stats.tipsReceivedVolume)}
              />
              <StatCard
                icon={Gift}
                label="Gifts sent"
                value={String(data.stats.giftsSent)}
                sub={`${data.stats.giftsClaimed} claimed`}
              />
              <StatCard
                icon={Split}
                label="Bills split"
                value={String(data.stats.billsSplit)}
                sub=""
              />
              <StatCard
                icon={Users}
                label="Followers"
                value={String(data.stats.followersCount)}
                sub={`${data.stats.followingCount} following`}
              />
              <StatCard
                icon={Sparkles}
                label="Badges"
                value={String(data.stats.badgeCount)}
                sub="on-chain"
              />
              <StatCard
                icon={UserPlus}
                label="Referrals"
                value={String(data.stats.referrals)}
                sub=""
              />
            </section>

            <TrustScore address={initiaAddress} />
            <QuestPanel address={initiaAddress} />
            <BadgeRow address={initiaAddress} showLocked />

            {data.recent.tipsReceived.length > 0 && (
              <section className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="inline-flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-warning" />
                  <h3 className="text-sm font-semibold">Recent tips received</h3>
                </div>
                <ul className="space-y-1">
                  {data.recent.tipsReceived.map((t, i) => (
                    <li key={i} className="text-xs flex items-center justify-between gap-2">
                      <span className="font-mono truncate">
                        {t.from.slice(0, 14)}…{t.from.slice(-4)}
                      </span>
                      <span className="font-mono text-success">{formatBase(t.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <button
          onClick={() => router.push(`/${encodeURIComponent(data?.initName ?? initiaAddress)}`)}
          className="w-full rounded-2xl py-3 bg-muted border border-border text-sm"
        >
          Open public profile →
        </button>
      </div>
    </AppShell>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3">
      <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

function formatBase(raw: string): string {
  const n = BigInt(raw || '0')
  const whole = n / 10n ** BigInt(ORI_DECIMALS)
  const frac = n % 10n ** BigInt(ORI_DECIMALS)
  const fracStr = frac.toString().padStart(ORI_DECIMALS, '0').replace(/0+$/, '').slice(0, 2)
  return `${whole}${fracStr ? '.' + fracStr : ''} ${ORI_SYMBOL}`
}
