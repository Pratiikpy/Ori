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
import { PageHeader, Serif } from '@/components/page-header'
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
        <div className="max-w-md md:max-w-xl mx-auto w-full px-5 pt-10 pb-10">
          <PageHeader
            kicker="03 · Portfolio"
            title={
              <>
                Your <Serif>whole</Serif> record.
              </>
            }
            sub="Every payment, tip, gift, and badge on one surface. Connect a wallet to see yours."
          />
          <button
            onClick={() => openConnect()}
            className="mt-8 w-full rounded-full h-11 px-5 text-[14px] font-medium inline-flex items-center justify-center gap-1.5 hover:-translate-y-[1px] transition will-change-transform"
            style={{
              backgroundColor: 'var(--color-foreground)',
              color: 'var(--color-background)',
            }}
          >
            Connect wallet
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Portfolio">
      <div className="max-w-md md:max-w-2xl mx-auto w-full px-5 pt-8 pb-8 space-y-5">
        <PageHeader
          kicker="03 · Portfolio"
          title={
            data?.initName ? (
              <>
                <Serif>{data.initName}</Serif>
              </>
            ) : (
              <>
                Your <Serif>record</Serif>.
              </>
            )
          }
          sub={
            data?.stats.firstSeenAt
              ? `On Ori since ${new Date(data.stats.firstSeenAt).toLocaleDateString()}.`
              : undefined
          }
        />

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
          className="w-full rounded-full h-11 px-5 text-[13.5px] font-medium text-ink-2 border border-[var(--color-border-strong)] hover:text-foreground hover:bg-white/[0.04] hover:border-[var(--color-border-emphasis)] transition inline-flex items-center justify-center gap-1.5"
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
  // Mono numeric values + mono-uppercase label = "data" feel, not "marketing".
  // Reference pattern is: small font-mono eyebrow + big tnum number + tiny sub.
  return (
    <div className="rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-3.5 panel-hover">
      <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] text-ink-3 font-mono">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-mono tnum tracking-[-0.02em] font-medium text-foreground">
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-ink-3 mt-0.5 truncate font-mono">{sub}</div>}
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
