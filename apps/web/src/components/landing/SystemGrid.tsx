// SystemGrid — DSGrid 4-card composition: Type / Color / Radii / Motion.
// Plus MoveModuleGrid sub-component listing 18 deployed Move modules,
// used only by /system page (per DECISIONS.md D1).
// Ports Ori-landing.html lines 1638-1689 (#system).

import { Reveal, SectionHead, Serif } from '@/components/ui'

export function SystemGrid() {
  return (
    <section id="system" className="shell pt-16 pb-24">
      <Reveal>
        <SectionHead
          eyebrow="05 · System"
          title={
            <>
              The pieces that <Serif>make</Serif> the whole.
            </>
          }
          sub="Four primitives: type, color, radii, motion. Each one does one job, and does it the same way everywhere in the product."
        />
      </Reveal>

      <Reveal className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TypeCard />
        <ColorCard />
        <RadiiCard />
        <MotionCard />
      </Reveal>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   DS-Card primitive — padded surface card with a mono uppercase label.
   ────────────────────────────────────────────────────────────────────────── */

function DSCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="p-6 rounded-lg border border-border bg-white/[0.022]">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-4 mb-4">
        {label}
      </div>
      {children}
    </div>
  )
}

/**
 * TypeCard — 4 type sample sizes stacked. Last "Display 32" gets the leading
 * D as italic serif. Source: Ori-landing.html lines 1651-1657.
 */
function TypeCard() {
  return (
    <DSCard label="Type">
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        CAPTION · 11
      </div>
      <div className="mt-2 text-[13px] text-ink-2">Body 13 — Geist regular</div>
      <div
        className="mt-2 text-[18px] text-foreground"
        style={{ letterSpacing: '-0.015em' }}
      >
        Subhead 18 — tight tracking
      </div>
      <div
        className="mt-2 text-[32px] leading-none text-foreground"
        style={{ letterSpacing: '-0.03em' }}
      >
        <Serif>D</Serif>isplay 32
      </div>
    </DSCard>
  )
}

/**
 * ColorCard — 4 swatches (bg / surf / ink / accent), each labeled mono.
 * Source: Ori-landing.html lines 1660-1668.
 */
function ColorCard() {
  return (
    <DSCard label="Color">
      <div className="grid grid-cols-2 gap-2">
        <Swatch
          name="bg"
          background="var(--color-background)"
          textColor="var(--color-ink-3)"
        />
        <Swatch
          name="surf"
          background="var(--color-surface-3)"
          textColor="var(--color-ink-2)"
        />
        <Swatch
          name="ink"
          background="var(--color-foreground)"
          textColor="var(--color-background)"
        />
        <Swatch
          name="accent"
          background="var(--color-primary)"
          textColor="var(--color-primary-foreground)"
        />
      </div>
    </DSCard>
  )
}

function Swatch({
  name,
  background,
  textColor,
}: {
  name: string
  background: string
  textColor: string
}) {
  return (
    <div
      className="rounded-lg border border-border p-2.5 flex items-end font-mono text-[10px]"
      style={{ aspectRatio: '2 / 1', background, color: textColor }}
    >
      {name}
    </div>
  )
}

/**
 * RadiiCard — 4 squares with progressively larger border-radius.
 * Source: Ori-landing.html lines 1671-1680.
 */
function RadiiCard() {
  return (
    <DSCard label="Radii">
      <div className="grid grid-cols-4 gap-2 items-end">
        <RadiusBox radius="4px" />
        <RadiusBox radius="10px" />
        <RadiusBox radius="16px" />
        <RadiusBox radius="999px" />
      </div>
      <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        4 · 10 · 16 · FULL
      </div>
    </DSCard>
  )
}

function RadiusBox({ radius }: { radius: string }) {
  return (
    <div
      className="border border-[var(--color-border-strong)] bg-[var(--color-surface-3)]"
      style={{ aspectRatio: '1 / 1', borderRadius: radius }}
    />
  )
}

