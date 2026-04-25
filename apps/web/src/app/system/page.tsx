import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Github } from 'lucide-react'

import { MarketingTopbar, MarketingFooter } from '@/components/marketing-chrome'
import { SystemGrid, MoveModuleGrid } from '@/components/landing/SystemGrid'
import { Eyebrow, Reveal, Serif } from '@/components/ui'

export const metadata: Metadata = {
  title: 'System · Ori',
  description:
    'Eighteen Move modules, three open protocols, one rollup. The technical surface area of Ori.',
}

interface ProtocolCard {
  eyebrow: string
  title: string
  blurb: string
  snippet: string
}

const PROTOCOLS: readonly ProtocolCard[] = [
  {
    eyebrow: 'MCP',
    title: 'MCP — Model Context Protocol',
    blurb:
      'Fourteen tools registered in a single config line. Claude Desktop discovers them, asks permission once, then transacts under your daily cap.',
    snippet: `{
  "mcpServers": {
    "ori": {
      "command": "npx",
      "args": ["-y", "@ori/mcp-server"]
    }
  }
}`,
  },
  {
    eyebrow: 'A2A',
    title: 'A2A — Agent-to-Agent JSON-RPC',
    blurb:
      'Every tool is also one HTTP endpoint. JSON-RPC 2.0, discoverable via .well-known/agent.json, callable by any agent stack.',
    snippet: `POST /a2a
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "ori.send_tip",
  "params": { "to": "mira.init", "amount": 5 }
}`,
  },
  {
    eyebrow: 'x402',
    title: 'x402 — Payment-required HTTP',
    blurb:
      'Paywalls speak the x402 spec natively. Agent calls a gated URL, gets a 402 with payment terms, pays on-chain, retries with the receipt.',
    snippet: `HTTP/1.1 402 Payment Required
X-Payment-Terms: ori-paywall:42:0.05:INIT
X-Resource: https://mira.films/full

→ pay → receipt → retry`,
  },
]

interface StackItem {
  label: string
  value: string
}

const STACK: readonly StackItem[] = [
  { label: 'Chain', value: 'ori-1 (MiniMove)' },
  { label: 'Settlement', value: 'OPinit → Initia L1' },
  { label: 'Frontend', value: 'Next.js + Tailwind' },
  { label: 'Backend', value: 'Fastify + Postgres + Redis' },
  { label: 'Identity', value: '.init names on L1' },
  { label: 'Wallet', value: 'InterwovenKit + Privy' },
  { label: 'Auto-sign', value: '24h session keys' },
  { label: 'Oracle', value: 'Slinky / Connect' },
]

function ProtocolCardEl({ p }: { p: ProtocolCard }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-7 h-full flex flex-col">
      <Eyebrow>· {p.eyebrow}</Eyebrow>
      <h3
        className="mt-3 text-foreground tracking-tight leading-[1.2]"
        style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-0.01em' }}
      >
        {p.title}
      </h3>
      <p className="mt-2 text-ink-2 leading-[1.55]" style={{ fontSize: '13.5px' }}>
        {p.blurb}
      </p>
      <pre
        className="mt-5 rounded-xl bg-black/40 border border-[var(--color-border)] p-4 font-mono leading-[1.7] overflow-x-auto text-ink-2"
        style={{ fontSize: '12px' }}
      >
        {p.snippet}
      </pre>
    </div>
  )
}

function StackCard({ label, value }: StackItem) {
  return (
    <div className="rounded-xl border border-[var(--color-border-strong)] bg-white/[0.022] p-5">
      <div
        className="font-mono uppercase text-ink-3"
        style={{ fontSize: '10.5px', letterSpacing: '0.14em' }}
      >
        {label}
      </div>
      <div className="mt-2 text-foreground" style={{ fontSize: '14px' }}>
        {value}
      </div>
    </div>
  )
}

export default function SystemPage() {
  return (
    <main id="main-content" className="relative min-h-dvh backdrop-stars">
      <MarketingTopbar active="/system" />
      <div className="relative z-10">
        {/* Hero */}
        <section className="shell pt-[clamp(48px,10vw,140px)] pb-[clamp(48px,8vw,100px)]">
          <Reveal>
            <Eyebrow>· System</Eyebrow>
            <h1
              className="mt-5 leading-[0.98] text-foreground"
              style={{
                fontSize: 'clamp(36px, 6vw, 80px)',
                fontWeight: 400,
                letterSpacing: '-0.04em',
                maxWidth: '14ch',
              }}
            >
              The pieces that <Serif>make</Serif> the whole.
            </h1>
            <p
              className="mt-8 leading-[1.55] text-ink-2 max-w-[60ch]"
              style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
            >
              Ori sits on its own MiniMove rollup, settles to Initia L1 via
              OPinit, and exposes every primitive over three open protocols.
              No proprietary auth, no vendor lock, no token sale.
            </p>
          </Reveal>
        </section>

        {/* Visual system — DSGrid 4-card from primitive */}
        <section className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <Eyebrow>The visual system</Eyebrow>
          </Reveal>
          <SystemGrid />
        </section>

        {/* 18 Move modules — table */}
        <section className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <Eyebrow>Eighteen Move modules — deployed on ori-1</Eyebrow>
            <h2
              className="mt-5 leading-[1.05] text-foreground tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(28px, 3.6vw, 48px)',
                fontWeight: 400,
                maxWidth: '20ch',
              }}
            >
              The whole protocol, <Serif>module</Serif> by module.
            </h2>
            <p
              className="mt-6 leading-[1.55] text-ink-2 max-w-[60ch]"
              style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
            >
              Every primitive in the product is a Move module on the ori-1
              rollup. Read the source, fork it, run your own.
            </p>
          </Reveal>
          <MoveModuleGrid />
        </section>

        {/* 3 protocols */}
        <section className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <Eyebrow>Three open protocols</Eyebrow>
            <h2
              className="mt-5 leading-[1.05] text-foreground tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(28px, 3.6vw, 48px)',
                fontWeight: 400,
                maxWidth: '20ch',
              }}
            >
              Standards, <Serif>not</Serif> a platform.
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
            {PROTOCOLS.map((p, i) => (
              <Reveal key={p.eyebrow} delay={i * 60}>
                <ProtocolCardEl p={p} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* Stack — 8-up grid */}
        <section className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <Eyebrow>The stack</Eyebrow>
            <h2
              className="mt-5 leading-[1.05] text-foreground tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(28px, 3.6vw, 48px)',
                fontWeight: 400,
                maxWidth: '20ch',
              }}
            >
              Boring choices, <Serif>quietly</Serif> assembled.
            </h2>
          </Reveal>
          <Reveal className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STACK.map((s) => (
              <StackCard key={s.label} label={s.label} value={s.value} />
            ))}
          </Reveal>
        </section>

        {/* CTA strip — Read the source */}
        <section className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">
          <Reveal>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <Eyebrow>Read the source</Eyebrow>
                <h2
                  className="mt-3 leading-[1.1] text-foreground"
                  style={{
                    fontSize: 'clamp(24px, 2.5vw, 36px)',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    maxWidth: '22ch',
                  }}
                >
                  Every module, <Serif>open</Serif> on GitHub.
                </h2>
              </div>
              <Link
                href="https://github.com/Pratiikpy/Ori"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-2 rounded-full h-12 px-6 text-[14px] font-medium bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px transition"
              >
                <Github className="w-4 h-4" /> View repository{' '}
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
