import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Send } from 'lucide-react'

import { MarketingTopbar, MarketingFooter } from '@/components/marketing-chrome'
import { FlowStage } from '@/components/landing/FlowStage'
import { Eyebrow, Reveal, Serif } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Flow · Ori',
  description:
    'Three surfaces, one continuous thought. From conversation to settled in a single gesture.',
}

interface Step {
  n: string
  title: string
  blurb: string
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'You open a chat',
    blurb:
      'Same surface as iMessage or Telegram — except every contact is also a payable account.',
  },
  {
    n: '02',
    title: 'You tap the amount',
    blurb:
      'A big-number keypad slides up. No recipient form, no gas picker, no confirmation modal.',
  },
  {
    n: '03',
    title: 'You hit send',
    blurb:
      'A payment card springs into the conversation. ~100ms median settlement on the ori-1 rollup. Auto-signed under your daily cap.',
  },
  {
    n: '04',
    title: 'They see it land',
    blurb:
      "The card animates in on the receiver's screen. A subtle haptic. They tap to view tx, or just keep typing. The conversation never broke.",
  },
]

interface StatItem {
  k: string
  unit?: string
  v: string
}

const STATS: readonly StatItem[] = [
  { k: '97', unit: 'ms', v: 'median settlement' },
  { k: '0', v: 'wallet popups' },
  { k: '0', unit: '%', v: 'custodial holds' },
  { k: 'e2e', v: 'encrypted by default' },
]

function StatCell({ k, unit, v }: StatItem) {
  const isNumeric = unit !== undefined || /^\d/.test(k)
  return (
    <div>
      <div
        className={
          'font-mono text-foreground leading-none ' +
          (isNumeric ? 'tabular-nums' : '')
        }
        style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.03em' }}
      >
        {k}
        {unit && <span className="text-ink-3 text-[20px] ml-0.5">{unit}</span>}
      </div>
      <div
        className="mt-1 text-[12px] text-ink-3"
        style={{ letterSpacing: '0.01em' }}
      >
        {v}
      </div>
    </div>
  )
}

function StepRow({ s }: { s: Step }) {
  return (
    <div className="grid lg:grid-cols-[120px_1fr] gap-4 lg:gap-12 items-start">
      <div className="font-mono text-ink-4 text-[13px] tracking-[0.02em]">
        / {s.n}
      </div>
      <div>
        <h3
          className="text-foreground tracking-tight leading-[1.15]"
          style={{
            fontSize: 'clamp(22px, 2.4vw, 32px)',
            fontWeight: 400,
            letterSpacing: '-0.025em',
          }}
        >
          {s.title}
        </h3>
        <p className="mt-3 text-ink-2 leading-[1.6] max-w-[58ch] text-[15px]">
          {s.blurb}
        </p>
      </div>
    </div>
  )
}

export default function FlowPage() {
  return (
    <main id="main-content" className="relative min-h-dvh backdrop-stars">
      <MarketingTopbar active="/flow" />
      <div className="relative z-10">
        {/* Hero */}
        <section className="shell pt-[clamp(48px,10vw,140px)] pb-[clamp(48px,8vw,100px)]">
          <Reveal>
            <Eyebrow>· Flow</Eyebrow>
            <h1
              className="mt-5 leading-[0.98] text-foreground"
              style={{
                fontSize: 'clamp(36px, 6vw, 80px)',
                fontWeight: 400,
                letterSpacing: '-0.04em',
                maxWidth: '14ch',
              }}
            >
              Conversation to <Serif>settled</Serif>.
            </h1>
            <p
              className="mt-8 leading-[1.55] text-ink-2 max-w-[60ch]"
              style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
            >
              Most apps make you leave the chat to do anything important. Ori
              does the opposite. The wallet lives inside the conversation, and
              a hundred-millisecond settlement keeps the rhythm intact.
            </p>
          </Reveal>
        </section>

        {/* FlowStage — 3 OS-windows */}
        <FlowStage />

        {/* 4-stat ribbon */}
        <section className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">
          <Reveal
            className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 py-8 border-y border-[var(--color-border)]"
          >
            {STATS.map((s) => (
              <StatCell key={s.v} {...s} />
            ))}
          </Reveal>
        </section>

        {/* Step-by-step */}
        <section className="shell pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <Eyebrow>The gesture</Eyebrow>
            <h2
              className="mt-5 leading-[1.05] text-foreground tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(28px, 3.6vw, 48px)',
                fontWeight: 400,
                maxWidth: '18ch',
              }}
            >
              Four moments, <Serif>one</Serif> motion.
            </h2>
          </Reveal>
          <div className="mt-14 space-y-12">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 60}>
                <StepRow s={s} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section className="shell pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <Eyebrow>Try it now</Eyebrow>
                <h2
                  className="mt-3 leading-[1.1] text-foreground"
                  style={{
                    fontSize: 'clamp(24px, 2.5vw, 36px)',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Try sending a payment to <Serif>yourself</Serif>.
                </h2>
              </div>
              <Link
                href="/send"
                className="shrink-0 inline-flex items-center gap-2 rounded-full h-12 px-6 text-[14px] font-medium bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px transition"
              >
                <Send className="w-4 h-4" /> Open Send{' '}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
      <MarketingFooter />
    </main>
  )
}
