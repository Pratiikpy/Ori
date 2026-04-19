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

        {/* Agent banner — quiet card, editorial copy. The indigo accent is
            reserved for the icon tile only; the surface stays neutral so the
            banner doesn't compete with actual data below. */}
        <section className="panel-hover rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.05] p-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
                Agent · signer
              </div>
              <div className="mt-0.5 text-[13px] text-foreground truncate">
                {mcpSignerAddr ? (
                  <>
                    Signs as <span className="font-mono text-ink-2">{mcpSignerAddr.slice(0, 14)}…{mcpSignerAddr.slice(-6)}</span>
                  </>
                ) : (
                  <>Not configured <Serif>yet</Serif>.</>
                )}
              </div>
            </div>
            <Link
              href="/ask"
              className="inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[12px] font-medium text-ink-2 border border-[var(--color-border-strong)] hover:text-foreground hover:bg-white/[0.04] hover:border-[var(--color-border-emphasis)] transition shrink-0"
            >
              Setup <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </section>

        {/* Quick actions — mono kickers + italic serif accent on the number. */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/predict"
            className="panel-hover rounded-2xl border border-border bg-white/[0.022] p-4 flex flex-col gap-2"
          >
            <TrendingUp className="w-[18px] h-[18px] text-[var(--color-primary-bright)]" />
            <div className="text-[15px] font-medium tracking-[-0.01em]">
              <Serif>Predict</Serif>
            </div>
            <div className="text-[11.5px] text-ink-3 leading-[1.45]">
              60-sec markets · no counterparty
            </div>
          </Link>
          <Link
            href="/ask"
            className="panel-hover rounded-2xl border border-border bg-white/[0.022] p-4 flex flex-col gap-2"
          >
            <Bot className="w-[18px] h-[18px] text-[var(--color-primary-bright)]" />
            <div className="text-[15px] font-medium tracking-[-0.01em]">
              Ask <Serif>Claude</Serif>
            </div>
            <div className="text-[11.5px] text-ink-3 leading-[1.45]">
              14 MCP tools · one prompt
            </div>
          </Link>
        </section>

        {/* Activity feed (reverse-chron) */}
        <ActivityFeed address={initiaAddress} />
      </div>
    </AppShell>
  )
}
