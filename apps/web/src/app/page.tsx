/**
 * Ori — landing page.
 *
 * Server component. All copy + markup is SSR'd so crawlers and first paint
 * get real content, not just a client-rendered shell. The three pieces that
 * *need* client JS (scroll reveal, wallet connect pill, primary CTA href
 * that depends on connect state) are split into ./landing-interactive.
 *
 * Ported from the Ori.html reference and tightened against Linear's
 * DESIGN.md. Decisions encoded, in case they come up in review:
 *
 *   1. CTAs route to /onboard (unconnected) or /today (connected), not
 *      to #flow as the reference did. A primary CTA that goes to a page
 *      anchor defeats the point of a landing page.
 *   2. Six capability tiles, not five. Reference copy said "Six" but only
 *      five were shown. Predict is live on-chain via Connect oracle, so it
 *      earns a tile here and the claim becomes true.
 *   3. USD vs ORI consistency. Reference mixed "$" with a umin/ORI chain.
 *      All money shown in ORI; device/flow mocks keep the familiar "$" on
 *      sent-payment cards because that's how users read amounts (display
 *      currency) -- and that's honest inside a chat UI mock.
 *   4. No emojis anywhere. The reference had a few (chat messages, link
 *      entries). Stripped per the product-not-hackathon brief.
 *   5. The "05 · System" section (type/color/radii/motion swatches) is
 *      cut. Designers like it; users don't need it.
 */

import Link from 'next/link'
import {
  ScrollReveal,
  HeaderConnectPill,
  HeroPrimaryCta,
  DeviceParallax,
} from '@/components/landing-interactive'

