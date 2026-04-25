/**
 * Landing — Ori's public marketing page.
 *
 * Apple-style: one big hero sentence, one image-equivalent (a glass card
 * showing the chat surface), three confident capability blocks below.
 * Honest and minimal — we don't have product photos, so the hero "image"
 * is a static composition of what payment-in-chat actually looks like.
 *
 * Server component. The CTA + nav use `useInterwovenKit` so they have to
 * live inside `LandingShell` (which is `'use client'`). Everything else
 * is pure markup, no client JS.
 */
import { LandingShell } from '@/components/layout/landing-shell'
import { Icon } from '@/components/ui/icon'
import { Eyebrow } from '@/components/ui/eyebrow'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <LandingShell>
      {/* ====================== HERO ====================== */}
      <section className="mx-auto w-full max-w-7xl px-5 sm:px-8 pt-16 sm:pt-24 pb-20 sm:pb-32">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-center">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-md border border-black/5 px-3 h-7 text-[12px] text-ink-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#34C759]" />
              </span>
              <span className="font-mono">Live on Initia · v0.1</span>
            </span>

            <h1
              className="mt-7 font-display font-medium text-ink leading-[1.02] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(40px, 7vw, 80px)' }}
            >
              Chat that pays.
              <br />
              <span className="text-ink-3">Agents that own a wallet.</span>
            </h1>

            <p className="mt-7 text-[17px] sm:text-[18px] leading-[1.55] text-ink-2 max-w-xl">
              Ori is one surface for messages, money, and AI agents.
              Settle in milliseconds. Spend under your own on-chain rules.
              No popups, no token launch.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/onboard"
                className="rounded-full h-12 px-7 bg-[#1D1D1F] text-white text-[15px] font-medium inline-flex items-center gap-2 hover:bg-black active:scale-[0.97] transition"
              >
                Open the app
                <Icon name="arrow-right" size={16} />
              </Link>
              <a
                href="#capabilities"
                className="rounded-full h-12 px-7 bg-black/5 text-ink text-[15px] font-medium hover:bg-black/10 active:scale-[0.97] transition inline-flex items-center"
              >
                See it work
              </a>
            </div>

            {/* Stat strip — black-on-white, mono digits */}
            <dl className="mt-12 grid grid-cols-3 max-w-md gap-6">
              <Stat k="97" unit="ms" label="median settle" />
              <Stat k="0" label="wallet popups" />
              <Stat k="14" label="MCP tools" />
            </dl>
          </div>

          {/* Hero card — a static composition representing the chat surface */}
          <HeroCard />
        </div>
      </section>

      {/* ============== STATS DIVIDER (full bleed) ============== */}
      <section className="border-y border-black/5 bg-white/40 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 py-7 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
          <BigStat label="Sub-second settlement" value="100ms" />
          <BigStat label="On-chain agent caps" value="MCP" />
          <BigStat label="No counterparty risk" value="Predict" />
          <BigStat label="One name everywhere" value=".init" />
        </div>
      </section>

      {/* ====================== CAPABILITIES ====================== */}
      <section
        id="capabilities"
        className="mx-auto w-full max-w-7xl px-5 sm:px-8 py-24 sm:py-32"
      >
        <div className="max-w-3xl">
          <Eyebrow>01 · Capabilities</Eyebrow>
          <h2
            className="mt-4 font-display font-medium text-ink leading-[1.05] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(32px, 4.5vw, 56px)' }}
          >
            Payments, messages, and agents on the same surface.
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] text-ink-2 leading-[1.55] max-w-2xl">
            Six primitives. No feature menu. Everything Ori does, it does from a
            single conversation.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Capability
            label="Pay"
            title="Tap, type, send."
            body="No recipient form, no gas picker, no confirmation modal. The money lands in the conversation as a card both sides see at the same moment."
          />
          <Capability
            label="Identity"
            title="One name, everywhere."
            body="Your .init is your chat handle, your payment address, your profile URL, and your agent endpoint. Resolve once, reuse forever."
          />
          <Capability
            label="Agents"
            title="Built for AI to use safely."
            body="MCP for Claude Desktop, A2A JSON-RPC for any agent over HTTP, on-chain spending caps, kill switch only you control."
          />
          <Capability
            label="Predict"
            title="60-second markets."
            body="Bet on BTC, ETH, SOL, or any Connect oracle pair. Markets resolve themselves. No counterparty, no settlement risk."
          />
          <Capability
            label="Stream"
            title="Pay by the second."
            body="Consulting, subscriptions, attention — as a continuous flow. Stops the moment either side says stop."
          />
          <Capability
            label="Caps"
            title="Daily limits, kill switch."
            body="Give an agent 50 INIT/day on-chain. Revoke from any device in one transaction. No trust required."
          />
        </div>
      </section>

      {/* ====================== AGENTS ====================== */}
      <section
        id="agents"
        className="mx-auto w-full max-w-7xl px-5 sm:px-8 pb-24 sm:pb-32"
      >
        <div className="max-w-3xl">
          <Eyebrow>02 · Agents</Eyebrow>
          <h2
            className="mt-4 font-display font-medium text-ink leading-[1.05] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(32px, 4.5vw, 56px)' }}
          >
            One prompt does the whole product.
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] text-ink-2 leading-[1.55] max-w-2xl">
            Plug Ori into Claude Desktop. A single message can check your
            balance, find a paywalled article, buy it, tip the author, and open
            a prediction — all on-chain, all under your daily cap.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-[1.1fr_1fr] gap-5">
          <div className="glass-card p-7 sm:p-8">
            <Eyebrow>Claude Desktop · MCP</Eyebrow>
            <h3 className="mt-3 text-[20px] sm:text-[24px] font-display font-medium text-ink leading-tight tracking-[-0.01em]">
              Fourteen tools in one config line.
            </h3>
            <pre className="mt-5 rounded-2xl bg-black text-white/90 p-5 text-[12px] leading-[1.7] font-mono overflow-x-auto">
{`{
  "mcpServers": {
    "ori": {
      "command": "npx",
      "args": ["-y", "@ori/mcp-server"]
    }
  }
}`}
            </pre>
            <p className="mt-4 text-[14px] text-ink-3 leading-[1.55]">
              Restart Claude, ask in plain English. Each tool signs under the
              policy you wrote on-chain.
            </p>
          </div>
          <div className="glass-card p-7 sm:p-8">
            <Eyebrow>Any agent · A2A JSON-RPC</Eyebrow>
            <h3 className="mt-3 text-[20px] sm:text-[24px] font-display font-medium text-ink leading-tight tracking-[-0.01em]">
              One HTTP endpoint. Standard protocol.
            </h3>
            <pre className="mt-5 rounded-2xl bg-black text-white/90 p-5 text-[12px] leading-[1.7] font-mono overflow-x-auto">
{`POST /a2a
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "ori.send_tip",
  "params": { "to": "mira.init", "amount": 5 }
}`}
            </pre>
            <p className="mt-4 text-[14px] text-ink-3 leading-[1.55]">
              Discover capabilities at <span className="font-mono text-ink-2">/.well-known/agent.json</span>. Every Ori user is callable by name.
            </p>
          </div>
        </div>
      </section>

      {/* ====================== FLOW ====================== */}
      <section
        id="flow"
        className="mx-auto w-full max-w-7xl px-5 sm:px-8 pb-24 sm:pb-32"
      >
        <div className="max-w-3xl">
          <Eyebrow>03 · Flow</Eyebrow>
          <h2
            className="mt-4 font-display font-medium text-ink leading-[1.05] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(32px, 4.5vw, 56px)' }}
          >
            From a thought to a payment, in one gesture.
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] text-ink-2 leading-[1.55] max-w-2xl">
            No forms. No popups. Numbers turn into transactions where you typed
            them — inside the conversation.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-5">
          <FlowStep n="01" title="Type a name" body="Tag any .init. Resolves to address instantly." />
          <FlowStep n="02" title="Pick the amount" body="Number pad in-line. No recipient form." />
          <FlowStep n="03" title="Money lands" body="A payment card appears in chat. Both sides see it at the same moment." />
        </div>
      </section>

      {/* ====================== FINAL CTA ====================== */}
      <section className="mx-auto w-full max-w-7xl px-5 sm:px-8 pb-24 sm:pb-32">
        <div className="glass-card p-10 sm:p-16 text-center">
          <h2
            className="font-display font-medium text-ink leading-[1.05] tracking-[-0.02em] mx-auto max-w-3xl"
            style={{ fontSize: 'clamp(32px, 4.5vw, 56px)' }}
          >
            Open the app. The rest is one tap.
          </h2>
          <div className="mt-8">
            <Link
              href="/onboard"
              className="rounded-full h-14 px-8 bg-[#1D1D1F] text-white text-[16px] font-medium inline-flex items-center gap-2 hover:bg-black active:scale-[0.97] transition"
            >
              Get started
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      </section>
    </LandingShell>
  )
}

