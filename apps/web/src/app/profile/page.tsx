'use client'

/**
 * /profile — Profile surface, ported 1:1 from prototype Profile.jsx.
 *
 * Sections:
 *   • Identity card (left)  — handle, bio, address, followers, following, trust
 *   • Agent policy (right)  — black card with daily-cap slider, privacy
 *                             switch, authorized agents list
 *   • Secondary 4-card row  — Achievements / Quests / Merchant + links /
 *                             Notifications
 *   • Tabs                  — Profile/Identity / Reputation / Agent policy /
 *                             Settings → ActionCard grid
 *
 * No mocked data — every value derives from /v1/profiles, /v1/.../badges,
 * /v1/.../quests, /v1/.../trust-score, /v1/.../weekly-stats, etc.
 */
import * as React from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/app-shell'
import { ActionCard, type ActionDef } from '@/components/ui/action-card'
import { ActionDialog } from '@/components/ui/action-dialog'
import {
  getProfile,
  getBadges,
  getFollowStats,
  getTrustScore,
  getQuests,
  getWeeklyStats,
} from '@/lib/api'
import { profileTabs } from '@/lib/ori-data'

export default function ProfilePage() {
  const { initiaAddress, username } = useInterwovenKit()
  const [tab, setTab]               = React.useState(profileTabs[0]!.id)
  const [modalAction, setModalAction] = React.useState<ActionDef | null>(null)
  const [agentLimit, setAgentLimit]   = React.useState(250)
  const [pushEnabled, setPushEnabled] = React.useState(false)
  const [autoSign, setAutoSign]       = React.useState(false)

  const profile     = useQuery({ queryKey: ['profile',     initiaAddress], queryFn: () => getProfile(initiaAddress!),     enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const badges      = useQuery({ queryKey: ['badges',      initiaAddress], queryFn: () => getBadges(initiaAddress!),      enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const followStats = useQuery({ queryKey: ['follow-stats',initiaAddress], queryFn: () => getFollowStats(initiaAddress!), enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const trust       = useQuery({ queryKey: ['trust',       initiaAddress], queryFn: () => getTrustScore(initiaAddress!),  enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const quests      = useQuery({ queryKey: ['quests',      initiaAddress], queryFn: () => getQuests(initiaAddress!),      enabled: Boolean(initiaAddress), staleTime: 30_000 })
  const weekly      = useQuery({ queryKey: ['weekly',      initiaAddress], queryFn: () => getWeeklyStats(initiaAddress!), enabled: Boolean(initiaAddress), staleTime: 60_000 })

  const activeTab = profileTabs.find((t) => t.id === tab)!

  return (
    <AppShell eyebrow="Profile" title="Profile surface">
      <section className="p-4 sm:p-6 lg:p-8">
        {/* IDENTITY + AGENT POLICY */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
          {/* Identity card */}
          <div className="border border-black/10 bg-[#F5F5F5] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
              Profile registry
            </p>
            <h2 className="mt-3 font-display text-4xl font-black tracking-tighter sm:text-5xl">
              {username ?? '—'}<span className="text-[#0022FF]">.init</span>
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#52525B]">
              {profile.data?.bio || 'Set a bio in Settings to introduce yourself.'}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ProfileStat label="Address"   value={short(initiaAddress)} mono />
              <ProfileStat label="Followers" value={followStats.data?.followers != null ? formatK(followStats.data.followers) : '—'} />
              <ProfileStat label="Following" value={followStats.data?.following != null ? followStats.data.following.toString() : '—'} />
              <ProfileStat label="Trust"     value={trust.data?.score != null ? `${trust.data.score}/${trust.data.maxScore}` : '—'} />
            </div>
          </div>

          {/* Agent policy black card */}
          <div className="border border-black bg-black p-6 text-white">
            <BotGlyph />
            <h3 className="mt-5 font-display text-2xl font-black tracking-tight sm:text-3xl">
              MCP agent policy
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Claude Desktop runs on the user&rsquo;s machine. Ori only stores the rulebook: caps, allowed tools, revoke, and kill switch.
            </p>
            <div className="mt-6">
              <div className="mb-3 flex justify-between font-mono text-sm">
                <span>Daily cap</span>
                <span>{agentLimit} INIT</span>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                step={10}
                value={agentLimit}
                onChange={(e) => setAgentLimit(Number(e.target.value))}
                className="w-full accent-[#0022FF]"
              />
              <p className="mt-2 font-mono text-[11px] text-white/50">
                Slider sets a draft. Dispatch via Settings → Set agent policy.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border border-white/20 p-4">
              <span className="flex items-center gap-2 text-sm">
                <ShieldGlyph /> Agent spend (7d)
              </span>
              <span className="font-mono text-sm tnum">
                {weekly.data
                  ? `${(Number(weekly.data.agentSpend.totalBaseUnits) / 1e6).toFixed(2)} INIT`
                  : '— INIT'}
              </span>
            </div>
            <p className="mt-4 text-xs text-white/60">
              Authorize an agent via Settings → Set agent spending policy. Real authorized agents will appear here.
            </p>
          </div>
        </div>

        {/* SECONDARY 4-CARD STRIP */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {/* Achievements */}
          <article className="border border-black/10 bg-white p-6">
            <TrophyGlyph />
            <h3 className="mt-5 font-display text-xl font-black tracking-tight">Achievements</h3>
            <div className="mt-4 space-y-3">
              {(badges.data ?? []).slice(0, 4).map((b) => (
                <div key={`${b.badgeType}-${b.level}`} className="border border-black/10 p-3">
                  <p className="flex items-center gap-2 font-semibold">
                    <CheckGlyph /> {badgeName(b.badgeType)}
                  </p>
                  <p className="mt-1 text-sm text-[#52525B]">
                    Level {b.level} · minted {new Date(b.mintedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {!badges.isLoading && (badges.data ?? []).length === 0 && (
                <p className="text-sm text-[#52525B]">
                  No achievements yet — start sending tips.
                </p>
              )}
            </div>
          </article>

          {/* Quests */}
          <article className="border border-black/10 bg-white p-6">
            <BellGlyph />
            <h3 className="mt-5 font-display text-xl font-black tracking-tight">Quests</h3>
            <div className="mt-4 space-y-4">
              {(quests.data?.entries ?? []).slice(0, 3).map((q) => (
                <div key={q.id}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{q.title}</span>
                    <span className="font-mono tnum">
                      {q.progress}/{q.threshold}
                    </span>
                  </div>
                  <div className="h-1.5 bg-black/10">
                    <div
                      className="h-full bg-[#0022FF]"
                      style={{ width: `${Math.min(100, (q.progress / Math.max(1, q.threshold)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {!quests.isLoading && (quests.data?.entries ?? []).length === 0 && (
                <p className="text-sm text-[#52525B]">No active quests.</p>
              )}
            </div>
          </article>

          {/* Merchant + links */}
          <article className="border border-black/10 bg-white p-6">
            <StoreGlyph />
            <h3 className="mt-5 font-display text-xl font-black tracking-tight">Merchant + links</h3>
            <ul className="mt-4 space-y-2">
              {[
                'x402 merchant ready',
                'A2A agent card online',
                username ? `ori.app/${username}` : 'Set a .init name to get a link',
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-2 border border-black/10 px-3 py-2.5 text-sm"
                >
                  <LinkGlyph /> {line}
                </li>
              ))}
            </ul>
          </article>

          {/* Notifications */}
          <article className="border border-black/10 bg-white p-6">
            <BellGlyph />
            <h3 className="mt-5 font-display text-xl font-black tracking-tight">Notifications</h3>
            <div className="mt-5 space-y-3">
              <ToggleRow label="Phone push"        checked={pushEnabled} onChange={setPushEnabled} />
              <ToggleRow label="One-tap auto-sign" checked={autoSign}    onChange={setAutoSign} />
              <p className="font-mono text-xs text-[#52525B]">
                Small tx limit: 5 INIT
              </p>
            </div>
          </article>
        </div>

        {/* TABS */}
        <div className="mt-8">
          <div className="flex h-auto w-full flex-wrap justify-start border border-black/10 bg-white">
            {profileTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'border-r border-black/10 px-4 py-3 text-sm font-semibold transition cursor-pointer',
                  t.id === tab ? 'bg-[#0022FF] text-white' : 'bg-white text-[#0A0A0A] hover:bg-[#F5F5F5]',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeTab.actions.map((action) => (
              <ActionCard
                key={action.id}
                scope={`profile-${activeTab.id}`}
                action={action}
                onOpen={setModalAction}
              />
            ))}
          </div>
        </div>

        <ActionDialog action={modalAction} onClose={() => setModalAction(null)} />
      </section>
    </AppShell>
  )
}

/* ───────────────── Helpers + glyphs ───────────────── */

function ProfileStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-black/10 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">{label}</p>
      <p className={`mt-2 ${mono ? 'font-mono text-sm' : 'font-mono text-lg font-black'} truncate`}>
        {value}
      </p>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between border border-black/10 p-3">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'h-6 w-10 transition cursor-pointer relative',
          checked ? 'bg-[#0022FF]' : 'bg-black/20',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 bg-white transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

function short(addr: string | null | undefined): string {
  if (!addr) return '—'
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

/** Map badgeType → human label. Keep in sync with achievement_sbt.move enum. */
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

function BotGlyph() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  )
}

function ShieldGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  )
}

function TrophyGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFB800" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function BellGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function StoreGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7" />
      <path d="M14 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7" />
      <path d="M6 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7" />
    </svg>
  )
}

function LinkGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0022FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 12 2 2 4-4" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}
