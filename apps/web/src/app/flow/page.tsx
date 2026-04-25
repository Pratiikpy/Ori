import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Hand, Send, Wallet } from 'lucide-react'

import { MarketingTopbar, MarketingFooter } from '@/components/marketing-chrome'
import { Eyebrow, Reveal } from '@/components/ui'

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
      'Same surface as iMessage or Telegram — except every contact is also a payable account, every message can carry money.',
  },
  {
    n: '02',
    title: 'You tap the amount',
    blurb:
      'A big-number keypad slides up. No recipient form, no gas picker, no confirmation modal. The recipient is already known from context.',
  },
  {
    n: '03',
    title: 'You hit send',
    blurb:
      'A payment card springs into the conversation as both parties watch. ~100 ms median settlement on the ori-1 rollup. Auto-signed under your daily cap.',
  },
  {
    n: '04',
    title: 'They see it land',
    blurb:
      'The card animates in on the receiver\'s screen. A subtle haptic. They tap to view tx hash, or just keep typing. The conversation never broke.',
  },
]

function StepRow({ s }: { s: Step }) {
  return (
    <div className="grid lg:grid-cols-[120px_1fr] gap-4 lg:gap-12 items-start">
      <div className="font-mono text-ink-4 text-[14px]">/ {s.n}</div>
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

function MockChatBubble({ text, out }: { text: string; out?: boolean }) {
  return (
    <div
      className={
        'max-w-[78%] text-[12.5px] leading-[1.4] px-3 py-1.5 rounded-2xl border ' +
        (out
          ? 'ml-auto bg-[var(--color-primary)] text-white rounded-br-sm border-[var(--color-primary)]'
          : 'bg-white/[0.05] text-foreground rounded-bl-sm border-border')
      }
    >
      {text}
    </div>
  )
}

function MockPayCard({ amt, meta }: { amt: string; meta: string }) {
  return (
    <div className="ml-auto max-w-[86%] rounded-2xl border border-border bg-white/[0.025] p-3.5">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
        Sent · alex.init
      </div>
      <div className="tnum text-[26px] font-medium mt-1 leading-none">
        <span className="text-ink-3 text-[16px] mr-0.5 align-[0.12em]">$</span>
        {amt}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-3 font-mono">
        <span className="inline-flex h-3.5 w-3.5 rounded-full bg-[var(--color-success)] items-center justify-center">
          <Check className="w-2.5 h-2.5 text-[var(--color-background)]" />
        </span>
        {meta}
      </div>
    </div>
  )
}

export default function FlowPage() {
  return (
    <main className="relative min-h-dvh backdrop-stars">
      <MarketingTopbar active="/flow" />
      <div className="relative z-10">
        <section className="shell pt-20 lg:pt-28 pb-14">
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
            Conversation to{' '}
            <span className="font-serif">settled</span>.
          </h1>
          <p
            className="mt-8 leading-[1.55] text-ink-2 max-w-[58ch]"
            style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
          >
            Most apps make you leave the chat to do anything important.
            Ori does the opposite. The wallet lives inside the
            conversation, and a hundred-millisecond settlement keeps the
            rhythm intact.
          </p>
        </section>

        {/* Live chat mock */}
        <section className="shell pb-16">
          <Reveal>
            <div className="max-w-[420px] mx-auto rounded-3xl border border-[var(--color-border-strong)] bg-[var(--color-bg-2)] overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--color-line-hairline)]">
                <span
                  className="h-8 w-8 rounded-full inline-flex items-center justify-center text-[12px] font-medium text-black"
                  style={{ background: 'linear-gradient(135deg,#78cfc1,#3aa693)' }}
                >
                  A
                </span>
                <div>
                  <div className="text-[14px] font-medium">alex.init</div>
                  <div className="text-[11px] font-mono text-ink-3">active</div>
                </div>
              </div>
              <div className="px-4 py-5 space-y-2 min-h-[280px] flex flex-col justify-end">
                <MockChatBubble text="lunch was 16.20 today" />
                <MockChatBubble out text="sending now" />
                <MockPayCard amt="16.20" meta="Landed · 97ms" />
                <MockChatBubble text="ty 🙏" />
                <MockChatBubble out text="anytime" />
              </div>
            </div>
          </Reveal>
        </section>

        {/* Step-by-step */}
        <section className="shell pb-24 space-y-12">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 60}>
              <StepRow s={s} />
            </Reveal>
          ))}
        </section>

        {/* Numbers strip */}
        <section className="shell pb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 py-8 border-y border-[var(--color-border)]">
            <Stat k="97" unit="ms" v="median settlement" />
            <Stat k="0" v="wallet popups" />
            <Stat k="0" unit="%" v="custodial holds" />
            <Stat k="e2e" v="encrypted by default" />
          </div>
        </section>

        <section className="shell pb-12">
          <div className="rounded-3xl border border-primary/30 bg-primary/[0.05] p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <Eyebrow>Open one</Eyebrow>
              <h2
                className="mt-3 leading-[1.1] text-foreground"
                style={{
                  fontSize: 'clamp(24px, 2.5vw, 36px)',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                }}
              >
                Try sending <span className="font-serif">a payment</span> to yourself.
              </h2>
            </div>
            <Link
              href="/send"
              className="shrink-0 inline-flex items-center gap-2 rounded-full h-12 px-6 text-[14px] font-medium bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px transition"
            >
              Send a payment <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
      <MarketingFooter />
    </main>
  )
}

function Stat({ k, unit, v }: { k: string; unit?: string; v: string }) {
  return (
    <div>
      <div
        className="tnum font-mono text-foreground leading-none"
        style={{ fontSize: '32px', fontWeight: 500, letterSpacing: '-0.03em' }}
      >
        {k}
        {unit && <span className="text-ink-3 text-[20px] ml-0.5">{unit}</span>}
      </div>
      <div className="mt-2 text-[12px] text-ink-3">{v}</div>
    </div>
  )
}
