'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Bot, TrendingUp, ArrowRight } from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { AppShell } from '@/components/app-shell'
import { ActivityFeed } from '@/components/activity-feed'
import { WeeklyStatsRow } from '@/components/weekly-stats'
import { PageHeader, Serif } from '@/components/page-header'
import { useAutoSign } from '@/hooks/use-auto-sign'

export default function TodayPage() {
  const router = useRouter()
  const { isConnected, initiaAddress, username } = useInterwovenKit()
  const { isEnabled: autoSign } = useAutoSign()

  // Redirect unconnected users to landing — Today is the signed-in home.
  useEffect(() => {
    if (!isConnected || !initiaAddress) {
      router.replace('/')
    }
  }, [isConnected, initiaAddress, router])

  if (!isConnected || !initiaAddress) {
    return (
      <AppShell title="Today">
        <div className="px-5 py-10 text-muted-foreground text-sm">Loading…</div>
      </AppShell>
    )
  }

  const mcpSignerAddr = process.env.NEXT_PUBLIC_MCP_SIGNER_ADDRESS ?? null

  return (
    <AppShell title="Today">
      <div className="px-5 pt-8 pb-6 max-w-xl mx-auto w-full space-y-6">
        <PageHeader
          kicker="01 · Today"
          title={
            username ? (
              <>
                Hey, <Serif>{username}</Serif>.
              </>
            ) : (
              <>
                Welcome <Serif>back</Serif>.
              </>
            )
          }
          sub={
            autoSign
              ? 'Auto-sign is on. Claude can transact without popups.'
              : 'Auto-sign is off. Turn it on in the header to let Claude transact silently.'
          }
        />

        {/* Weekly digest */}
        <WeeklyStatsRow address={initiaAddress} />

        {/* Agent banner */}
        <section className="panel-hover rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Your agent</div>
              <div className="text-xs text-muted-foreground truncate">
                {mcpSignerAddr
                  ? `Signs as ${mcpSignerAddr.slice(0, 14)}…${mcpSignerAddr.slice(-6)}`
                  : 'Not configured yet'}
              </div>
            </div>
            <Link
              href="/ask"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
            >
              Setup <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/predict"
            className="panel-hover rounded-2xl border border-border bg-white/[0.02] p-4 flex flex-col gap-1"
          >
            <TrendingUp className="w-5 h-5 text-primary" />
            <div className="font-semibold text-sm">Predict</div>
            <div className="text-xs text-muted-foreground">
              60-sec markets, no liquidation
            </div>
          </Link>
          <Link
            href="/ask"
            className="panel-hover rounded-2xl border border-border bg-white/[0.02] p-4 flex flex-col gap-1"
          >
            <Bot className="w-5 h-5 text-primary" />
            <div className="font-semibold text-sm">Ask Claude</div>
            <div className="text-xs text-muted-foreground">
              11 MCP tools · 1 prompt
            </div>
          </Link>
        </section>

        {/* Activity feed (reverse-chron) */}
        <ActivityFeed address={initiaAddress} />
      </div>
    </AppShell>
  )
}
