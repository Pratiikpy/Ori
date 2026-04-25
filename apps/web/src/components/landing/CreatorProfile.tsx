// CreatorProfile — Linktree-style page for mira.init. Cover band, xl avatar,
// verified badge, stats row, tip-bar (chips + Send tip CTA), 4 lt-link rows,
// profile-tabs, 5-row activity feed.
// Ports Ori-landing.html lines 1496-1607 (#profile, .linktree variant).

import type { ReactNode } from 'react'
import {
  Reveal,
  SectionHead,
  Serif,
  VerifiedBadge,
  Chip,
} from '@/components/ui'

export function CreatorProfile() {
  return (
    <section id="profile" className="shell pt-16 pb-24">
      <Reveal>
        <SectionHead
          eyebrow="03 · Creators"
          title={
            <>
              A profile, a tip jar, <Serif>and a stage</Serif>.
            </>
          }
          sub={
            <>
              Every <span className="font-mono">.init</span> name has a public home
              at ori.chat/name — no setup, no theme picker, no shop to configure.
            </>
          }
        />
      </Reveal>

      <Reveal className="mt-14 max-w-[560px] mx-auto rounded-2xl border border-border bg-white/[0.022] overflow-hidden">
        <ProfileCover />
        <div className="px-7 pt-[60px] pb-7 text-center">
          <ProfileHead />
          <p className="mt-5 mx-auto max-w-[440px] text-[14px] leading-[1.6] text-ink-2">
            Short films, travel cuts, and the occasional slow-motion rain. Tips go
            straight to better gear and coffee for the team.
          </p>

          <ProfileStats />
          <TipBar />
          <LinkRows />
          <ProfileTabs />
          <ActivityFeed />
        </div>
      </Reveal>
    </section>
  )
}

/**
 * ProfileCover — 140px indigo→transparent gradient band. Two layered radial
 * ellipses on top of var(--color-bg-2). Source: ASSETS.md §4.
 */
function ProfileCover() {
  return (
    <div
      className="h-[140px] border-b border-border"
      style={{
        background:
          'radial-gradient(ellipse 600px 200px at 30% 100%, rgba(108,123,255,0.35), transparent 60%), radial-gradient(ellipse 400px 300px at 80% 0%, rgba(154,165,255,0.2), transparent 60%), var(--color-bg-2)',
      }}
    />
  )
}

/**
 * ProfileHead — 104px hero avatar pulled up over the cover, serif name +
 * VerifiedBadge, role line, mono handle.
 */
function ProfileHead() {
  return (
    <div className="flex flex-col items-center gap-4 -mt-[112px]">
      <span
        aria-label="Mira"
        className="h-[104px] w-[104px] rounded-full inline-flex items-center justify-center text-[40px] font-medium text-white/95 ring-[3px] ring-[var(--color-background)]"
        style={{
          background: 'linear-gradient(135deg, #ff9ec7, #ff6b9d)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        M
      </span>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-[28px] leading-none">
          <Serif>mira</Serif>
          <VerifiedBadge size={22} />
        </div>
        <div className="text-[13px] text-ink-2">videographer · lisbon</div>
        <div className="font-mono text-[12px] text-ink-3">
          mira.init · 0xc29d…8a4f
        </div>
      </div>
    </div>
  )
}

/**
 * ProfileStats — hairline-bordered 3-up row of mono numbers + uppercase
 * mono labels. Vertical 1px dividers between cells.
 */
function ProfileStats() {
  return (
    <dl className="mt-6 flex justify-center gap-8 py-4 border-y border-border">
      <StatCell value="$4,280" label="TIPPED" />
      <span aria-hidden className="w-px bg-[var(--color-border)]" />
      <StatCell value="128" label="SUBSCRIBERS" />
      <span aria-hidden className="w-px bg-[var(--color-border)]" />
      <StatCell value="2.1k" label="FOLLOWERS" />
    </dl>
  )
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="font-mono tabular-nums text-[20px] font-semibold text-foreground">
        {value}
      </dd>
      <dt className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
        {label}
      </dt>
    </div>
  )
}

/**
 * TipBar — TIP MIRA label, 5 amount chips ($1, $5 accent, $10, $25, custom),
 * full-width Send tip CTA.
 */
function TipBar() {
  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <div className="w-full">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3 mb-3">
          TIP MIRA
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Chip>$1</Chip>
          <Chip selected>$5</Chip>
          <Chip>$10</Chip>
          <Chip>$25</Chip>
          <Chip>custom</Chip>
        </div>
      </div>
      <button
        type="button"
        className="w-full max-w-[320px] rounded-full h-11 bg-foreground text-[var(--color-background)] text-[13.5px] font-medium hover:-translate-y-px transition will-change-transform"
      >
        Send tip →
      </button>
    </div>
  )
}

