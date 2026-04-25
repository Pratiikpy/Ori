// CapabilitiesGrid — 8-tile OS-window panel grid: 2 big (Pay, Identity) +
// 2 rows × 3 narrow (Gift/Agents/Stream and Predict/Unlock/Caps).
// Ports Ori-landing.html lines 1178-1345. Each tile = panel chrome + body + viz.

import type { ReactNode } from 'react'
import { Reveal, SectionHead, Serif } from '@/components/ui'
import { NetworkSVG } from '@/components/icons'

export function CapabilitiesGrid() {
  return (
    <section className="shell pt-16 pb-24">
      <Reveal>
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
      </Reveal>

      <div className="mt-14 grid gap-4 lg:gap-5">
        {/* Top row — 2 big tiles */}
        <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
          <BigTile path="/send" right="kp.send">
            <BigBody
              title={
                <>
                  <Serif>Pay</Serif> without leaving the chat.
                </>
              }
              text="Tap the amount, type a number, send. No recipient form, no gas picker, no confirmation modal. The money lands inside the conversation as a card both sides see at the same moment."
            >
              <KeypadViz />
            </BigBody>
          </BigTile>

          <BigTile path="/identity" right="id.graph">
            <BigBody
              title={
                <>
                  One name, <Serif>everywhere</Serif>.
                </>
              }
              text={
                <>
                  Your <span className="font-mono">.init</span> name is your chat
                  handle, your payment address, your profile URL, and your agent
                  endpoint. No copy-paste. No QR codes. No forks of who you are.
                </>
              }
            >
              <NetworkSVG className="text-primary" />
            </BigBody>
          </BigTile>
        </div>

        {/* Mid row — 3 narrow */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          <NarrowTile path="/gift" right="gft.create">
            <NarrowBody
              title={
                <>
                  <Serif>Gift</Serif> a link, not a form.
                </>
              }
              text="Wrap a payment. Share the URL. First tap claims it, even before they've set up Ori."
            >
              <GiftViz />
            </NarrowBody>
          </NarrowTile>

          <NarrowTile path="/agent" right="mcp.ori">
            <NarrowBody
              title={
                <>
                  Agents that <Serif>actually</Serif> pay.
                </>
              }
              text="Every action a user can take, an agent can take too — over a standard API, with no human in the loop."
            >
              <TerminalViz />
            </NarrowBody>
          </NarrowTile>

          <NarrowTile path="/stream" right="flow.live">
            <NarrowBody
              title={
                <>
                  <Serif>Stream</Serif> by the second.
                </>
              }
              text="Pay consulting, subscriptions, or attention as a continuous flow. Stops when anyone says stop."
            >
              <StreamViz />
            </NarrowBody>
          </NarrowTile>
        </div>

        {/* Bottom row — 3 narrow */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          <NarrowTile path="/predict" right="oracle.live">
            <NarrowBody
              title={
                <>
                  <Serif>Predict</Serif> in a sentence.
                </>
              }
              text="Bet on BTC, ETH, SOL, or any Connect oracle pair. Markets resolve themselves — no counterparty, no settlement risk."
            >
              <PredictViz />
            </NarrowBody>
          </NarrowTile>

          <NarrowTile path="/paywall" right="x402.paid">
            <NarrowBody
              title={
                <>
                  <Serif>Unlock</Serif> with one tap.
                </>
              }
              text="Gate any URL behind a one-time payment. Creators earn 99%. Agents pay via x402 without a human."
            >
              <PaywallViz />
            </NarrowBody>
          </NarrowTile>

          <NarrowTile path="/caps" right="agent.policy">
            <NarrowBody
              title={
                <>
                  Daily <Serif>caps</Serif>, kill switches.
                </>
              }
              text="Give an agent 50 ORI/day on-chain. Revoke from any device in one tx. No trust required."
            >
              <CapsViz />
            </NarrowBody>
          </NarrowTile>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Tile chrome — OS-window panel: 3 dots + mono /path + mono right label
   ────────────────────────────────────────────────────────────────────────── */

interface TileProps {
  path: string
  right: string
  children: ReactNode
}

function PanelChrome({ path, right }: { path: string; right: string }) {
  return (
    <div className="flex items-center justify-between px-4 h-10 border-b border-[var(--color-line-hairline)] text-[11px] font-mono text-ink-3 shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="flex gap-1">
          <span className="block h-2 w-2 rounded-full bg-white/10" />
          <span className="block h-2 w-2 rounded-full bg-white/10" />
          <span className="block h-2 w-2 rounded-full bg-white/10" />
        </span>
        <span className="truncate">{path}</span>
      </div>
      <span className="text-ink-4 truncate ml-2">{right}</span>
    </div>
  )
}

function BigTile({ path, right, children }: TileProps) {
  return (
    <Reveal
      as="article"
      className="panel-hover rounded-2xl border border-border bg-white/[0.02] overflow-hidden flex flex-col h-full md:min-h-[380px]"
    >
      <PanelChrome path={path} right={right} />
      {children}
    </Reveal>
  )
}

function NarrowTile({ path, right, children }: TileProps) {
  return (
    <Reveal
      as="article"
      className="panel-hover rounded-2xl border border-border bg-white/[0.02] overflow-hidden flex flex-col h-full md:min-h-[420px]"
    >
      <PanelChrome path={path} right={right} />
      {children}
    </Reveal>
  )
}

function BigBody({
  title,
  text,
  children,
}: {
  title: ReactNode
  text: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-8 p-7">
      <div className="flex flex-col justify-center md:max-w-[52%]">
        <h3
          className="leading-[1.15] text-foreground"
          style={{ fontSize: '22px', fontWeight: 400, letterSpacing: '-0.02em' }}
        >
          {title}
        </h3>
        <p
          className="mt-2.5 text-ink-2"
          style={{ fontSize: '13.5px', lineHeight: 1.55, maxWidth: '46ch' }}
        >
          {text}
        </p>
      </div>
      {children && (
        <div className="flex-1 min-w-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

function NarrowBody({
  title,
  text,
  children,
}: {
  title: ReactNode
  text: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col gap-6 p-7">
      <div className="flex flex-col justify-center">
        <h3
          className="leading-[1.15] text-foreground"
          style={{ fontSize: '22px', fontWeight: 400, letterSpacing: '-0.02em' }}
        >
          {title}
        </h3>
        <p
          className="mt-2.5 text-ink-2"
          style={{ fontSize: '13.5px', lineHeight: 1.55, maxWidth: '46ch' }}
        >
          {text}
        </p>
      </div>
      {children && (
        <div className="flex-1 min-w-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Visualizations — inline SVG / CSS, no images.
   Source: Ori-landing.html lines 1206-1339 (.viz contents per panel).
   ────────────────────────────────────────────────────────────────────────── */

function KeypadViz() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
  return (
    <div className="w-full max-w-[280px]">
      <div className="tabular-nums text-[44px] font-medium tracked-tight leading-none mb-4 text-center font-mono">
        <span className="text-ink-3 text-[22px] align-[0.15em] mr-0.5">$</span>42
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <div
            key={k}
            className="aspect-[1.6/1] rounded-xl bg-white/[0.03] border border-border flex items-center justify-center text-[18px] font-medium font-mono"
          >
            {k}
          </div>
        ))}
      </div>
    </div>
  )
}

function GiftViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-5 w-full max-w-[300px] text-center">
      <div className="inline-block text-[10px] uppercase tracking-[0.16em] text-ink-3 font-mono">
        For you
      </div>
      <div className="mt-2 tabular-nums text-[36px] font-medium tracked-tight font-mono">
        <span className="text-ink-3 text-[18px] align-[0.15em] mr-0.5">$</span>50
      </div>
      <div className="mt-1 text-[12px] text-ink-2 font-serif">happy birthday, m</div>
    </div>
  )
}

function TerminalViz() {
  return (
    <div className="rounded-xl border border-border bg-black/50 p-4 w-full max-w-[320px] text-[11.5px] font-mono leading-[1.7]">
      <div>
        <span className="text-ink-4">›</span> tip alice.init 5 USD
        <span className="text-ink-4"> — &ldquo;for the stream&rdquo;</span>
      </div>
      <div className="text-ink-4">resolving .init → 0xc2…8d</div>
      <div className="text-ink-4">signing with grant · 24h</div>
      <div className="text-[var(--color-success)]">✓ landed · 94ms · 0xa1…f7</div>
      <div>done</div>
    </div>
  )
}

function StreamViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[300px] text-[12px]">
      <StreamRow l="per second" v="$0.0139" />
      <StreamRow l="elapsed" v="00:48:12" />
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full w-[64%] bg-[var(--color-primary-bright)] rounded-full" />
      </div>
      <div className="mt-3">
        <StreamRow l="streamed" v="$40.19" />
      </div>
    </div>
  )
}

function StreamRow({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-ink-3">{l}</span>
      <span className="tabular-nums font-medium font-mono">{v}</span>
    </div>
  )
}

function PredictViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[300px]">
      <div className="flex items-center justify-between text-[11px] font-mono text-ink-3">
        <span>BTC / USD</span>
        <span className="tabular-nums">98,214</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-lg py-2 text-[12px] font-medium bg-[var(--color-success)]/10 border border-[var(--color-success)]/40 text-[var(--color-success)]"
        >
          Higher 60s
        </button>
        <button
          type="button"
          className="rounded-lg py-2 text-[12px] font-medium bg-white/[0.03] border border-border text-ink-2"
        >
          Lower 60s
        </button>
      </div>
      <div className="mt-3 text-[11px] text-ink-3 font-mono">pool · 12.4k ORI</div>
    </div>
  )
}

function PaywallViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[300px]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
        Locked · research/slow-rain
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="tabular-nums text-[22px] font-medium tracked-tight font-mono">
          <span className="text-ink-3 text-[13px] align-[0.1em] mr-0.5">$</span>1.00
        </div>
        <button
          type="button"
          className="rounded-full px-3 h-7 text-[12px] font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
        >
          Unlock
        </button>
      </div>
    </div>
  )
}

function CapsViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[300px]">
      <div className="flex items-center justify-between text-[11px] font-mono text-ink-3">
        <span>agent.claude</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          active
        </span>
      </div>
      <div className="mt-3 text-[13px] text-ink-2">Daily cap</div>
      <div className="mt-1 tabular-nums text-[22px] font-medium tracked-tight font-mono">
        50 <span className="text-ink-3 text-[13px] align-[0.1em]">ORI</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full w-[26%] bg-[var(--color-primary-bright)] rounded-full" />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-3 font-mono">
        <span>13 spent</span>
        <span>37 left</span>
      </div>
    </div>
  )
}
