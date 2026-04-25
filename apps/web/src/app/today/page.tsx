'use client'

/**
 * /today — signed-in home. Bento dashboard.
 *
 * One row of "key signal" cards (balance, agent status, today's count),
 * one row of quick-action tiles, one block of recent activity below.
 * Everything calls existing backend endpoints; no Move tx fired here.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { AppShell } from '@/components/layout/app-shell'
import { GlassCard, PageHeader, Button, Icon, Eyebrow } from '@/components/ui'
import { getPortfolio, type PortfolioResponse } from '@/lib/api'
import { ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'

export default function TodayPage() {
  const router = useRouter()
  const { isConnected, initiaAddress, username } = useInterwovenKit()

  React.useEffect(() => {
    if (!isConnected) router.replace('/')
  }, [isConnected, router])

  const { data } = useQuery<PortfolioResponse>({
    queryKey: ['portfolio', initiaAddress],
    queryFn: () => getPortfolio(initiaAddress!),
    enabled: Boolean(initiaAddress),
    staleTime: 15_000,
  })

  if (!isConnected || !initiaAddress) {
    return (
      <AppShell>
        <div className="text-ink-3 text-[14px]">Loading…</div>
      </AppShell>
    )
  }

  const greeting = greetingForHour(new Date().getHours())
  const stats = data?.stats

  return (
    <AppShell>
      <PageHeader
        title={
          <>
            {greeting},{' '}
            <span className="text-ink-3">{username ?? 'friend'}</span>.
          </>
        }
        description="Everything that moved today, on one surface."
      />

      {/* Bento — primary signals */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard padding="lg" className="md:col-span-2">
          <Eyebrow>Sent · Received</Eyebrow>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="font-display tnum text-ink leading-none" style={{ fontSize: '40px' }}>
              {stats ? stats.paymentsSent : '—'}
            </div>
            <div className="text-[14px] text-ink-3">
              {stats ? `${stats.paymentsReceived} received` : 'reading…'}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              size="md"
              leadingIcon="send"
              onClick={() => router.push('/send')}
            >
              Send
            </Button>
            <Button
              variant="secondary"
              size="md"
              leadingIcon="chats"
              onClick={() => router.push('/chats')}
            >
              Open chats
            </Button>
          </div>
        </GlassCard>

        <GlassCard padding="lg">
          <Eyebrow>Tips received</Eyebrow>
          <div
            className="mt-3 font-display tnum text-ink leading-none"
            style={{ fontSize: '40px' }}
          >
            {stats ? formatBase(stats.tipsReceivedVolume) : '—'}
          </div>
          <div className="mt-1 text-[12px] text-ink-3">
            {stats ? `${stats.tipsReceived} tips total` : ''}
          </div>
        </GlassCard>
      </div>

      {/* Agent banner — the ONE accent surface on this page */}
      <Link
        href="/ask"
        className="mt-5 block rounded-[2rem] p-7 sm:p-8 bg-gradient-to-br from-[#007AFF]/10 via-white/60 to-[#FF6B9D]/10 border border-white/70 backdrop-blur-md hover:from-[#007AFF]/15 hover:to-[#FF6B9D]/15 transition group"
      >
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] inline-flex items-center justify-center shrink-0">
            <Icon name="sparkle" size={22} weight="fill" className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <Eyebrow>Agent · Claude Desktop</Eyebrow>
            <h3 className="mt-1.5 text-[20px] sm:text-[22px] font-display font-medium text-ink leading-tight tracking-[-0.01em]">
              Let Claude spend under your rules.
            </h3>
            <p className="mt-1.5 text-[13.5px] text-ink-2 max-w-md leading-[1.55]">
              Plug Ori in as an MCP server. One prompt can tip, predict, and pay across your entire wallet — under the daily cap you wrote on-chain.
            </p>
          </div>
          <Icon name="arrow-right" size={18} className="text-ink-3 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
        </div>
      </Link>

      {/* Quick actions */}
      <section className="mt-10">
        <Eyebrow>Quick actions</Eyebrow>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <ActionTile
            href="/predict"
            icon="predict"
            title="Predict"
            sub="60-sec markets"
          />
          <ActionTile
            href="/send"
            icon="send"
            title="Send"
            sub="One-tap pay"
          />
          <ActionTile
            href="/chats"
            icon="chats"
            title="Chats"
            sub="Talk + pay"
          />
          <ActionTile
            href="/ask"
            icon="sparkle"
            title="Ask Claude"
            sub="14 MCP tools"
          />
        </div>
      </section>

      {/* Footer note */}
      <div className="mt-12 text-[12px] text-ink-4 font-mono">
        Connected · <span className="text-ink-3">{shortAddr(initiaAddress)}</span>
      </div>
    </AppShell>
  )
}

function ActionTile({
  href,
  icon,
  title,
  sub,
}: {
  href: string
  icon: React.ComponentProps<typeof Icon>['name']
  title: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="block glass-card p-5 hover:-translate-y-[2px] transition-transform duration-300 will-change-transform"
    >
      <Icon name={icon} size={22} className="text-[#007AFF]" />
      <div className="mt-3 text-[15px] font-display font-medium text-ink tracking-[-0.01em]">
        {title}
      </div>
      <div className="text-[12px] text-ink-3 mt-0.5">{sub}</div>
    </Link>
  )
}

function greetingForHour(h: number): string {
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function shortAddr(a: string | null | undefined): string {
  if (!a) return ''
  return `${a.slice(0, 10)}…${a.slice(-6)}`
}

function formatBase(raw: string): string {
  const n = BigInt(raw || '0')
  const whole = n / 10n ** BigInt(ORI_DECIMALS)
  const frac = n % 10n ** BigInt(ORI_DECIMALS)
  const fracStr = frac
    .toString()
    .padStart(ORI_DECIMALS, '0')
    .replace(/0+$/, '')
    .slice(0, 2)
  return `${whole}${fracStr ? '.' + fracStr : ''} ${ORI_SYMBOL}`
}