/* ────────────────────────────────────────────────────────────── */

function Stat({
  k,
  unit,
  label,
}: {
  k: string
  unit?: string
  label: string
}) {
  return (
    <div>
      <div className="font-display tnum text-ink leading-none" style={{ fontSize: '28px' }}>
        {k}
        {unit && <span className="text-ink-3 text-[18px] ml-0.5">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[12px] text-ink-3">{label}</div>
    </div>
  )
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <div
        className="font-display font-medium text-ink leading-none"
        style={{ fontSize: 'clamp(20px, 2.4vw, 28px)' }}
      >
        {value}
      </div>
      <div className="mt-2 text-[11.5px] sm:text-[12px] text-ink-3 font-mono uppercase tracking-[0.1em]">
        {label}
      </div>
    </div>
  )
}

function Capability({
  label,
  title,
  body,
}: {
  label: string
  title: string
  body: string
}) {
  return (
    <article className="glass-card p-7 hover:-translate-y-[2px] transition-transform duration-300 will-change-transform">
      <Eyebrow>{label}</Eyebrow>
      <h3 className="mt-3 text-[18px] sm:text-[20px] font-display font-medium text-ink leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <p className="mt-2.5 text-[14px] text-ink-3 leading-[1.55]">{body}</p>
    </article>
  )
}

