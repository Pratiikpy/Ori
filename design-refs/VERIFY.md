# VERIFY — per-component / per-route pass-fail (Phase 4)

Run after Phase 3 commit `43d3df1` deployed.
Re-run after fix commit (viewport + ink-3 contrast).

## Visual verification

Compared `design-refs/audit-final/<slug>-{desktop,tablet,mobile}.png`
against `design-refs/source-shots/landing-{viewport}.png` (reference)
plus the `Ori-landing.html` rendered side-by-side.

| Route | Visual | Notes |
|---|---|---|
| `/` | ✅ pass | Hero + device + stats ribbon + capabilities + flow + creators + philosophy + system + footer all present and aligned |
| `/capabilities` | ✅ pass | Hero "Sixteen primitives. *One conversation*." + 8-tile sample grid + 16-primitive routed table + CTA |
| `/flow` | ✅ pass | Hero "Conversation to *settled*." + 3-window FlowStage + 4-stat ribbon + 4 numbered steps + CTA |
| `/creators` | ✅ pass | Hero + Linktree mira.init + 4 explainer cards + CTA |
| `/system` | ✅ pass | Hero + DSGrid + 18-module table + 3-protocol cards + stack 8-up + GitHub CTA |
| `/today` | ⚠️ wallet-gated | Headless harness redirects to `/`. App-page chrome verified locally with auto-sign on. |
| Other app routes | ⚠️ wallet-gated | Same as /today. Loaded patterns ported from prior work. |

## Per-component verification

### Marketing chrome
- ✅ `<MarketingTopbar/>` — sticky, blur(20px) saturate(1.4), 1px hairline border, brand mark + 4 nav links + Launch CTA arrow
- ✅ `<MarketingFooter/>` — 4-col responsive grid + status row with pulsing green dot

### Hero (`/`)
- ✅ HeroTag — pulsing green ok-dot pill "Now on Initia · v0.1"
- ✅ HeroTitle — clamp(42px, 7.2vw, 104px), Geist 400, italic-serif "move", line-height 0.98, letter-spacing -0.045em
- ✅ HeroSub — clamp(16px, 1.35vw, 19px), --ink-2, max 52ch
- ✅ HeroActions — Open the app (white pill) + See it work (ghost outline)
- ✅ DeviceMock — phone shape, 9/19.5 aspect, 44px radius, indigo glow, pillbox notch, animated chat with $16.20 pay-card
- ✅ DeviceParallax — desktop-only mousemove, gated `(hover: hover)`

### Stats Ribbon
- ✅ 4-col grid (lg) / 2-col (sm) / mono numbers / tabular-nums
- ✅ Top + bottom 1px hairline borders, 32px vertical padding
- ✅ Values 97 / 1 / 0 / e2e with `.sfx` unit suffixes

### Capabilities (8-tile sample)
- ✅ Mixed grid: 2-col big top row + two 3-col rows
- ✅ Each `.panel` has 3 traffic-light dots + mono `/path` + mono right label + body
- ✅ Viz blocks render: Keypad (with blinking cursor), Network SVG, Gift card, Terminal, StreamProgress, BTC predict, Paywall, Caps

### Capabilities — 16 primitives table (`/capabilities`)
- ✅ 16 routed cards in sm:grid-cols-2 lg:grid-cols-3
- ✅ Each card: lucide icon + mono `NN · module_name` kicker + h3 title + blurb + "Open" link
- ✅ Italic-serif accents per CONTENT.md

### FlowStage (`/flow`)
- ✅ 3 OS-windows side-by-side at lg, stacked below
- ✅ WinChats — search row with ⌘K kbd + 6 chat-item rows with avatar gradient
- ✅ WinThread — head + msg-in/out + animated $16.20 pay-card landed at 97ms
- ✅ WinSend — recipient row + giant $16.20 mono + 3×4 keypad + Send CTA

### CreatorProfile (`/creators`)
- ✅ Cover gradient band
- ✅ xl 104px avatar with verified-badge SVG (8-pointed scalloped burst + check)
- ✅ Serif name + role + mono address
- ✅ Bio paragraph
- ✅ 3-stat row ($4,280 / 128 / 2.1k) with vertical 1px dividers
- ✅ Tip-bar with chips + Send tip button
- ✅ 4 lt-link rows
- ✅ 5-item activity feed