/**
 * LinkRows — 4 lt-link rows, emoji + label, full-width hairline-bordered.
 */
function LinkRows() {
  return (
    <div className="mt-7 flex flex-col gap-2.5 text-left">
      <LtLink>🎬  Latest film · &ldquo;Lisbon at 4am&rdquo;</LtLink>
      <LtLink>📸  Instagram · @mira.films</LtLink>
      <LtLink>🔓  Unlock · behind-the-cut ($3)</LtLink>
      <LtLink>☕  Subscribe · monthly ($9)</LtLink>
    </div>
  )
}

function LtLink({ children }: { children: ReactNode }) {
  // Demo Linktree row — these aren't real destinations, so render as
  // <button type="button"> for keyboard reachability + click affordance
  // without producing a "broken link" via <a> with no href.
  return (
    <button
      type="button"
      className="block w-full text-center px-4.5 py-3.5 border border-border rounded-xl bg-white/[0.022] text-foreground text-[14px] hover:border-ink-3 hover:bg-white/[0.04] hover:-translate-y-px transition will-change-transform cursor-pointer"
      style={{ padding: '14px 18px' }}
    >
      {children}
    </button>
  )
}

/**
 * ProfileTabs — Recent activity / Paywalls / Subscribers · 128.
 * Active tab gets a foreground underline.
 */
function ProfileTabs() {
  return (
    <div className="mt-8 flex justify-center gap-5 border-b border-border">
      <TabItem active>Recent activity</TabItem>
      <TabItem>Paywalls</TabItem>
      <TabItem>Subscribers · 128</TabItem>
    </div>
  )
}

function TabItem({
  children,
  active,
}: {
  children: ReactNode
  active?: boolean
}) {
  // Tabs are interactive UI — must be <button>, not <span>, so they're
  // keyboard-reachable and screen readers announce them as buttons.
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={
        'pb-3 pt-2.5 text-[13px] cursor-pointer border-b-[1.5px] transition-colors bg-transparent ' +
        (active
          ? 'text-foreground border-foreground'
          : 'text-ink-3 border-transparent hover:text-foreground')
      }
    >
      {children}
    </button>
  )
}

/**
 * ActivityFeed — 5-row feed, avatar · txt · amt · time. Italic serif on
 * alex's quote per CONTENT.md line 426.
 */
function ActivityFeed() {
  return (
    <ul className="mt-4 text-left">
      <FeedItem
        avatar="A"
        gradient="linear-gradient(135deg,#78cfc1,#3aa693)"
        amt="$5"
        time="2m"
      >
        <strong className="text-foreground font-medium">alex.init</strong> tipped —{' '}
        <Serif>&ldquo;the golden hour one was perfect&rdquo;</Serif>
      </FeedItem>
      <FeedItem
        avatar="S"
        gradient="linear-gradient(135deg,#a89bff,#7b6bff)"
        amt="$3"
        time="11m"
      >
        <strong className="text-foreground font-medium">sam.init</strong> unlocked{' '}
        <span className="font-mono text-ink-3">film/behind-the-cut</span>
      </FeedItem>
      <FeedItem
        avatar="J"
        gradient="linear-gradient(135deg,#ffb561,#ff8f3a)"
        amt="$9"
        time="34m"
      >
        <strong className="text-foreground font-medium">jamie.init</strong>{' '}
        subscribed — monthly
      </FeedItem>
      <FeedItem
        avatar="L"
        gradient="linear-gradient(135deg,#8adfff,#4ab0e0)"
        amt="$20"
        time="1h"
      >
        <strong className="text-foreground font-medium">lina.init</strong> tipped
      </FeedItem>
      <FeedItem
        avatar="·"
        gradient="linear-gradient(135deg,#9ee8c5,#4dc493)"
        amt="$1"
        time="2h"
      >
        <strong className="text-foreground font-medium">agent.claude</strong> paid
        paywall —{' '}
        <span className="font-mono text-ink-3">research/slow-rain</span>
      </FeedItem>
    </ul>
  )
}

function FeedItem({
  avatar,
  gradient,
  amt,
  time,
  children,
}: {
  avatar: string
  gradient: string
  amt: string
  time: string
  children: ReactNode
}) {
  return (
    <li className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <span
        className="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-medium text-black shrink-0"
        style={{ background: gradient }}
      >
        {avatar}
      </span>
      <span className="flex-1 text-[13px] text-ink-2 leading-snug">
        {children}
      </span>
      <span className="font-mono tabular-nums text-[13px] text-foreground shrink-0">
        {amt}
      </span>
      <span className="font-mono text-[10.5px] text-ink-4 shrink-0">{time}</span>
    </li>
  )
}