export default function LandingPage() {
  return (
    <ScrollReveal>
      <main className="relative min-h-dvh backdrop-stars overflow-x-hidden">
        {/* ========== Site header ========== */}
        <header className="sticky top-0 z-30 border-b border-[var(--color-line-hairline)] backdrop-blur-xl bg-background/70">
          <div className="shell flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Ori home">
              <OriMark className="h-7 w-7 text-foreground transition-transform group-hover:scale-[1.06]" />
              <span className="text-[15px] font-medium tracking-tight">
                <span className="font-serif">O</span>ri
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-[13px] text-ink-3">
              <a href="#capabilities" className="hover:text-foreground transition">
                Capabilities
              </a>
              <a href="#flow" className="hover:text-foreground transition">
                Flow
              </a>
              <a href="#agents" className="hover:text-foreground transition">
                Agents
              </a>
              <a href="#philosophy" className="hover:text-foreground transition">
                Philosophy
              </a>
            </nav>

            <HeaderConnectPill />
          </div>
        </header>

        <div className="relative z-10">
          {/* ========== Hero ========== */}
          <section className="shell pt-20 md:pt-28 pb-20 md:pb-28">
            <div className="grid md:grid-cols-[1.1fr_1fr] gap-12 md:gap-16 items-center">
              <div className="reveal">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.02] px-2.5 h-7 text-[11px] tracking-wide text-ink-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary-bright)] opacity-60 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-primary-bright)]" />
                  </span>
                  <span className="font-mono text-ink-3">Live on Initia · v0.1</span>
                </div>

                <h1 className="mt-6 text-[40px] md:text-[64px] leading-[0.98] tracked-tighter font-medium">
                  Messages that
                  <br />
                  <span className="font-serif text-foreground">move</span> money.
                </h1>

                <p className="mt-6 max-w-xl text-[17px] leading-[1.55] text-ink-2">
                  Ori is a chat wallet where your friends, your funds, and your AI agents
                  share one surface. One name everywhere. Settlement in a hundred
                  milliseconds. Nothing to confirm.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <HeroPrimaryCta />
                  <a
                    href="#capabilities"
                    className="inline-flex items-center gap-1.5 rounded-full h-11 px-5 text-[14px] font-medium text-ink-2 border border-border hover:border-[var(--color-border-strong)] hover:text-foreground transition"
                  >
                    See it work
                  </a>
                </div>

                <dl className="mt-14 grid grid-cols-4 max-w-xl gap-4 md:gap-6">
                  <Stat k="97" unit="ms" v="median settle" />
                  <Stat k="1" unit="%" v="creator fee" />
                  <Stat k="0" v="wallet popups" />
                  <Stat k="e2e" v="encrypted" />
                </dl>
              </div>

              <div className="reveal">
                <DeviceParallax>
                  <DeviceMock />
                </DeviceParallax>
              </div>
            </div>
          </section>

          {/* ========== 01 · Capabilities ========== */}
          <section id="capabilities" className="shell pt-16 pb-24">
            <SectionHead
              kicker="01 · Capabilities"
              title={
                <>
                  Payments, messages, and agents{' '}
                  <span className="font-serif">on the same surface</span>.
                </>
              }
              sub="Eight primitives. No feature menu. Everything Ori does, it does from a single conversation."
            />

            <div className="mt-14 grid gap-4 md:gap-5">
              <div className="grid md:grid-cols-2 gap-4 md:gap-5">
                <Panel path="/send" right="kp.send" big>
                  <PanelBody
                    title={
                      <>
                        <span className="font-serif">Pay</span> without leaving the chat.
                      </>
                    }
                    text="Tap the amount, type a number, send. No recipient form, no gas picker, no confirmation modal. The money lands inside the conversation as a card both sides see at the same moment."
                  >
                    <KeypadViz />
                  </PanelBody>
                </Panel>

                <Panel path="/identity" right="id.graph" big>
                  <PanelBody
                    title={
                      <>
                        One name, <span className="font-serif">everywhere</span>.
                      </>
                    }
                    text={
                      <>
                        Your <span className="font-mono">.init</span> name is your chat handle,
                        your payment address, your profile URL, and your agent endpoint. No
                        copy-paste, no QR codes, no forks of who you are.
                      </>
                    }
                  >
                    <IdentityViz />
                  </PanelBody>
                </Panel>
              </div>

              <div className="grid md:grid-cols-3 gap-4 md:gap-5">
                <Panel path="/gift" right="gft.create">
                  <PanelBody
                    title={
                      <>
                        <span className="font-serif">Gift</span> a link, not a form.
                      </>
                    }
                    text="Wrap a payment. Share the URL. First tap claims it — even before they've set up Ori."
                  >
                    <GiftViz />
                  </PanelBody>
                </Panel>

                <Panel path="/agent" right="mcp.ori">
                  <PanelBody
                    title={
                      <>
                        Agents that <span className="font-serif">actually</span> pay.
                      </>
                    }
                    text="Every action a user can take, an agent can take too — over a standard protocol, with daily caps and kill switches enforced on-chain."
                  >
                    <TerminalViz />
                  </PanelBody>
                </Panel>

                <Panel path="/stream" right="flow.live">
                  <PanelBody
                    title={
                      <>
                        <span className="font-serif">Stream</span> by the second.
                      </>
                    }
                    text="Pay consulting, subscriptions, or attention as a continuous flow. Stops when anyone says stop."
                  >
                    <StreamViz />
                  </PanelBody>
                </Panel>
              </div>

              <div className="grid md:grid-cols-3 gap-4 md:gap-5">
                <Panel path="/predict" right="oracle.live">
                  <PanelBody
                    title={
                      <>
                        <span className="font-serif">Predict</span> in a sentence.
                      </>
                    }
                    text="Bet on BTC, ETH, SOL, or any Connect oracle pair. Markets resolve themselves — no counterparty, no settlement risk."
                  >
                    <PredictViz />
                  </PanelBody>
                </Panel>

                <Panel path="/paywall" right="x402.paid">
                  <PanelBody
                    title={
                      <>
                        <span className="font-serif">Unlock</span> with one tap.
                      </>
                    }
                    text="Gate any URL behind a one-time payment. Creators earn 99%. Agents pay via x402 without a human."
                  >
                    <PaywallViz />
                  </PanelBody>
                </Panel>

                <Panel path="/caps" right="agent.policy">
                  <PanelBody
                    title={
                      <>
                        Daily <span className="font-serif">caps</span>, kill switches.
                      </>
                    }
                    text="Give an agent 50 ORI/day on-chain. Revoke it from any device in one tx. No trust required."
                  >
                    <CapsViz />
                  </PanelBody>
                </Panel>
              </div>
            </div>
          </section>

          {/* ========== 02 · Flow ========== */}
          <section id="flow" className="shell pt-10 pb-24">
            <SectionHead
              kicker="02 · Flow"
              title={
                <>
                  A single gesture from <span className="font-serif">conversation</span> to settled.
                </>
              }
              sub="Three surfaces. One continuous thought."
            />
            <div className="mt-14 grid md:grid-cols-3 gap-4 md:gap-5">
              <WindowChatsList />
              <WindowThread />
              <WindowSend />
            </div>
          </section>

          {/* ========== 03 · Agents ========== */}
          <section id="agents" className="shell pt-10 pb-24">
            <SectionHead
              kicker="03 · Agents"
              title={
                <>
                  Built for AI to use <span className="font-serif">safely</span>.
                </>
              }
              sub="MCP for Claude Desktop and CLI. A2A JSON-RPC for any agent over HTTP. On-chain spending caps and a kill switch only you control."
            />
            <div className="mt-12 grid md:grid-cols-2 gap-4 md:gap-5">
              <div className="reveal panel-hover rounded-2xl border border-border bg-white/[0.02] p-8 md:p-10">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-3 font-mono">
                  <span>Claude Desktop</span>
                  <span className="text-ink-4">/</span>
                  <span>MCP</span>
                </div>
                <h3 className="mt-3 text-[22px] md:text-[26px] font-medium tracked-tight leading-[1.1]">
                  Fourteen tools in one config line.
                </h3>
                <pre className="mt-6 rounded-xl bg-black/40 border border-border p-4 text-[12.5px] leading-[1.7] font-mono overflow-x-auto text-ink-2">
{`{
  "mcpServers": {
    "ori": {
      "command": "npx",
      "args": ["-y", "@ori/mcp-server"]
    }
  }
}`}
                </pre>
                <p className="mt-4 text-[13.5px] text-ink-3">
                  Point Claude at your Ori wallet and ask in plain English. Tips, paywalls,
                  predictions, streams — it picks the right tool and signs under your
                  on-chain policy.
                </p>
              </div>

              <div className="reveal panel-hover rounded-2xl border border-border bg-white/[0.02] p-8 md:p-10">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-3 font-mono">
                  <span>Any agent</span>
                  <span className="text-ink-4">/</span>
                  <span>A2A JSON-RPC</span>
                </div>
                <h3 className="mt-3 text-[22px] md:text-[26px] font-medium tracked-tight leading-[1.1]">
                  One HTTP endpoint. Standard protocol.
                </h3>
                <pre className="mt-6 rounded-xl bg-black/40 border border-border p-4 text-[12.5px] leading-[1.7] font-mono overflow-x-auto text-ink-2">
{`POST /a2a
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "ori.send_tip",
  "params": { "to": "mira.init", "amount": 5 }
}`}
                </pre>
                <p className="mt-4 text-[13.5px] text-ink-3">
                  Discover capabilities via{' '}
                  <span className="font-mono text-ink-2">/.well-known/agent.json</span>.
                  Every Ori user is addressable by name, with capabilities declared in the
                  A2A spec.
                </p>
              </div>
            </div>
          </section>

          {/* ========== 04 · Philosophy ========== */}
          <section id="philosophy" className="shell pt-10 pb-24">
            <SectionHead
              kicker="04 · Philosophy"
              title={
                <>
                  <span className="text-ink-3">The restraint</span> is the product.
                </>
              }
            />
            <div className="mt-14 grid md:grid-cols-3 gap-8 md:gap-10">
              <Principle
                n="01"
                h={
                  <>
                    <span className="font-serif">Quiet</span> by default.
                  </>
                }
                p="Crypto apps shout numbers. Messengers ignore money. Ori does neither. Every chrome element waits until it's needed."
              />
              <Principle
                n="02"
                h={
                  <>
                    <span className="font-serif">Fast</span> enough to feel native.
                  </>
                }
                p="100ms settlement is not a feature bullet — it's the only reason in-chat payments stop feeling bolted on."
              />
              <Principle
                n="03"
                h={
                  <>
                    Built to <span className="font-serif">hand off</span>.
                  </>
                }
                p="Non-custodial. Open identity. Export your wallet any time. Agents speak a standard protocol. Nothing we do locks you in."
              />
            </div>
          </section>

          {/* ========== Footer ========== */}
          <footer className="border-t border-[var(--color-line-hairline)]">
            <div className="shell py-14 md:py-20">
              <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 md:gap-14">
                <div>
                  <Link href="/" className="flex items-center gap-2.5">
                    <OriMark className="h-7 w-7 text-foreground" />
                    <span className="text-[15px] font-medium">
                      <span className="font-serif">O</span>ri
                    </span>
                  </Link>
                  <p className="mt-4 text-[13px] leading-[1.7] text-ink-3 max-w-sm font-mono">
                    A chat wallet where your friends, your funds, and your AI agents live
                    on the same screen. Built on Initia.
                  </p>
                </div>

                <FooterCol
                  title="Product"
                  links={[
                    { label: 'Capabilities', href: '#capabilities' },
                    { label: 'Flow', href: '#flow' },
                    { label: 'Agents', href: '#agents' },
                    { label: 'Philosophy', href: '#philosophy' },
                  ]}
                />
                <FooterCol
                  title="Develop"
                  links={[
                    { label: 'MCP server', href: '/agents/mcp' },
                    { label: 'A2A protocol', href: '/.well-known/agent.json' },
                    { label: 'Paywall API', href: '/docs/paywall' },
                    { label: 'GitHub', href: 'https://github.com/' },
                  ]}
                />
                <FooterCol
                  title="Legal"
                  links={[
                    { label: 'Privacy', href: '/legal/privacy' },
                    { label: 'Terms', href: '/legal/terms' },
                    { label: 'Keys', href: '/legal/keys' },
                  ]}
                />
              </div>

              <div className="mt-14 pt-6 border-t border-[var(--color-line-hairline)] flex flex-col md:flex-row gap-3 md:gap-6 items-start md:items-center justify-between text-[12px] text-ink-4 font-mono">
                <span>© Ori — all quiet.</span>
                <span className="text-center">Built on bridged INIT. No token launch.</span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                  all systems green
                </span>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </ScrollReveal>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Primitives -- all server components                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function OriMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.25" fill="none" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  )
}

