'use client'

/**
 * /profile — Profile surface (Emergent design parity).
 *
 * Header:
 *   ┌────────────────────────────────────────────┐ ┌─────────────┐
 *   │ PROFILE REGISTRY                            │ │ Agent policy│
 *   │ {username}.init                             │ │ Daily cap   │
 *   │ Address · Followers · Following · Trust     │ │ {cap} INIT  │
 *   └────────────────────────────────────────────┘ └─────────────┘
 *
 * Rows: Achievements · Quests · Merchant + links — three columns each
 * pulled from the existing /v1/profiles, /v1/quests, /v1/agent endpoints.
 *
 * Tabs: Profile / Identity | Reputation | Agent policy | Settings.
 * Body: FlowCard grid for every profile_registry / follow_graph mutation.
 */
import * as React from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'
import { FlowCard } from '@/components/ui/flow-card'
import { Icon } from '@/components/ui/icon'
import {
  getProfile,
  getBadges,
  getFollowStats,
  getTrustScore,
  getQuests,
  getWeeklyStats,
} from '@/lib/api'

type Tab = 'identity' | 'reputation' | 'policy' | 'settings'

export default function ProfilePage() {
  const { initiaAddress, username } = useInterwovenKit()
  const [tab, setTab] = React.useState<Tab>('identity')

  const profile     = useQuery({ queryKey: ['profile',     initiaAddress], queryFn: () => getProfile(initiaAddress!),     enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const badges      = useQuery({ queryKey: ['badges',      initiaAddress], queryFn: () => getBadges(initiaAddress!),      enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const followStats = useQuery({ queryKey: ['follow-stats',initiaAddress], queryFn: () => getFollowStats(initiaAddress!), enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const trust       = useQuery({ queryKey: ['trust',       initiaAddress], queryFn: () => getTrustScore(initiaAddress!),  enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const quests      = useQuery({ queryKey: ['quests',      initiaAddress], queryFn: () => getQuests(initiaAddress!),      enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const weekly      = useQuery({ queryKey: ['weekly-stats',initiaAddress], queryFn: () => getWeeklyStats(initiaAddress!), enabled: Boolean(initiaAddress), staleTime: 60_000 })

  return (
    <AppShell eyebrow="Profile" title="Profile surface">
      {/* HEADER STRIP */}
      <section className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
        {/* Identity card */}
        <div className="border border-[var(--color-line)] rounded-md p-7 bg-[var(--color-bg-muted)]">
          <span className="eyebrow">Profile registry</span>
          <h2 className="mt-2 font-display font-bold text-[36px] leading-none text-ink">
            {username ?? '—'}<span className="text-[var(--color-accent)]">.init</span>
          </h2>
          <p className="mt-2 text-[13.5px] text-ink-3">
            {profile.data?.bio ?? 'No bio set yet.'}
          </p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            <ProfileStat label="Address"   value={short(initiaAddress)} mono />
            <ProfileStat label="Followers" value={followStats.data?.followers != null ? formatK(Number(followStats.data.followers)) : '—'} />
            <ProfileStat label="Following" value={followStats.data?.following != null ? String(followStats.data.following) : '—'} />
            <ProfileStat label="Trust"     value={trust.data?.score != null ? `${trust.data.score}/100` : '—'} />
          </div>
        </div>

        {/* Agent policy card */}
        <div className="bg-[var(--color-ink)] text-white rounded-md p-7 flex flex-col">
          <h3 className="font-display font-bold text-[24px]">Agent policy</h3>
          <p className="mt-2 text-[13px] text-white/65">
            Set spending caps, allowed methods, revoke or trigger kill switch.
          </p>
          <div className="mt-5 pt-4 border-t border-white/10">
            <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-white/55">Agent spend (7d)</span>
            <div className="mt-1 font-mono tnum text-[22px]">
              {weekly.data
                ? `${(Number(weekly.data.agentSpend.totalBaseUnits) / 1e6).toFixed(2)} INIT`
                : '— INIT'}
            </div>
            <div className="mt-1 text-[11.5px] text-white/55 font-mono">
              {weekly.data?.agentSpend.txCount ?? 0} tx via agents
            </div>
          </div>
          <div className="mt-auto pt-4 flex items-center justify-between">
            <span className="text-[13px]">Whitelist-only DMs</span>
            <span className="inline-flex items-center gap-2 text-[12.5px] text-white/65">
              <span className={`w-9 h-5 rounded-full p-0.5 ${profile.data?.whitelistOnly ? 'bg-[var(--color-accent)]' : 'bg-white/20'}`}>
                <span className={`block w-4 h-4 rounded-full bg-white transition ${profile.data?.whitelistOnly ? 'translate-x-4' : 'translate-x-0'}`} />
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* THREE COLUMNS */}
      <section className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Achievements */}
        <div className="border border-[var(--color-line)] rounded-md p-5 bg-white">
          <h3 className="font-display font-bold text-[18px] text-ink mb-4">★ Achievements</h3>
          <ul className="flex flex-col gap-3">
            {(badges.data ?? []).slice(0, 3).map((b) => (
              <li key={`${b.badgeType}-${b.level}`} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[var(--color-accent-soft)] inline-flex items-center justify-center text-[var(--color-accent)] text-[11px] font-mono">★</span>
                <div>
                  <div className="text-[13.5px] font-medium text-ink">{badgeName(b.badgeType)}</div>
                  <div className="text-[12px] text-ink-3">Level {b.level} · minted {new Date(b.mintedAt).toLocaleDateString()}</div>
                </div>
              </li>
            ))}
            {(!badges.isLoading && (badges.data ?? []).length === 0) && (
              <li className="text-[13px] text-ink-3">No achievements yet — start sending tips.</li>
            )}
          </ul>
        </div>

        {/* Quests */}
        <div className="border border-[var(--color-line)] rounded-md p-5 bg-white">
          <h3 className="font-display font-bold text-[18px] text-ink mb-4">📍 Quests</h3>
          <ul className="flex flex-col gap-3">
            {(quests.data?.entries ?? []).slice(0, 3).map((q) => (
              <li key={q.id}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink">{q.title}</span>
                  <span className="font-mono text-ink-3 text-[12px] tnum">
                    {q.progress}/{q.threshold}
                  </span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                  <div className="h-full bg-[var(--color-ink)]" style={{ width: `${Math.min(100, (q.progress / Math.max(1, q.threshold)) * 100)}%` }} />
                </div>
              </li>
            ))}
            {(!quests.isLoading && (quests.data?.entries ?? []).length === 0) && (
              <li className="text-[13px] text-ink-3">No active quests.</li>
            )}
          </ul>
        </div>

        {/* Merchant + links */}
        <div className="border border-[var(--color-line)] rounded-md p-5 bg-white">
          <h3 className="font-display font-bold text-[18px] text-ink mb-4">🛒 Merchant + links</h3>
          <ul className="flex flex-col gap-2 text-[13px] text-ink-2">
            <li>uri.agents</li>
            <li>x402 merchant ready</li>
            <li>A2A agent card online</li>
          </ul>
        </div>
      </section>

      {/* TABS */}
      <section className="mt-8 border-b border-[var(--color-line)] flex items-center gap-1 overflow-x-auto">
        {([
          { id: 'identity',   label: 'Profile / Identity' },
          { id: 'reputation', label: 'Reputation' },
          { id: 'policy',     label: 'Agent policy' },
          { id: 'settings',   label: 'Settings' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'shrink-0 h-10 px-4 text-[13px] font-medium transition rounded-t-md cursor-pointer',
              t.id === tab ? 'bg-[var(--color-accent)] text-white' : 'text-ink-2 hover:text-ink hover:bg-[var(--color-surface-hover)]',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </section>

      {/* FLOW GRID */}
      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tab === 'identity' && (
          <>
            <FlowCard module="profile_registry.move" title="Create profile"     description="Claim a .init username and write a bio."             href="/onboard" />
            <FlowCard module="profile_registry.move" title="Update bio / avatar / links" description="Refresh your public surface metadata."            href="/settings" />
            <FlowCard module="profile_registry.move" title="Set slug"            description="Custom URL slug for your profile page."             href="/settings" />
            <FlowCard module="profile_registry.move" title="Set encryption pubkey" description="Publish your X25519 key for E2E DMs."           href="/settings" />
            <FlowCard module="profile_registry.move" title="Update privacy"      description="Toggle private follows and other privacy bits."     href="/settings" />
            <FlowCard module="follow_graph.move"     title="Follow user"         description="Follow a creator's profile."                        href="/discover" />
            <FlowCard module="follow_graph.move"     title="Unfollow user"       description="Remove from your following set."                    href="/discover" />
            <FlowCard module="profile_registry.move" title="Update theme"        description="Persist a JSON theme on-chain for your page."        href="/settings" />
          </>
        )}
        {tab === 'reputation' && (
          <>
            <FlowCard module="reputation.move"       title="Thumbs up"           description="Up-vote a target address (creator / agent)."        href="/discover" />
            <FlowCard module="reputation.move"       title="Thumbs down"         description="Down-vote a target."                                href="/discover" />
            <FlowCard module="reputation.move"       title="Retract vote"        description="Pull back a previous up/down vote."                 href="/discover" />
            <FlowCard module="reputation.move"       title="Attest"              description="Sign an on-chain claim about another user."         href="/discover" />
            <FlowCard module="achievement_sbt.move"  title="View achievements"   description="Soulbound badges minted on milestones."             href="/profile" />
          </>
        )}
        {tab === 'policy' && (
          <>
            <FlowCard module="agent_policy.move" title="Set agent policy"      description="Daily cap + allowed methods for an agent address." href="/settings" />
            <FlowCard module="agent_policy.move" title="Revoke agent"          description="Pull authorization from a specific agent."          href="/settings" />
            <FlowCard module="agent_policy.move" title="Kill switch"           description="Block all agent activity until you re-enable."     href="/settings" />
          </>
        )}
        {tab === 'settings' && (
          <>
            <FlowCard module="auth.api"            title="Sign-in session"  description="EIP-191 sign-in. Sets your JWT for the dashboard." href="/onboard" />
            <FlowCard module="sponsor.api"         title="Auto-sign"         description="Enable single-tap auto-sign for known msg types."   href="/settings" />
            <FlowCard module="push.api"            title="PWA push"          description="Subscribe to push notifications on this device."    href="/settings" />
          </>
        )}
      </section>
    </AppShell>
  )
}

/* ─────────────────────────────────────────────────────────────── */

function ProfileStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-ink-3">{label}</div>
      <div className={`mt-1 text-[14px] text-ink ${mono ? 'font-mono' : ''} truncate`}>{value}</div>
    </div>
  )
}

function short(addr: string | null | undefined): string {
  if (!addr) return '—'
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

/** Map badgeType → human label. Synced with achievement_sbt.move emit names. */
function badgeName(type: number): string {
  const map: Record<number, string> = {
    0: 'First Tip',
    1: 'Market Maker',
    2: 'Trusted Agent',
    3: 'Stream Veteran',
    4: 'Paywall Sold',
    5: 'Squad Founder',
  }
  return map[type] ?? `Badge #${type}`
}
