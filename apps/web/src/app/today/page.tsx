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

  useEffect(() => {
    if (!isConnected || !initiaAddress) {
      router.replace('/')
    }
  }, [isConnected, initiaAddress, router])

  if (!isConnected || !initiaAddress) {
    return (
      <AppShell title="Today">
        <div className="text-ink-3 text-sm">Loading…</div>
      </AppShell>
    )
  }

  const mcpSignerAddr = process.env.NEXT_PUBLIC_MCP_SIGNER_ADDRESS ?? null

  return (
    <AppShell title="Today">
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

      {/* The grid that actually defines the page: 1 column on mobile,
          3 columns on desktop. Main column spans 2, sidebar spans 1.
          Sidebar is `lg:sticky lg:top-6` so it floats with the user as
          they scroll the dense main column. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Weekly digest — neutral, dense, sits as a stat strip */}
          <section>
            <Eyebrow>This week</Eyebrow>
            <div className="mt-3">
              <WeeklyStatsRow address={initiaAddress} />
            </div>
          </section>

          {/* The ONE accent card on the page — agent setup. Everything
              else is muted neutral so this CTA actually stands out. */}
          <Link
            href="/ask"
            className="group block rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 px-4 py-3.5 hover:from-violet-500/15 hover:to-fuchsia-500/10 transition"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-violet-500/20 inline-flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-violet-300/80">
                  Agent · signer {mcpSignerAddr ? '· configured' : '· not configured'}
                </div>
                <div className="mt-0.5 text-[13.5px] text-foreground">
                  {mcpSignerAddr
                    ? `Signs as ${mcpSignerAddr.slice(0, 12)}…${mcpSignerAddr.slice(-6)}`
                    : 'Set up Claude to spend under your daily cap'}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-3 group-hover:text-violet-300 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Quick actions — dense 2x2. Small icons, p-4, single-line title. */}
          <section className="space-y-2.5">
            <Eyebrow>Jump in</Eyebrow>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickTile
                href="/predict"
                icon={<TrendingUp className="h-4 w-4" />}
                title={
                  <>
                    <Serif>Predict</Serif>
                  </>
                }
                sub="60s markets"
              />
              <QuickTile
                href="/streams"
                icon={<Radio className="h-4 w-4" />}
                title={
                  <>
                    <Serif>Stream</Serif> money
                  </>
                }
                sub="Per-second pay"
              />
              <QuickTile
                href="/subscriptions"
                icon={<Repeat className="h-4 w-4" />}
                title={
                  <>
                    <Serif>Subscribe</Serif>
                  </>
                }
                sub="Recurring plans"
              />
              <QuickTile
                href="/send"
                icon={<ArrowRight className="h-4 w-4" />}
                title={
                  <>
                    <Serif>Send</Serif>
                  </>
                }
                sub="One-tap pay"
              />
            </div>
          </section>

          {/* Slim discovery row — one line, tertiary look. It's a link, not a feature. */}
          <Link
            href="/create"
            className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 hover:border-zinc-700 hover:bg-zinc-900/60 transition"
          >
            <Sparkles className="h-4 w-4 text-ink-3 shrink-0" />
            <span className="flex-1 text-[13px] text-ink-2">
              See every way to move money — paywalls, squads, lucky pools, gifts
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-4 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        {/* Sidebar — activity feed. Sticky on desktop, collapses below
            main on mobile. */}
        <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start min-w-0">
          <Eyebrow>Activity</Eyebrow>
          <div className="mt-3">
            <ActivityFeed address={initiaAddress} />
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

function QuickTile({
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
      className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition flex flex-col gap-1"
    >
      <span className="text-ink-3 group-hover:text-foreground transition">
        {icon}
      </span>
      <div className="text-[14px] font-medium tracking-[-0.01em] text-foreground mt-1">
        {title}
      </div>
      <div className="text-[11px] text-ink-3">{sub}</div>
    </Link>
  )
}
