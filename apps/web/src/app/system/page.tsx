import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Github } from 'lucide-react'

import { MarketingTopbar, MarketingFooter } from '@/components/marketing-chrome'
import { Eyebrow, Reveal } from '@/components/ui'

export const metadata: Metadata = {
  title: 'System · Ori',
  description:
    'The technical surface area of Ori. Eighteen Move modules, fourteen MCP tools, A2A JSON-RPC, x402.',
}

interface ProtocolCard {
  title: string
  blurb: string
  detail?: React.ReactNode
}

const PROTOCOLS: ProtocolCard[] = [
  {
    title: 'MCP — Model Context Protocol',
    blurb:
      'Fourteen tools registered in a single config line. Claude Desktop discovers them, asks permission once, then transacts under your daily cap.',
    detail: (
      <pre className="mt-5 rounded-xl bg-black/40 border border-[var(--color-border)] p-4 text-[12px] leading-[1.7] font-mono overflow-x-auto text-ink-2">
{`{
  "mcpServers": {
    "ori": {
      "command": "npx",
      "args": ["-y", "@ori/mcp-server"]
    }
  }
}`}
      </pre>
    ),
  },
  {
    title: 'A2A — Agent-to-Agent JSON-RPC 2.0',
    blurb:
      'Every tool is also reachable over HTTP. Plain JSON, plain RPC. Discovered through .well-known/agent.json so any agent stack can find you.',
    detail: (
      <pre className="mt-5 rounded-xl bg-black/40 border border-[var(--color-border)] p-4 text-[12px] leading-[1.7] font-mono overflow-x-auto text-ink-2">
{`POST /a2a
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "ori.send_tip",
  "params": { "to": "mira.init", "amount": 5 }
}`}
      </pre>
    ),
  },
  {
    title: 'x402 — Payment-required HTTP',
    blurb:
      'Paywalls speak the x402 spec natively. An agent calling a gated URL gets a 402 with payment terms; pays on-chain; retries with the receipt.',
    detail: (
      <pre className="mt-5 rounded-xl bg-black/40 border border-[var(--color-border)] p-4 text-[12px] leading-[1.7] font-mono overflow-x-auto text-ink-2">
{`HTTP/1.1 402 Payment Required
X-Payment-Terms: ori-paywall:42:0.05:INIT
X-Resource: https://mira.films/full

→ pay → receipt → retry`}
      </pre>
    ),
  },
]

interface ModuleCard {
  name: string
  purpose: string
}

const MODULES: ModuleCard[] = [
  { name: 'profile_registry', purpose: 'Public profile bound to a .init name' },
  { name: 'payment_router', purpose: 'Send + batch-send + chat-scoped cards' },
  { name: 'tip_jar', purpose: 'One-tap creator tips; 1% platform fee' },
  { name: 'gift_packet', purpose: 'Single-recipient gift links' },
  { name: 'gift_group', purpose: 'Multi-slot group gifts' },
  { name: 'gift_box_catalog', purpose: 'Curated gift themes' },
  { name: 'paywall', purpose: 'Lock URLs behind a one-time payment (x402)' },
  { name: 'subscription_vault', purpose: 'Recurring plans with per-period release' },
  { name: 'payment_stream', purpose: 'Continuous per-second streams' },
  { name: 'wager_escrow', purpose: '1v1 + oracle-resolved wagers' },
  { name: 'prediction_pool', purpose: 'Parimutuel oracle-resolved markets' },
  { name: 'lucky_pool', purpose: 'Raffle pools with permissionless draw' },
  { name: 'follow_graph', purpose: 'On-chain follow / unfollow' },
  { name: 'reputation', purpose: 'Thumbs up/down + signed attestations' },
  { name: 'achievement_sbt', purpose: 'Soulbound craft badges' },
  { name: 'merchant_registry', purpose: 'Discoverable business listing' },
  { name: 'squads', purpose: 'Lightweight on-chain groups' },
  { name: 'agent_policy', purpose: 'Per-agent daily cap + kill switch' },
]

export default function SystemPage() {
  return (
    <main className="relative min-h-dvh backdrop-stars">
      <MarketingTopbar active="/system" />
      <div className="relative z-10">
        <section className="shell pt-20 lg:pt-28 pb-14">
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
            The pieces that{' '}
            <span className="font-serif">make</span> the whole.
          </h1>
          <p
            className="mt-8 leading-[1.55] text-ink-2 max-w-[60ch]"
            style={{ fontSize: 'clamp(15px, 1.2vw, 17px)' }}
          >
            Ori sits on its own MiniMove rollup, settles to Initia L1 via
            OPinit, and exposes every primitive over three open
            protocols. No proprietary auth, no vendor lock, no token sale.
          </p>
        </section>

        {/* Protocols */}
        <section className="shell pb-20">
          <Eyebrow>Protocols</Eyebrow>
          <div className="mt-6 grid lg:grid-cols-3 gap-4 lg:gap-5">
            {PROTOCOLS.map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <div className="rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-7 h-full">
                  <h3 className="text-[18px] font-medium text-foreground tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] text-ink-2 leading-[1.55]">
                    {p.blurb}
                  </p>
                  {p.detail}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Move modules */}
        <section className="shell pb-20">
          <Eyebrow>Move modules — eighteen on ori-1</Eyebrow>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULES.map((m) => (
              <div
                key={m.name}
                className="rounded-xl border border-[var(--color-border)] bg-white/[0.018] p-4"
              >
                <div className="font-mono text-[12px] text-foreground">
                  {m.name}
                </div>
                <div className="mt-1 text-[12.5px] text-ink-3 leading-[1.5]">
                  {m.purpose}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section className="shell pb-20">
          <Eyebrow>Stack</Eyebrow>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StackCard label="Chain" value="ori-1 (MiniMove)" />
            <StackCard label="Settlement" value="OPinit → Initia L1" />
            <StackCard label="Frontend" value="Next.js + Tailwind" />
            <StackCard label="Backend" value="Fastify + Postgres + Redis" />
            <StackCard label="Identity" value=".init names on L1" />
            <StackCard label="Wallet" value="InterwovenKit + Privy" />
            <StackCard label="Auto-sign" value="24h session keys" />
            <StackCard label="Oracle" value="Slinky / Connect" />
          </div>
        </section>

        <section className="shell pb-12">
          <div className="rounded-3xl border border-primary/30 bg-primary/[0.05] p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <Eyebrow>Read the source</Eyebrow>
              <h2
                className="mt-3 leading-[1.1] text-foreground"
                style={{
                  fontSize: 'clamp(24px, 2.5vw, 36px)',
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                }}
              >
                Every module, <span className="font-serif">open</span> on GitHub.
              </h2>
            </div>
            <Link
              href="https://github.com/Pratiikpy/Ori"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-2 rounded-full h-12 px-6 text-[14px] font-medium bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px transition"
            >
              <Github className="w-4 h-4" />
              View repository <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
      <MarketingFooter />
    </main>
  )
}

function StackCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-strong)] bg-white/[0.022] p-5">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
        {label}
      </div>
      <div className="mt-2 text-[14px] text-foreground">{value}</div>
    </div>
  )
}
