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
  LiveDeviceChat,
} from '@/components/landing-interactive'

export default function LandingPage() {
  return (
    <ScrollReveal>
      <main className="relative min-h-dvh backdrop-stars overflow-x-hidden">
        {/* ========== Site header ========== */}
        <header
          className="sticky top-0 z-30 border-b border-[var(--color-line-hairline)]"
          style={{
            // Reference spec: blur(20px) WITH saturate(1.4) — the saturation
            // boost makes the starfield behind the navbar read as *colored*
            // rather than gray-washed. Subtle but one of those cues that
            // separates "premium" from "premium-ish".
            backdropFilter: 'blur(20px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
            background:
              'linear-gradient(180deg, rgba(7, 7, 10, 0.86) 0%, rgba(7, 7, 10, 0.6) 100%)',
          }}
        >
          <div className="shell flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Ori home">
              <OriMark className="h-7 w-7 text-foreground transition-transform group-hover:scale-[1.06]" />
              <span className="text-[15px] font-medium tracking-tight">
                <span className="font-serif">O</span>ri
              </span>
            </Link>

            {/* Nav labels match the Ori-landing.html reference copy. The
                sections they point to (#agents, #philosophy) keep their
                existing anchors + content — we rename the LABEL, not the
                section ID, so nothing else in the page needs to move.
                Renaming both labels and IDs would break every deep-link
                already in the wild (twitter cards, docs, etc.). */}
            <nav className="hidden md:flex items-center gap-7 text-[13px] text-ink-3">
              <a href="#capabilities" className="hover:text-foreground transition">
                Capabilities
              </a>
              <a href="#flow" className="hover:text-foreground transition">
                Flow
              </a>
              <a href="#agents" className="hover:text-foreground transition">
                Creators
              </a>
              <a href="#philosophy" className="hover:text-foreground transition">
                System
              </a>
            </nav>

            <HeaderConnectPill />
          </div>
        </header>

        <div className="relative z-10">
          {/* ========== Hero ==========
              Reference spec: padding: clamp(48px, 10vw, 140px) top, 72px
              bottom. Makes the hero consume roughly a full viewport on
              desktop so the headline + device get real breathing room,
              not the cramped "everything in the first fold" layout. */}
          <section
            className="shell"
            style={{
              paddingTop: 'clamp(48px, 10vw, 140px)',
              paddingBottom: '72px',
            }}
          >
            <div className="grid md:grid-cols-[1.05fr_1fr] gap-12 md:gap-16 items-start">
              <div className="reveal">
                {/* Hero tag — green pulse, not indigo. Reference uses --ok
                    because the dot signals "live & healthy", not "new feature". */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-border-strong)] bg-white/[0.022] px-3.5 h-[30px] text-[12px] text-ink-2">
                  <span className="relative inline-flex">
                    <span
                      className="h-[6px] w-[6px] rounded-full bg-[var(--color-success)]"
                      style={{
                        boxShadow: '0 0 0 4px rgba(107, 208, 163, 0.15)',
                        animation: 'ori-hero-pulse 2.4s ease-in-out infinite',
                      }}
                    />
                  </span>
                  <span className="font-mono text-ink-2">Now on Initia · v0.1</span>
                </div>

                {/* Reference hero sizing: clamp(42px, 7.2vw, 104px), font-weight 400,
                    letter-spacing -0.045em. Our type was too small + too heavy — this
                    is the single biggest visual parity move with the reference. */}
                <h1
                  className="mt-10 leading-[0.98] text-foreground"
                  style={{
                    fontSize: 'clamp(42px, 7.2vw, 104px)',
                    fontWeight: 400,
                    letterSpacing: '-0.045em',
                    maxWidth: '14ch',
                  }}
                >
                  Messages that <span className="font-serif">move</span> money.
                </h1>

                <p
                  className="mt-8 leading-[1.55] text-ink-2"
                  style={{
                    fontSize: 'clamp(16px, 1.35vw, 19px)',
                    maxWidth: '52ch',
                  }}
                >
                  Ori is a chat wallet where your friends, your funds, and your AI agents
                  share one surface. One name everywhere. Settlement in a hundred
                  milliseconds. Nothing to confirm.
                </p>

                {/* Reference has no stats inside the hero. That slab was cramped
                    and fought the headline for attention. It now lives in its
                    own framed ribbon after the hero, below. */}
                <div className="mt-11 flex flex-wrap items-center gap-3">
                  <HeroPrimaryCta />
                  <a
                    href="#capabilities"
                    className="inline-flex items-center gap-1.5 rounded-full h-[46px] px-5 text-[14px] font-medium text-ink-2 border border-[var(--color-border-strong)] hover:border-[var(--color-border-emphasis)] hover:text-foreground hover:bg-white/[0.022] transition"
                  >
                    See it work
                  </a>
                </div>
              </div>

              <div className="reveal">
                <DeviceParallax>
                  <DeviceMock />
                </DeviceParallax>
              </div>
            </div>
          </section>

          {/* ========== Stats ribbon ==========
              Reference pattern: top + bottom 1px lines frame the row as a
              distinct slab; mono numbers with a slightly smaller ink-3 unit
              suffix read as "data", not marketing. Full shell-width so the
              rhythm lands cleanly regardless of grid. */}
          <section className="shell">
            <dl
              className="reveal grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10"
              style={{
                paddingTop: '32px',
                paddingBottom: '32px',
                borderTop: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <Stat k="97" unit="ms" v="median settlement" />
              <Stat k="1" unit="%" v="creator tip fee" />
              <Stat k="0" v="wallet popups" />
              <Stat k="e2e" v="encryption by default" />
            </dl>
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
                    big
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
                    big
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
  // Reference pattern: MONO at 28px with a slightly smaller ink-3 suffix
  // for the unit. Tabular-nums keeps the column aligned across stats.
  return (
    <div>
      <div
        className="tnum font-mono text-foreground leading-none"
        style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.03em' }}
      >
        {k}
        {unit && <span className="text-ink-3 text-[20px] ml-0.5">{unit}</span>}
      </div>
      <div className="mt-1 text-[12px] text-ink-3" style={{ letterSpacing: '0.01em' }}>
        {v}
      </div>
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
  // Reference section-title: clamp(28px, 4vw, 48px), weight 400,
  // -0.035em tracking. Thin-tracked Geist at 400 with serif italic accents
  // reads far more editorial than 500 — that's the reference's whole point.
  return (
    <div className="reveal grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-14 items-end">
      <div>
        <div
          className="text-ink-3 font-mono"
          style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {kicker}
        </div>
        <h2
          className="mt-4 leading-[1.05] max-w-3xl"
          style={{
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 400,
            letterSpacing: '-0.035em',
          }}
        >
          {title}
        </h2>
      </div>
      {sub && (
        <p className="text-ink-2" style={{ fontSize: '15px', lineHeight: 1.55, maxWidth: '42ch' }}>
          {sub}
        </p>
      )}
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
        'reveal panel-hover rounded-2xl border border-border bg-white/[0.02] overflow-hidden flex flex-col h-full ' +
        (big ? 'md:min-h-[380px]' : 'md:min-h-[420px]')
      }
    >
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
      {children}
    </article>
  )
}

function PanelBody({
  title,
  text,
  big,
  children,
}: {
  title: React.ReactNode
  text: React.ReactNode
  /** Set on the 2-col big tiles. Big tiles use text-left/viz-right; narrow
      3-col tiles always stack so the viz never collides with the title. */
  big?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={
        'flex-1 flex gap-6 p-7 ' +
        (big ? 'flex-col md:flex-row md:gap-8' : 'flex-col')
      }
    >
      <div
        className={
          'flex flex-col justify-center ' + (big ? 'md:max-w-[52%]' : '')
        }
      >
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
  // Reference device spec — these values are exact so the mock reads as a
  // real phone, not a portrait card. The aspect-ratio 9/19.5 is what makes
  // the silhouette recognizable; the notch (::before pseudo) is what sells
  // it as an iPhone rather than a generic device. The 80px indigo glow
  // below grounds the device against the ambient backdrop — remove it and
  // the phone floats in space.
  return (
    <div
      className="relative border border-[var(--color-border-strong)] mx-auto"
      style={{
        width: '100%',
        maxWidth: '380px',
        aspectRatio: '9 / 19.5',
        background: '#0d0d12',
        borderRadius: '44px',
        padding: '10px',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.03) inset, 0 80px 120px -40px rgba(108, 123, 255, 0.25), 0 40px 80px -20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Dynamic island notch */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 z-10"
        style={{
          top: '22px',
          width: '90px',
          height: '24px',
          background: '#000',
          borderRadius: '999px',
        }}
      />

      <div
        className="overflow-hidden flex flex-col h-full relative"
        style={{
          borderRadius: '36px',
          background: 'var(--color-bg-2)',
        }}
      >
        {/* Status bar — eat the top padding so chat-header sits BELOW the notch */}
        <div
          className="flex items-center gap-2.5 pt-[54px] px-[18px] pb-[14px] border-b border-[var(--color-line-hairline)]"
          style={{
            background: 'rgba(11, 11, 16, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-medium text-black shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff9ec7, #ff6b9d)' }}
          >
            M
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium tracking-[-0.01em]">
              mira<span className="text-ink-3">.init</span>
            </div>
            <div className="text-[11px] font-mono text-ink-3">typing…</div>
          </div>
        </div>
        {/* Hero's beating heart: a looping 5-beat performance of the
            product pitch. Client component; reduced-motion users get the
            full conversation frozen at the final frame. */}
        <LiveDeviceChat />

        {/* Composer bar — reference uses a flat surface-2 pill + a small
            36x36 rounded send-btn. Our old "$ sign + chat pill + arrow"
            combo looked like a hybrid between a payment bar and a chat
            bar; cleaner to separate concerns: typing is what happens
            here, sending happens via a payment card in the stream. */}
        <div className="flex gap-2 items-center px-3 pt-[10px] pb-[28px] border-t border-[var(--color-line-hairline)] mt-auto">
          <div
            className="flex-1 rounded-full text-[12px] text-ink-3 px-[14px] py-[10px] border"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderColor: 'var(--color-border)',
            }}
          >
            Message…
          </div>
          <button
            type="button"
            aria-label="Send message"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center border shrink-0 text-ink-2 hover:text-foreground transition"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderColor: 'var(--color-border-strong)',
            }}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M8 12V4M4 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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
    <div className="rounded-xl border border-border bg-white/[0.03] p-5 w-full max-w-[300px] text-center">
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
    <div className="rounded-xl border border-border bg-black/50 p-4 w-full max-w-[320px] text-[11.5px] font-mono leading-[1.7]">
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
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[300px] text-[12px]">
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
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[300px]">
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
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[300px]">
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
    <div className="rounded-xl border border-border bg-white/[0.03] p-4 w-full max-w-[300px]">
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
  // h-full + flex-col so 3 windows in the Flow grid stretch to equal height,
  // with the body region growing to fill the gap between the chrome and the
  // bottom of the tallest sibling. Each window's intrinsic content keeps its
  // own padding/spacing — only the wrapper aligns the heights.
  return (
    <div className="reveal rounded-2xl border border-border bg-[var(--color-surface-1)] overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-[var(--color-line-hairline)] shrink-0">
        <span className="flex gap-1">
          <span className="block h-2 w-2 rounded-full bg-white/10" />
          <span className="block h-2 w-2 rounded-full bg-white/10" />
          <span className="block h-2 w-2 rounded-full bg-white/10" />
        </span>
        <span className="text-[11px] font-mono text-ink-3 ml-1 truncate">{title}</span>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
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