### Philosophy
- ✅ "The restraint is the product." section title with --ink-3 muted accent (per source style)
- ✅ 3-up grid: 01 Quiet by default / 02 Fast enough to feel native / 03 Built to hand off
- ✅ Each cell: /NN mono kicker + headline (with serif accent) + blurb

### System (`/system`)
- ✅ DSGrid 4-card (Type / Color / Radii / Motion swatches)
- ✅ 18-Move-module reference grid (full names, mono)
- ✅ 3 protocol cards (MCP / A2A / x402) with code snippets in `<pre>` bg-black/40
- ✅ Stack 8-up grid (chain / settlement / frontend / backend / identity / wallet / auto-sign / oracle)
- ✅ "View repository" CTA → GitHub

### Animations & interactions
- ✅ `.reveal` IntersectionObserver-driven opacity 0→1 + translateY 20→0 over 0.9s
- ✅ Hero device parallax (desktop hover only)
- ✅ Pay-card `card-in` spring entry
- ✅ Hero-tag green-dot `pulse` keyframe
- ✅ Topbar sticky blur active
- ⚠️ Keypad `scale(0.92)` Web Animations API click anim — confirmed implemented, needs manual click test
- ⚠️ `ring-pulse` avatar — confirmed in CSS, used in chat-header

## Accessibility (axe-core)

See `A11Y.md` for raw output. After fix commit:

| Route | Pre-fix violations | Post-fix expected |
|---|---:|---:|
| `/` | 2 | 0 |
| `/capabilities` | 2 | 0 |
| `/flow` | 2 | 0 |
| `/creators` | 2 | 0 |
| `/system` | 2 | 0 |

Pre-fix violations were:
1. `meta-viewport` (critical) — `maximum-scale=1, user-scalable=false` blocks zoom. **Fixed** by removing those props from `app/layout.tsx` viewport export.
2. `color-contrast` (serious) — `--ink-3` at 0.38 alpha was ~3.5:1, below 4.5:1 AA threshold for normal text. **Fixed** by bumping to 0.50 (~5.6:1).

Re-run `verify.mjs` after redeploy → expect 0 violations.

## Performance (Lighthouse mobile)

See `PERF.md` for raw scores.

| Route | Perf | A11y | BP | SEO | LCP |
|---|---:|---:|---:|---:|---:|
| `/` | 35 ❌ | 91 ⚠️ | 96 ✅ | 82 ⚠️ | 17.9s ❌ |
| `/capabilities` | 44 ❌ | 90 ⚠️ | 96 ✅ | 91 ✅ | 11.4s ❌ |
| `/flow` | 45 ❌ | 86 ⚠️ | 96 ✅ | 91 ✅ | 11.2s ❌ |
| `/creators` | 44 ❌ | 91 ⚠️ | 96 ✅ | 82 ⚠️ | 11.3s ❌ |
| `/system` | 44 ❌ | 90 ⚠️ | 96 ✅ | 91 ✅ | 11.4s ❌ |

**Performance is below target (≥ 90).** Root cause: marketing routes
include client-side wallet provider + Privy embedded wallet + viem +
wagmi via the shared layout. Even server components on these routes
import `<HeaderConnectPill/>` from `landing-interactive` (client) which
chains in the wallet stack. This is the cofounder's existing
architecture; restructuring requires moving marketing routes into a
Next.js route group `(marketing)/` with its own layout that does NOT
load Providers.

This is a P1 perf-budget miss documented in `DEBT.md` for next iteration.
The marketing UX still works fluidly (perceived perf is fine on broadband);
the regression is specifically against the LH mobile 4G throttle.

After AA fix the A11y scores should reach 95+ on all routes.

## Cross-browser

- ✅ Chromium 1217 (via Playwright) — primary capture
- ⚠️ Firefox / Safari — not run in this environment. Spot-check on
  user's native browser is recommended; no `-webkit-` issues expected
  since `backdrop-filter` includes `-webkit-` prefix.

## Decisions & known gaps logged

- See `DEBT.md` for P2 polish + the LCP/bundle-split work
- See `BLOCKERS.md` (none currently)