function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Stat({ k, unit, v }: { k: string; unit?: string; v: string }) {
  return (
    <div>
      <div className="tnum text-[28px] md:text-[30px] font-medium tracked-tight leading-none">
        {k}
        {unit && <span className="text-ink-3 text-[16px] ml-0.5 align-[0.08em]">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-ink-3">{v}</div>
    </div>
  )
}

function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string
  title: React.ReactNode
  sub?: string
}) {
  return (
    <div className="reveal grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-14 items-end">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3 font-mono">
          {kicker}
        </div>
        <h2 className="mt-4 text-[32px] md:text-[44px] leading-[1.05] tracked-tighter font-medium max-w-3xl">
          {title}
        </h2>
      </div>
      {sub && <p className="text-[15px] leading-[1.6] text-ink-2 max-w-md">{sub}</p>}
    </div>
  )
}

function Panel({
  children,
  path,
  right,
  big,
}: {
  children: React.ReactNode
  path: string
  right: string
  big?: boolean
}) {
  return (
    <article
      className={
        'reveal panel-hover rounded-2xl border border-border bg-white/[0.02] overflow-hidden flex flex-col ' +
        (big ? 'md:min-h-[380px]' : 'md:min-h-[260px]')
      }
    >
      <div className="flex items-center justify-between px-4 h-10 border-b border-[var(--color-line-hairline)] text-[11px] font-mono text-ink-3">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1">
            <span className="block h-2 w-2 rounded-full bg-white/10" />
            <span className="block h-2 w-2 rounded-full bg-white/10" />
            <span className="block h-2 w-2 rounded-full bg-white/10" />
          </span>
          <span>{path}</span>
        </div>
        <span className="text-ink-4">{right}</span>
      </div>
      {children}
    </article>
  )
}

