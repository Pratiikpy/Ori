/**
 * Ori — landing page.
 *
 * Server component. The page is composition: every section is its own
 * primitive in `@/components/landing/*`. Client interactivity (scroll
 * reveal, wallet pill, parallax tilt) is isolated to `landing-interactive`
 * and `marketing-chrome`. Copy is verbatim from `design-refs/CONTENT.md`;
 * route order matches `design-refs/IA.md`.
 */
import type { ReactNode } from 'react'
import { ScrollReveal } from '@/components/landing-interactive'
import {
  MarketingTopbar,
  MarketingFooter,
} from '@/components/marketing-chrome'
import { Hero } from '@/components/landing/Hero'
import { StatsRibbon } from '@/components/landing/StatsRibbon'
import { CapabilitiesGrid } from '@/components/landing/CapabilitiesGrid'
import { FlowStage } from '@/components/landing/FlowStage'
import { CreatorProfile } from '@/components/landing/CreatorProfile'
import { Philosophy } from '@/components/landing/Philosophy'
import { SystemGrid } from '@/components/landing/SystemGrid'

/**
 * Italic-serif accent word. Mirrors the `<span class="serif">…</span>`
 * pattern from the reference HTML — we keep accent words as inline
 * elements so they compose into headlines without extra layout cost.
 */
function Serif({ children }: { children: ReactNode }) {
  return <span className="font-serif italic">{children}</span>
}

/**
 * Section header used by every numbered slab below the hero. Eyebrow is
 * mono uppercase; title is the marketing display face with optional
 * inline `<Serif>` accent; sub is muted body text.
 */
function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string
  title: ReactNode
  sub: string
}) {
  return (
    <header className="reveal max-w-3xl">
      <div className="font-mono uppercase text-[12px] tracking-[0.14em] text-ink-3">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-[clamp(32px,5vw,56px)] leading-[1.05] tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <p className="mt-5 text-[15px] leading-[1.6] text-ink-2">{sub}</p>
    </header>
  )
}

export default function LandingPage() {
  return (
    <ScrollReveal>
      <main className="relative min-h-dvh backdrop-stars overflow-x-hidden">
        <MarketingTopbar active="/" />

        <div className="relative z-10">
          {/* Section 01 — Hero (no eyebrow, full-bleed) */}
          <section className="shell pt-[clamp(48px,10vw,140px)] pb-[clamp(48px,8vw,100px)]">
            <Hero />
          </section>

          {/* Stats ribbon — right under hero, no eyebrow */}
          <section className="shell">
            <StatsRibbon />
          </section>

          {/* 01 · Capabilities */}
          <section
            id="capabilities"
            className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]"
          >
            <SectionHead
              eyebrow="01 · Capabilities"
              title={
                <>
                  Payments, messages, and agents{' '}
                  <Serif>on the same surface</Serif>.
                </>
              }
              sub="Eight primitives. No feature menu. Everything Ori does, it does from a single conversation."
            />
            <div className="mt-14">
              <CapabilitiesGrid />
            </div>
          </section>

          {/* 02 · Flow */}
          <section
            id="flow"
            className="shell pb-[clamp(72px,12vw,140px)]"
          >
            <SectionHead
              eyebrow="02 · Flow"
              title={
                <>
                  A single gesture from <Serif>conversation</Serif> to settled.
                </>
              }
              sub="Three surfaces. One continuous thought."
            />
            <div className="mt-14">
              <FlowStage />
            </div>
          </section>

          {/* 03 · Creators */}
          <section
            id="agents"
            className="shell pb-[clamp(72px,12vw,140px)]"
          >
            <SectionHead
              eyebrow="03 · Creators"
              title={
                <>
                  A profile, a tip jar, <Serif>and a stage</Serif>.
                </>
              }
              sub="Linktree, Patreon, and Stripe in one page that lives on the chain."
            />
            <div className="mt-14 max-w-xl mx-auto">
              <CreatorProfile />
            </div>
          </section>

          {/* 04 · Philosophy */}
          <section
            id="philosophy"
            className="shell pb-[clamp(72px,12vw,140px)]"
          >
            <Philosophy />
          </section>

          {/* 05 · System */}
          <section
            id="system"
            className="shell pb-[clamp(72px,12vw,140px)]"
          >
            <SystemGrid />
          </section>
        </div>

        <MarketingFooter />
      </main>
    </ScrollReveal>
  )
}