/**
 * MotionCard — animated motion-bar showing the canonical ease curve.
 * Source: Ori-landing.html lines 1683-1687. Animation declared in globals.css
 * keyframe `ori-motion-slide` (added to globals.css alongside this component).
 */
function MotionCard() {
  return (
    <DSCard label="Motion">
      <div className="relative h-10 rounded-lg bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-1/5 rounded-lg bg-[var(--color-primary)]"
          style={{
            animation: 'ori-motion-slide 2.4s var(--ease) infinite',
          }}
        />
      </div>
      <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        EASE · 0.2 0.7 0.2 1
      </div>
    </DSCard>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   MoveModuleGrid — 18 deployed Move modules. Used only by the /system page.
   Per DECISIONS.md D1 the landing /system shows the 4 DSGrid cards above;
   the technical /system route additionally renders this developer table.
   ────────────────────────────────────────────────────────────────────────── */

interface MoveModule {
  n: number
  primitive: string
  route: string
  module: string
}

const MOVE_MODULES: readonly MoveModule[] = [
  { n: 1, primitive: 'Pay without leaving the chat', route: '/send', module: 'payment_router' },
  { n: 2, primitive: 'One name, everywhere', route: '/[identifier]', module: 'profile_registry' },
  { n: 3, primitive: 'Tip with one tap', route: '/[identifier]#tip', module: 'tip_jar' },
  { n: 4, primitive: 'Gift a link, not a form', route: '/gift/new', module: 'gift_packet' },
  { n: 5, primitive: 'Group gifts', route: '/gift/new (group)', module: 'gift_group' },
  { n: 6, primitive: 'Stream by the second', route: '/streams', module: 'payment_stream' },
  { n: 7, primitive: 'Subscribe / be subscribed', route: '/subscriptions', module: 'subscription_vault' },
  { n: 8, primitive: 'Lock a URL behind a price', route: '/paywall/new', module: 'paywall' },
  { n: 9, primitive: 'Predict, in a sentence', route: '/predict', module: 'prediction_pool' },
  { n: 10, primitive: 'Lucky pools', route: '/lucky', module: 'lucky_pool' },
  { n: 11, primitive: 'Squads', route: '/squads', module: 'squads' },
  { n: 12, primitive: 'Follows + reputation', route: '/[identifier]', module: 'follow_graph' },
  { n: 13, primitive: 'Wager 1v1', route: '/[identifier]', module: 'wager_escrow' },
  { n: 14, primitive: 'Achievement badges', route: '/[identifier]', module: 'achievement_sbt' },
  { n: 15, primitive: 'Merchant profile', route: '/settings (merchant)', module: 'merchant_registry' },
  { n: 16, primitive: 'Agent policy + kill switch', route: '/settings (agent)', module: 'agent_policy' },
  { n: 17, primitive: 'Reputation surface', route: '/[identifier]', module: 'reputation' },
  { n: 18, primitive: 'Gift theme catalog', route: '(admin)', module: 'gift_box_catalog' },
]

/**
 * MoveModuleGrid — exhaustive table of deployed Move modules.
 * Header row + 18 module rows. Mono path/module columns.
 */
export function MoveModuleGrid() {
  return (
    <Reveal className="mt-14 rounded-lg border border-border bg-white/[0.022] overflow-hidden">
      <div className="grid grid-cols-[40px_1fr_1.2fr_1fr] px-5 py-3 border-b border-border bg-white/[0.018] font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
        <span>#</span>
        <span>Primitive</span>
        <span>Route</span>
        <span>Module</span>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {MOVE_MODULES.map((m) => (
          <li
            key={m.module}
            className="grid grid-cols-[40px_1fr_1.2fr_1fr] px-5 py-3 text-[13px] items-center"
          >
            <span className="font-mono tabular-nums text-ink-3">
              {String(m.n).padStart(2, '0')}
            </span>
            <span className="text-foreground">{m.primitive}</span>
            <span className="font-mono text-ink-2 truncate">{m.route}</span>
            <span className="font-mono text-ink-2 truncate">{m.module}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}