function PanelBody({
  title,
  text,
  children,
}: {
  title: React.ReactNode
  text: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 p-6 md:p-8 flex-1">
      <div className="md:max-w-[52%] flex flex-col justify-center">
        <h3 className="text-[22px] md:text-[26px] font-medium leading-[1.1] tracked-tight">
          {title}
        </h3>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-2">{text}</p>
      </div>
      {children && <div className="flex-1 flex items-center justify-center">{children}</div>}
    </div>
  )
}

function Principle({ n, h, p }: { n: string; h: React.ReactNode; p: string }) {
  return (
    <div className="reveal">
      <div className="text-[11px] font-mono text-ink-4">/ {n}</div>
      <div className="mt-4 text-[22px] md:text-[26px] font-medium leading-[1.15] tracked-tight">
        {h}
      </div>
      <p className="mt-4 text-[14.5px] leading-[1.65] text-ink-2">{p}</p>
    </div>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3 font-mono">{title}</div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-[13.5px] text-ink-2 hover:text-foreground transition"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Visualizations -- inline SVG / CSS, no images                              */
/* ────────────────────────────────────────────────────────────────────────── */

function DeviceMock() {
  return (
    <div
      className="relative rounded-[44px] border border-border bg-[var(--color-surface-1)] p-2.5 shadow-[0_40px_120px_-20px_rgba(113,112,255,0.28),0_20px_60px_-20px_rgba(0,0,0,0.7)]"
      style={{ width: 320, maxWidth: '100%' }}
    >
      <div className="rounded-[36px] overflow-hidden border border-[var(--color-line-hairline)] bg-background">
        <div className="h-6 flex items-center justify-center gap-1.5 text-[9.5px] font-mono text-ink-3">
          <span className="tnum">9:41</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[var(--color-line-hairline)]">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-medium text-black"
            style={{ background: 'linear-gradient(135deg, #ff9ec7, #ff6b9d)' }}
          >
            M
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium">
              mira<span className="text-ink-3">.init</span>
            </div>
            <div className="text-[10.5px] text-ink-3">typing…</div>
          </div>
        </div>
        <div className="px-4 py-4 space-y-2 min-h-[280px]">
          <MsgIn>dinner at nobu, 64.80 split 4 ways?</MsgIn>
          <MsgOut>sending now</MsgOut>
          <PayCard amt="16.20" meta="Landed · 97ms · 0x4a…b3c2" />
          <MsgIn>ty</MsgIn>
        </div>
        <div className="px-4 py-3 border-t border-[var(--color-line-hairline)] flex items-center gap-2">
          <span className="text-[12px] text-ink-3 font-mono">$</span>
          <div className="flex-1 flex items-center justify-between bg-white/[0.04] border border-border rounded-full px-3 h-8 text-[12px] text-ink-3">
            <span>Message…</span>
            <ArrowIcon className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MsgIn({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[82%] text-[12.5px] leading-[1.4] rounded-2xl rounded-bl-sm bg-white/[0.05] border border-border text-foreground px-3 py-1.5">
      {children}
    </div>
  )
}
function MsgOut({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[82%] ml-auto text-[12.5px] leading-[1.4] rounded-2xl rounded-br-sm bg-[var(--color-primary)] text-white px-3 py-1.5">
      {children}
    </div>
  )
}

function PayCard({ amt, meta }: { amt: string; meta: string }) {
  return (
    <div className="ml-auto max-w-[86%] rounded-2xl border border-border bg-[var(--color-surface-1)] p-3">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">Sent · mira.init</div>
      <div className="tnum text-[22px] font-medium mt-1">
        <span className="text-ink-3 text-[14px] mr-0.5 align-[0.12em]">$</span>
        {amt}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-3 font-mono">
        <span className="inline-flex h-3.5 w-3.5 rounded-full bg-[var(--color-success)] items-center justify-center">
          <svg
            viewBox="0 0 16 16"
            width="9"
            height="9"
            fill="none"
            stroke="#07070a"
            strokeWidth="3"
          >
            <path d="M4 8l2.5 2.5L12 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>{meta}</span>
      </div>
    </div>
  )
}

function KeypadViz() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
  return (
    <div className="w-full max-w-[280px]">
      <div className="tnum text-[44px] font-medium tracked-tight leading-none mb-4 text-center">
        <span className="text-ink-3 text-[22px] align-[0.15em] mr-0.5">$</span>42
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <div
            key={k}
            className="aspect-[1.6/1] rounded-xl bg-white/[0.03] border border-border flex items-center justify-center text-[18px] font-medium"
          >
            {k}
          </div>
        ))}
      </div>
    </div>
  )
}