function FlowStep({
  n,
  title,
  body,
}: {
  n: string
  title: string
  body: string
}) {
  return (
    <article className="glass-card p-7">
      <span className="font-mono text-[12px] text-ink-4 tracking-[0.14em]">
        STEP {n}
      </span>
      <h3 className="mt-2 text-[18px] sm:text-[20px] font-display font-medium text-ink leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <p className="mt-2 text-[14px] text-ink-3 leading-[1.55]">{body}</p>
    </article>
  )
}

/**
 * HeroCard — the visual on the right of the hero.
 * A static composition showing what payment-inside-chat looks like.
 */
function HeroCard() {
  return (
    <div className="relative">
      {/* Soft halo */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-[#007AFF]/10 via-transparent to-[#FF6B9D]/10 blur-2xl"
      />
      {/* The chat card */}
      <div className="relative glass-card p-6 sm:p-7 max-w-md mx-auto">
        {/* Chat header */}
        <div className="flex items-center gap-3 pb-4 border-b border-black/5">
          <div
            className="w-10 h-10 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #FF9EC7, #FF6B9D)',
            }}
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium text-ink">
              mira<span className="text-ink-3">.init</span>
            </div>
            <div className="text-[11px] text-ink-3 font-mono">active now</div>
          </div>
        </div>

        {/* Messages */}
        <div className="pt-5 flex flex-col gap-2.5">
          <div className="self-start max-w-[80%] rounded-2xl rounded-bl-md bg-black/5 px-3.5 py-2 text-[13.5px] text-ink">
            dinner at nobu, $64.80 split 4 ways?
          </div>
          <div className="self-end max-w-[80%] rounded-2xl rounded-br-md bg-[#1D1D1F] px-3.5 py-2 text-[13.5px] text-white">
            sending now
          </div>

          {/* Payment card */}
          <div className="self-end max-w-[88%] rounded-2xl bg-white border border-black/5 p-4 shadow-sm">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3 font-mono">
              Sent · mira.init
            </div>
            <div className="mt-1 font-mono tnum text-[24px] font-medium text-ink">
              $16.20
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-3 font-mono">
              <span className="inline-flex h-3.5 w-3.5 rounded-full bg-[#34C759] items-center justify-center">
                <Icon name="check" size={9} weight="bold" className="text-white" />
              </span>
              Landed · 97ms · 0x4a…b3c2
            </div>
          </div>

          <div className="self-start max-w-[80%] rounded-2xl rounded-bl-md bg-black/5 px-3.5 py-2 text-[13.5px] text-ink">
            ty 🙏
          </div>
        </div>
      </div>
    </div>
  )
}
