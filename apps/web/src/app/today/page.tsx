'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Bot, TrendingUp, ArrowRight, Radio, Repeat, Sparkles } from 'lucide-react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { AppShell } from '@/components/app-shell'
import { ActivityFeed } from '@/components/activity-feed'
import { WeeklyStatsRow } from '@/components/weekly-stats'
import { PageHeader, Serif } from '@/components/page-header'
import { Eyebrow } from '@/components/ui'
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
      {/* Outer container scales: phone-narrow on mobile, ~672px on tablet,
          full 1024px column on desktop with breathing room either side.
          That kills the giant empty void on wide monitors. */}
      <div className="px-5 pt-8 pb-6 max-w-md md:max-w-2xl lg:max-w-5xl mx-auto w-full">
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

        {/* Two-column layout on desktop: main content (header, agent banner,
            quick actions) on the left ~60%, activity feed sticky on the right
            ~40%. Stacks on mobile/tablet so nothing is below the fold. */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-10">
          <div className="space-y-6 min-w-0">
            {/* Weekly digest */}
            <WeeklyStatsRow address={initiaAddress} />

            {/* Agent banner — quiet card, editorial copy. */}
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

            {/* Quick actions — 2-up grid. Each tile has full breathing room. */}
            <div className="space-y-3">
              <Eyebrow>Jump in</Eyebrow>
              <section className="grid grid-cols-2 gap-3">
                <QuickAction
                  href="/predict"
                  icon={<TrendingUp className="w-[18px] h-[18px]" />}
                  title={<><Serif>Predict</Serif></>}
                  sub="60-sec markets · no counterparty"
                />
                <QuickAction
                  href="/ask"
                  icon={<Bot className="w-[18px] h-[18px]" />}
                  title={<>Ask <Serif>Claude</Serif></>}
                  sub="14 MCP tools · one prompt"
                />
                <QuickAction
                  href="/streams"
                  icon={<Radio className="w-[18px] h-[18px]" />}
                  title={<><Serif>Stream</Serif> money</>}
                  sub="Continuous pay per second"
                />
                <QuickAction
                  href="/subscriptions"
                  icon={<Repeat className="w-[18px] h-[18px]" />}
                  title={<><Serif>Subscribe</Serif></>}
                  sub="Recurring, creator-by-creator"
                />
              </section>
              <Link
                href="/create"
                className="block rounded-2xl border border-primary/30 bg-primary/[0.05] p-4 panel-hover"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary-bright shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-medium">
                      See <Serif>every</Serif> way to move money
                    </div>
                    <div className="text-[12px] text-ink-3 mt-0.5">
                      Hub for paywalls, squads, lucky pools, gifts, and more
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-3" />
                </div>
              </Link>
            </div>
          </div>

          {/* Right rail — activity feed. Sticks just below the header on
              desktop scroll so the user always sees their recent on-chain
              moves while exploring features on the left. */}
          <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <ActivityFeed address={initiaAddress} />
          </aside>
        </div>
      </div>
    </AppShell>
  )
}

function QuickAction({
  href,
  icon,
  title,
  sub,
}: {
  href: string
  icon: React.ReactNode
  title: React.ReactNode
  sub: string
}) {
  return (
    <Link
      href={href}
      className="panel-hover rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-4 flex flex-col gap-2"
    >
      <span className="text-primary-bright">{icon}</span>
      <div className="text-[15px] font-medium tracking-[-0.01em]">{title}</div>
      <div className="text-[11.5px] text-ink-3 leading-[1.45]">{sub}</div>
    </Link>
  )
}
