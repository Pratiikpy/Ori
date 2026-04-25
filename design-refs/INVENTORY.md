# INVENTORY — every section, component, interaction in `Ori-landing.html`

Source: `design-refs/source/Ori-landing.html` (1783 lines, single file).
This is the reference's structural inventory. Per §10 / Phase 0.

## Document order (top → bottom)

1. **`<head>`** (lines 1–9) — viewport meta, Google Fonts preconnect + family link
2. **`<style>`** (lines 10–1066) — all design tokens, components, animations, layout
3. **`<body>`** (lines 1067–1781) — markup
4. **`<script>`** (lines ~1742–1781) — IntersectionObserver reveal + keypad scale-on-click

## Sections (in scroll order)

### `.topbar` (sticky)
- Brand lockup: ringed circle SVG + "Ori" with serif `O`
- Nav links: Capabilities / Flow / Creators / System
- Launch CTA: pill, 1px border, arrow translates 2px on hover
- Sticky, `backdrop-filter: blur(20px) saturate(1.4)`, gradient bg, 1px bottom hairline

### Hero `<section>`
- `.hero-tag` — pulsing green ok-dot pill: "Now on Initia · v0.1"
- `<h1.hero-title>` — Geist 400, italic-serif accent on "move", `clamp(42px, 7.2vw, 104px)`, line-height 0.98, letter-spacing -0.045em, max-width 14ch
- `.hero-sub` — `clamp(16px, 1.35vw, 19px)`, `--ink-2`, max 52ch
- `.hero-actions` — Open the app (white pill) + See it work (ghost outline)
- `.device-wrap` — phone mockup column

### Hero device mockup (`.device`)
- 9/19.5 aspect, 44px radius, 10px padding, indigo glow shadow stack
- `.device::before` — pillbox notch, top:22px, 90×24, black, radius 999
- `.device-screen` — bg `--bg-2`, 36px inner radius
- `.chat-header` — 54px top padding (clear notch), avatar M, "mira.init" + "typing…" mono, blur backdrop
- `.chat-body` — vertical chat with msgs in/out + animated `.pay-card` (`@keyframes card-in`)
- `.pay-card` — mono $16.20, "Sent · mira.init" eyebrow, success check + meta
- `.chat-input` — pill input + send button

### Stats ribbon (`.stats`)
- 4-col grid, top + bottom 1px lines, 32px vertical pad
- Values: `97` / `1` / `0` / `e2e`, with `.sfx` units (ms, %)
- Geist Mono, tabular-nums, weight 500, letter-spacing -0.03em

### Section 01 · Capabilities (`#capabilities`)
- `.section-head` — eyebrow "01 · Capabilities" + section-title with serif accent + section-sub
- `.cap-grid` — 8 OS-window panels in mixed grid (1.4fr/1fr top row, 3-col rows after)
- Each `.panel`:
  - `.panel-chrome` — 3 traffic-light dots + mono `/path` + right mono label
  - `.panel-body` — `.h` (22px display) + `.p` (13.5px ink-2) + `.viz` mock content
- Mock content: keypad ($42 with blinking cursor), identity network SVG, gift card, terminal, stream progress, BTC predict, paywall, agent caps

### Section 02 · Flow (`#flow`)
- Section-head: "A single gesture from *conversation* to settled."
- `.flow-stage` — 3-column grid at desktop, stacks below
- 3 OS-style `.window` panels:
  - **WinChats** — search row (⌘K kbd) + 6 chat-item rows with avatar gradient, name, time, preview, badge
  - **WinThread** — thread head (avatar + name + status) + msgs in/out + `.pay-card` landed at 97ms + input row
  - **WinSend** — recipient row + giant `$16.20` mono + `.keypad` 3×4 + Send CTA pill

### Section 03 · Creators (`#agents`)
- Section-head: "A profile, a tip jar, and *a stage*."
- `.profile` — Linktree-style mira.init mock
  - Cover band (indigo gradient)
  - `.profile-head` — xl 104px avatar with verified badge SVG + serif name + role + mono address
  - Bio paragraph
  - `.stats-row` — 3 stats with vertical 1px dividers ($4,280 / 128 / 2.1k)
  - `.tip-bar` — `.chip`s ($1, $5 accent, $10, $25, custom) + Send tip button
  - `.lt-link`s — full-width row links (Latest film, Instagram, Unlock $3, Subscribe $9)
  - `.profile-tabs` — Activity / Tips / Subs
  - `.feed` — 5 activity items (avatar + text + mono amount + time)

### Section 04 · Philosophy (`#philosophy`)
- Section-head: "*The restraint* is the product."
- 3-column grid: 01 Quiet by default / 02 Fast enough to feel native / 03 Built to hand off
- Each: `/01` mono kicker + `.h` headline (with serif accent) + `.p`

### Section 05 · System (`#system`)
- Section-head: "The pieces that *make* the whole."
- 4-card design-system grid (DSGrid):
  - Type swatches
  - Color swatches (--bg, --surface, --line, --ink, --accent, --ok)
  - Radii row (6 / 10 / 14 / 20 / 28)
  - Motion easings demo

### Footer
- 4-column grid: Brand block + Product / Developers / Legal columns (FooterCol)
- Bottom strip: © Ori — all quiet · "Built on bridged INIT. No token launch." · pulsing green dot + "all systems green"

## Animations (keyframes used)

| Name | Where | Effect |
|---|---|---|
| `pulse` | hero-tag dot | breathing ring shadow |
| `ring-pulse` | avatar.ring | scaling indigo ring |
| `blink` | keypad cursor | 1s blink |
| `card-in` | pay-card | spring entry from y:8, scale:0.96 |
| `fill-up` | stream progress | width 10%→68% |
| `slide` | not visible — find in source | lateral slide |
| `.reveal` | every section | opacity 0→1 + y 20→0 over 0.9s ease-out, IntersectionObserver |

## Interactions (from `<script>` block, lines ~1742–1781)

- `.reveal` IO with threshold 0.15 + rootMargin -10% bottom — adds `.in` once
- Keypad keys: `.key.click` Web Animations API `scale(0.92)` on pointerdown
- Device parallax: mousemove `transform: rotateY()` with damped values, gated `matchMedia('(hover: hover)')`

## Token surface (from `:root`, lines 11–62 approx)

Surface, ink, accent, semantic, type stacks, radii, spacing, motion easings — all
listed verbatim in `TOKENS.md` (Phase 1 Agent 1 output).

## Standalone (`Ori_-_standalone.html`)

184 lines with one ~57k-char line. **Distinct copy** from landing.html:
- Hero: "Messages that move money. *And the agents that move it for you.*"
- Different stats: 100ms / $0.002 / 24
- 5 capability tiles instead of 8 (different copy: "Pay a name, not an address.", "One name. One graph. One you.", "Gift cards in chat.", "Pay by the second.", "Paywalls agents can pay.")
- Flow shows ONE big window ("A whole app, in one window."), not three
- 3-col Philosophy: One surface. / Speed you don't notice. / Agents as citizens.
- No System section, no separate Today, no full Creators page

The standalone is **an alternate version**, not a multi-page bundle.
Per `DECISIONS.md` (Phase 2): we anchor on `Ori-landing.html` for visual
fidelity and use `Ori_-_standalone.html` only as a content sanity check.