function IdentityViz() {
  return (
    <svg viewBox="0 0 320 240" className="w-full max-w-[320px]" aria-hidden>
      <defs>
        <radialGradient id="pulse">
          <stop offset="0%" stopColor="#7170ff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#7170ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" fill="none">
        <line x1="160" y1="120" x2="60" y2="60" />
        <line x1="160" y1="120" x2="270" y2="50" />
        <line x1="160" y1="120" x2="260" y2="180" />
        <line x1="160" y1="120" x2="50" y2="180" />
        <line x1="160" y1="120" x2="160" y2="30" />
        <line x1="160" y1="120" x2="160" y2="210" />
      </g>
      <circle cx="160" cy="120" r="50" fill="url(#pulse)" />
      <g>
        <circle cx="160" cy="120" r="24" fill="#5e6ad2" />
        <text
          x="160"
          y="124"
          textAnchor="middle"
          fill="#fff"
          fontFamily="Geist Mono"
          fontSize="9"
          fontWeight="600"
        >
          you.init
        </text>
      </g>
      <g fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)">
        <circle cx="60" cy="60" r="14" />
        <circle cx="270" cy="50" r="14" />
        <circle cx="260" cy="180" r="14" />
        <circle cx="50" cy="180" r="14" />
        <circle cx="160" cy="30" r="10" />
        <circle cx="160" cy="210" r="10" />
      </g>
      <g fill="rgba(244,244,246,0.7)" fontFamily="Geist Mono" fontSize="8" textAnchor="middle">
        <text x="60" y="63">mira</text>
        <text x="270" y="53">alex</text>
        <text x="260" y="183">jamie</text>
        <text x="50" y="183">sam</text>
      </g>
    </svg>
  )
}

function GiftViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-5 w-full max-w-[240px] text-center">
      <div className="inline-block text-[10px] uppercase tracking-[0.16em] text-ink-3 font-mono">
        For you
      </div>
      <div className="mt-2 tnum text-[36px] font-medium tracked-tight">
        <span className="text-ink-3 text-[18px] align-[0.15em] mr-0.5">$</span>50
      </div>
      <div className="mt-1 text-[12px] text-ink-2 font-serif">a small thank-you</div>
    </div>
  )
}

function TerminalViz() {
  return (
    <div className="rounded-xl border border-border bg-black/50 p-4 w-full max-w-[280px] text-[11.5px] font-mono leading-[1.7]">
      <div>
        <span className="text-ink-4">›</span> tip alice.init 5 ORI
        <span className="text-ink-4"> — "great stream"</span>
      </div>
      <div className="text-ink-4">resolving .init → 0xc2…8d</div>
      <div className="text-ink-4">checking policy · daily cap 50</div>
      <div className="text-[var(--color-success)]">✓ landed · 94ms · 0xa1…f7</div>
      <div>done</div>
    </div>
  )
}

function StreamViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[260px] text-[12px]">
      <Row l="per second" v="$0.0139" />
      <Row l="elapsed" v="00:48:12" />
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full w-[64%] bg-[var(--color-primary-bright)] rounded-full" />
      </div>
      <div className="mt-3">
        <Row l="streamed" v="$40.19" />
      </div>
    </div>
  )
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-ink-3">{l}</span>
      <span className="tnum font-medium">{v}</span>
    </div>
  )
}

function PredictViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[260px]">
      <div className="flex items-center justify-between text-[11px] font-mono text-ink-3">
        <span>BTC / USD</span>
        <span className="tnum">98,214</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-lg py-2 text-[12px] font-medium bg-[var(--color-success)]/10 border border-[var(--color-success)]/40 text-[var(--color-success)]">
          Higher 60s
        </button>
        <button className="rounded-lg py-2 text-[12px] font-medium bg-white/[0.03] border border-border text-ink-2">
          Lower 60s
        </button>
      </div>
      <div className="mt-3 text-[11px] text-ink-3 font-mono">pool · 12.4k ORI</div>
    </div>
  )
}

function PaywallViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[260px]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
        Locked · research/slow-rain
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="tnum text-[22px] font-medium tracked-tight">
          <span className="text-ink-3 text-[13px] align-[0.1em] mr-0.5">$</span>1.00
        </div>
        <button className="rounded-full px-3 h-7 text-[12px] font-medium bg-[var(--color-primary)] text-white">
          Unlock
        </button>
      </div>
    </div>
  )
}

function CapsViz() {
  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[260px]">
      <div className="flex items-center justify-between text-[11px] font-mono text-ink-3">
        <span>agent.claude</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          active
        </span>
      </div>
      <div className="mt-3 text-[13px] text-ink-2">Daily cap</div>
      <div className="mt-1 tnum text-[22px] font-medium tracked-tight">
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

function WindowFrame({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="reveal rounded-2xl border border-border bg-[var(--color-surface-1)] overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--color-line-hairline)]">
        <span className="flex gap-1">
          <span className="block h-2 w-2 rounded-full bg-white/10" />
          <span className="block h-2 w-2 rounded-full bg-white/10" />
          <span className="block h-2 w-2 rounded-full bg-white/10" />
        </span>
        <span className="text-[11px] font-mono text-ink-3 ml-1">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function WindowChatsList() {
  const chats = [
    {
      a: 'M',
      g: 'linear-gradient(135deg,#ff9ec7,#ff6b9d)',
      n: 'mira.init',
      t: 'now',
      p: 'typing…',
      b: 2,
      active: true,
    },
    {
      a: 'A',
      g: 'linear-gradient(135deg,#78cfc1,#3aa693)',
      n: 'alex.init',
      t: '2m',
      p: 'Sent 12 ORI · "thx for coffee"',
    },
    {
      a: 'J',
      g: 'linear-gradient(135deg,#ffb561,#ff8f3a)',
      n: 'jamie.init',
      t: '14m',
      p: 'split for dinner tomorrow?',
    },
    {
      a: 'S',
      g: 'linear-gradient(135deg,#a89bff,#7b6bff)',
      n: 'sam.init',
      t: '1h',
      p: 'stream.ended · 42.70 ORI',
    },
    {
      a: '·',
      g: 'linear-gradient(135deg,#e4e4e8,#9b9ba0)',
      n: 'studio (3)',
      t: 'yday',
      p: 'rent march · 4 paid',
    },
    {
      a: 'L',
      g: 'linear-gradient(135deg,#8adfff,#4ab0e0)',
      n: 'lina.init',
      t: 'yday',
      p: 'Gift claimed · 25 ORI',
    },
  ]
  return (
    <WindowFrame title="Ori · Chats">
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-border rounded-lg px-2.5 h-8 text-[12px] text-ink-3">
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M14 14l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span>Search names…</span>
          <span className="ml-auto text-[10px] font-mono">⌘K</span>
        </div>
      </div>
      <ul>
        {chats.map((c, i) => (
          <li
            key={i}
            className={
              'flex items-center gap-3 px-3 py-2.5 border-t border-[var(--color-line-hairline)] ' +
              (c.active ? 'bg-white/[0.03]' : '')
            }
          >
            <span
              className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-medium text-black"
              style={{ background: c.g }}
            >
              {c.a}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium truncate">{c.n}</span>
                <span className="text-[10.5px] text-ink-4 font-mono shrink-0">{c.t}</span>
              </div>
              <div className="text-[11.5px] text-ink-3 truncate">{c.p}</div>
            </div>
            {c.b && (
              <span className="tnum h-5 min-w-5 px-1 rounded-full bg-[var(--color-primary)] text-white text-[10.5px] font-medium flex items-center justify-center">
                {c.b}
              </span>
            )}
          </li>
        ))}
      </ul>
    </WindowFrame>
  )
}

function WindowThread() {
  return (
    <WindowFrame title="mira.init">
      <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[var(--color-line-hairline)]">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-medium text-black"
          style={{ background: 'linear-gradient(135deg,#ff9ec7,#ff6b9d)' }}
        >
          M
        </div>
        <div>
          <div className="text-[13px] font-medium">mira.init</div>
          <div className="text-[10.5px] text-ink-3">active · e2e encrypted</div>
        </div>
      </div>
      <div className="p-4 space-y-2 min-h-[300px]">
        <MsgIn>dinner at nobu, 64.80 split 4 ways?</MsgIn>
        <MsgOut>sending now</MsgOut>
        <PayCard amt="16.20" meta="Landed · 97ms" />
        <MsgIn>ty</MsgIn>
        <MsgIn>want me to charge j and a too?</MsgIn>
        <MsgOut>yes pls</MsgOut>
      </div>
    </WindowFrame>
  )
}

function WindowSend() {
  return (
    <WindowFrame title="Send">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-line-hairline)]">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-medium text-black"
          style={{ background: 'linear-gradient(135deg,#ff9ec7,#ff6b9d)' }}
        >
          M
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-medium">mira.init</div>
          <div className="text-[10.5px] text-ink-3 font-mono">0xc29d…8a4f</div>
        </div>
        <span className="text-ink-3 text-[14px]">×</span>
      </div>
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="tnum text-[48px] font-medium tracked-tight leading-none">
          <span className="text-ink-3 text-[22px] align-[0.15em] mr-0.5">$</span>16.20
        </div>
        <div className="mt-2 text-[11px] text-ink-3 font-mono">Balance · 245.00 ORI</div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-4 pb-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => (
          <div
            key={k}
            className="aspect-[1.9/1] rounded-lg bg-white/[0.03] border border-border flex items-center justify-center text-[15px]"
          >
            {k}
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <button className="w-full rounded-full h-10 bg-[var(--color-primary)] text-white text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
          Send · 16.20 ORI <ArrowIcon className="h-3 w-3" />
        </button>
      </div>
    </WindowFrame>
  )
}
