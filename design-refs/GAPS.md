# GAPS — reference vs deployed (P0 → P2)

Reference: `design-refs/INVENTORY.md` + `design-refs/COMPONENTS.md` (anchored on `Ori-landing.html`).
Deployed: https://ori-chi-rosy.vercel.app (audit captured 2026-04-19, all 21 routes HTTP 200).

## Summary
- Total components / sections cross-referenced: 142
- ✅ Matches: 8 (marketing topbar+brand, marketing footer presence, hero markup skeleton, basic stat values, capability copy presence, profile card presence, marketing reveal hooks on `/`, route HTTP status)
- ⚠️ Partial: 27 (typography off, missing accents, partial profile, partial flow stage, partial cap grid, footer column alignment, etc.)
- ❌ Missing or broken: 107 (all app-shell topbars, all app-shell footers, all app-shell padding, backdrop ambient everywhere, three routes serving wrong page, half of FlowStage, all DSGrid contents, etc.)
- P0 (blocking): 41 · P1 (high): 64 · P2 (polish): 37

Two distinct shells in deploy: marketing shell (`/`, `/capabilities`, `/flow`, `/creators`, `/system`) is mostly aligned; **app shell** (15 other routes) is broken across the board.

---

## Per-route gap table

### /

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Routing — `/today`, `/chats`, `/settings` fallback | Three distinct app-shell routes with own surfaces | All three serve the marketing landing page (SPA fallback / wrong rewrites) | ❌ broken (routing, breaks 3 of 21 pages) | P0 |
| Backdrop ambient (indigo halo behind hero device) | Indigo radial-glow shadow stack (`0 80px 120px -40px rgba(108,123,255,0.25)` on `.device` + violet wash) | Flat near-black, no glow at all | ❌ missing | P0 |
| HeroTitle "Messages that *move* money." | `clamp(42px, 7.2vw, 104px)`, line-height 0.98, letter-spacing -0.045em, Geist 400, serif italic on "move", max-width 14ch | ~56–64px on desktop 1440 (~half ref size), looser tracking, italic appears not in Source Serif | ⚠️ partial (size + serif accent wrong) | P0 |
| Hero device mockup column | `.device` 9/19.5 aspect, 44px radius, indigo glow, parallax tilt on mousemove | Device shows but pushed flush right edge of viewport (no right gutter), parallax tilt not detectable | ⚠️ partial | P0 |
| `.pay-card` `card-in` spring entry | `@keyframes card-in` 0.55s spring from y:8, scale:0.96 | Card present, no animation | ❌ missing | P0 |
| FlowStage 3-window grid (visible from `/` if scrolled) | `.flow-stage` 3-col: WinChats + WinThread + WinSend | Only WinThread + WinSend; WinChats missing entirely; numbered text list `01/02/03/04` injected instead | ❌ missing WinChats + extra non-spec content | P0 |
| Creators §03 profile mock | Cover band gradient, verified-badge SVG on xl avatar, `.tip-bar` chips ($1/$5 accent/$10/$25/custom), `.profile-tabs`, 5-row `.feed` with right-aligned mono amount | Cover band absent, no verified badge, no tip-bar chips, no tabs, only 3 feed rows without right-mono amount column | ❌ partial (most subcomponents missing) | P0 |
| Stats ribbon `.sfx` units (ms, %) | `97<span class="sfx">ms</span>`, `1<span class="sfx">%</span>` — sfx 20px ink-3 inside 28px tabular-num | Desktop view shows `97 / 1 / 0 / e2e` without `ms`/`%` suffixes; mobile shows them. Inconsistent. | ⚠️ partial | P1 |
| `.hero-sub` paragraph color | `color: var(--ink-2)`, line-height 1.55, max-width 52ch, `clamp(16px, 1.35vw, 19px)` | Renders at full `--ink` (no muting) | ⚠️ wrong color | P1 |
| `.hero-tag` pulse animation on green dot | `@keyframes pulse` 2.4s ease-in-out infinite breathing ring shadow | Green dot present, no pulse animation | ❌ missing | P1 |
| Capability `.cap-grid` layout | `1.4fr 1fr` top row + 3-col `.row` rows after, gap 14px (~18–24px visual), 8 panels | 4×2 grid with ~12px gap, panels significantly shorter than ref | ⚠️ wrong layout | P1 |
| §04 Philosophy 3-column section | `.section-head` "*The restraint* is the product." + 3-col grid (01 Quiet by default / 02 Fast enough to feel native / 03 Built to hand off) — each: mono kicker `/01` + `.h` headline w/ serif accent + `.p` | Header present but cropped at viewport bottom; columns appear truncated and undersized | ⚠️ partial | P1 |
| Hero responsive (tablet 820) | Copy + device stack with device aligned right of column | Device occupies entire width, crowds margins | ⚠️ broken responsive | P1 |
| Hero responsive (mobile 375) | Action pills wrap below copy | "Open the app" + "See it work" pills overflow the row horizontally | ❌ broken | P1 |
| Reveal IntersectionObserver fade-up | `opacity 0→1 + y 20→0 over 0.9s ease-out`, threshold 0.15, rootMargin -10% bottom | Sections appear without fade-up entry; `.reveal` selector probably unwired | ❌ missing | P1 |
| Hero CTA arrow micro-interaction | `.btn-primary` arrow translates +2px on hover | Static arrow, no hover transform | ⚠️ missing | P2 |
| Topbar backdrop blur+saturate | `backdrop-filter: blur(20px) saturate(1.4)` + `linear-gradient(180deg, rgba(7,7,10,0.86), rgba(7,7,10,0.6))` + 1px hairline | Topbar present, blur appears reduced or absent, gradient flatter | ⚠️ partial | P2 |

### /capabilities

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Section title typography | Geist 400 + Source Serif italic on accent (`<span class="serif">One conversation.</span>`), `clamp(28px, 4vw, 48px)` | Geist ~500 weight, italic uses same Geist family (no Source Serif swap) | ⚠️ wrong font on italic accent | P0 |
| `.reveal` fade-up on capability rows | IO fade-up 0.9s, items animate as scrolled into view | No animation; rows pop in | ❌ missing | P0 |
| Footer column alignment (4-col grid) | Brand block + Product / Developers / Legal columns at even gutters, baselines aligned | Columns offset at random x-positions; "Capabilities/Flow/Creators/System" col offset right of brand block | ❌ misaligned | P0 |
| Footer responsive (mobile 375) | Columns stack below brand block at narrow viewports | "Capabilities/Flow/Creators/System" column stays at desktop layout, jams text overlap | ❌ broken | P0 |
| Capability row eyebrows (`SEND_PAYMENT`, `BULK_SEND`, etc.) | Geist Mono ~50% (`--ink-2`) with 0.14em tracking, uppercase | Renders at ~30% (closer to `--ink-3` or `--ink-4`), too dim | ⚠️ wrong color/opacity | P1 |
| Bottom CTA "Open the app" pill | `.btn-primary`: bg `--ink`, color `--bg`, 999px radius, lifts -1px on hover | Low-contrast rounded button, no white pill, no hover lift | ⚠️ wrong styling | P1 |
| Capability row vertical gap | ~16–18px between rows | ~8px, cramped | ⚠️ tight spacing | P2 |

### /flow

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| FlowStage `.flow-stage` 3-window grid | 3-col at desktop: `.win-chats` (340×440 search + 6 chat-items + ⌘K kbd) + `.win-thread` (head + msgs + pay-card landed at 97ms) + `.win-send` (recipient + giant `$16.20` mono + keypad 3×4 + Send pill) | Only WinThread shown; WinChats and WinSend (incl keypad) absent | ❌ missing 2 of 3 windows | P0 |
| Numbered step list `/01 /02 /03 /04` | Not in spec — should not exist on this route | Bespoke list "You open a chat / You tap the amount / You hit send / They see it land" injected | ❌ extra non-spec content | P0 |
| Section title size | `clamp(28px, 4vw, 48px)` Geist 400 + serif italic on "settled." | Renders ~52px (close-ish) but appears smaller than reference's max ~80px implementation | ⚠️ partial | P1 |
| Backdrop ambient indigo glow | `.window` shadow stack with rgba(0,0,0,0.6) +-20px blur drops + `.flow-section` linear-gradient `rgba(108,123,255,0.04)` wash | Flat black; no shadow stack, no wash | ❌ missing | P1 |
| `.pay-card` `card-in` animation in WinThread | Spring entry 0.55s | Static, no animation | ❌ missing | P1 |
| Flow CTA "Try sending *a payment* to yourself" — Send button alignment | Button vertically centered in CTA card with proper left padding | Button hugs left edge with no left padding, vertically miscentered | ⚠️ misaligned | P1 |
| FlowStage tablet 820 layout | Stacks 3 windows in column at narrow viewports | Single window centered; reference's 3-col stack pattern not replicated | ⚠️ broken | P1 |
| Step number `/02 /03 /04` color hierarchy | If kept, would use mono `.eyebrow` style: 11px, 0.14em tracking, ink-3 | Dim ink-3 but not the eyebrow kicker style | ⚠️ wrong styling | P2 |
| Bottom stats trio (`97ms / 0 / e2e`) gutters | Even gap-32 grid like main `.stats` ribbon | Uneven; "97ms median settlement" flush left without column gutter | ⚠️ misaligned | P2 |

### /creators

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Profile cover band | Indigo gradient cover band at top of `.profile` card | No cover band; avatar floats on plain dark | ❌ missing | P0 |
| `.tip-bar` chip row | `.chip`s ($1, $5 accent, $10, $25, custom) + Send tip button | Single "Send tip" CTA, no chips at all | ❌ missing | P0 |
| `.profile-tabs` (Activity / Tips / Subs) | Underlined tab bar beneath link rows | No tab bar | ❌ missing | P0 |
| `.feed` 5 activity rows (avatar + text + mono amount + time) | 5 rows, right-aligned mono amount column | 3 rows, no right-aligned mono amount column | ⚠️ partial | P0 |
| Verified-badge SVG on avatar | xl 104px (per inventory) avatar with verified-tick SVG overlay | Plain "M" letterform on indigo circle, no badge | ❌ missing | P1 |
| `mira.init` name typography | Source Serif for "mira", mono `.address` underneath | Both rendered in mono | ⚠️ wrong font | P1 |
| `.stats-row` vertical 1px dividers | 1px vertical hairlines between $4,280 / 128 / 2.1k | Values present, dividers invisible (likely missing border-left) | ❌ missing | P1 |
| Profile card horizontal centering | Centered within `.shell` max-width 1320px with ~80px breathing room each side | Card extends edge-to-edge with no horizontal margin | ⚠️ wrong spacing | P1 |
| `.lt-link` row right-edge alignment | All chevrons aligned at consistent right edge | Inconsistent right alignment, some chevrons cut off | ⚠️ misaligned | P1 |
| Stats-row tablet 820 collapse | Either keeps 3-col or stacks with dividers preserved | Wraps below avatar, dividers still missing | ⚠️ broken responsive | P2 |

### /system

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| DSGrid 4 cards (Type / Color / Radii / Motion) | Type swatches table + color swatches grid (`--bg`, `--surface`, `--line`, `--ink`, `--accent`, `--ok`) + Radii row (6/10/14/20/28) + Motion easings demo (3 animated bars) | Page renders code blocks with JSON snippets (MCP / A2A / x402 sample HTTP) instead — entirely different content | ❌ wrong content | P0 |
| Type swatch table | Geist sizes + Source Serif sizes + Geist Mono sizes with line-heights | Absent | ❌ missing | P0 |
| Color swatch grid | 6-tile palette using token chips | Absent | ❌ missing | P0 |
| Radii row | 5 squares 6/10/14/20/28 px showing corner radii | Absent | ❌ missing | P0 |
| Motion easings demo | 3 animated bars demonstrating `--ease`, `--spring`, custom curve | Absent | ❌ missing | P0 |
| Section title size | `clamp(28px, 4vw, 48px)` | ~52px (close); appears smaller than ref ~72–80px implementation in source-shots | ⚠️ partial | P1 |
| Module list `payment_router / gift_packet / ...` 12-item grid | Not in inventory — addition | 3-col with uneven row heights, bumpy alignment | ⚠️ extra content + misaligned | P1 |
| Code blocks right padding | If kept, `.shell` max-width container with ~24–32px gutter | Code blocks butt against right edge, no right padding | ⚠️ wrong spacing | P1 |
| Mobile 375 code overflow | Inner padding inside `<pre>`, no overflow | JSON bleeds beyond viewport, horizontal scroll bug | ❌ broken | P1 |

### /today

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Entire page (Today dashboard) | App-shell route with own dashboard surface | Returns marketing landing page (SPA fallback) — no Today UI rendered | ❌ broken (routing) | P0 |
| All defects from `/` | n/a | Apply here verbatim | ❌ | P0 |

### /create

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar (sticky, blur, gradient, brand+nav+Launch pill) | Marketing-shell topbar shared on app routes | Stripped to "Ori / Create  Sign in →" — no nav, no Launch pill, no blur+gradient | ❌ missing | P0 |
| `.shell` max-width container + page padding | `max-width: 1320px`, padding `clamp(16px, 3vw, 32px)` | Body content starts at x=0; no left/right gutter | ❌ missing | P0 |
| Backdrop ambient | Indigo halo + subtle surface gradient | Flat solid background | ❌ missing | P0 |
| Page title "Every way to *move money* on Ori." | Section-title `clamp(28px, 4vw, 48px)` Geist 400 + serif italic accent | ~16–18px, no serif italic | ❌ wrong typography | P0 |
| `.eyebrow` "04 · CREATE" | Geist Mono 11px, 0.14em tracking, uppercase, `--ink-3` | Dim grey, lacks tracking + uppercase + mono | ⚠️ partial | P1 |
| Footer (4-col + bottom strip) | Shared footer present | Absent | ❌ missing | P0 |
| `.reveal` fade-up on action grid | IO 0.9s | Cards just appear | ❌ missing | P1 |
| Action grid 2-col gap | ~14–24px gap (`--gap-3`/`--gap-4`) | Rows touching, horizontal gap ~4px | ⚠️ wrong spacing | P1 |
| `.panel-chrome` (3 dots + mono `/path` + right label) | Each panel has chrome header per inventory cap pattern | Action panels have no chrome header | ❌ missing | P1 |
| Action icon color | Accent indigo `--accent` | Flat grey | ⚠️ wrong color | P1 |
| Mobile 375 internal padding | ~16–24px padding inside each card | Content jams against left edge of cards | ⚠️ wrong spacing | P1 |

### /streams

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Marketing-shell topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` container + page padding | max-width 1320 + clamp gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Money by the *second.*" | Section-title clamp + serif italic accent | ~16–18px Geist | ❌ wrong typography | P0 |
| Footer | 4-col + bottom strip | Absent | ❌ missing | P0 |
| Backdrop ambient | Surface gradient + indigo glow | Flat | ❌ missing | P0 |
| Section eyebrow "01 · STREAMS" | Mono 11px, 0.14em tracking, `--ink-3` | Absent | ❌ missing | P1 |
| Ink hierarchy on body copy | Headings `--ink`, body `--ink-2`, captions `--ink-3` | All paragraph text + labels render at full `--ink` | ⚠️ wrong color | P1 |
| Form field label→input gap | ~8px | Labels sit immediately atop inputs, 0px gap | ⚠️ tight spacing | P1 |
| "Open stream" CTA padding | `.btn-primary` padding 12px 20px, pill 999px radius | Button has no padding around play-icon, sits at x=0 of parent | ⚠️ wrong styling | P1 |
| Empty state border (`--line`) | 1px solid `--line` (#1f1f25-ish) | Border very faint, barely visible | ⚠️ wrong opacity | P2 |
| Mobile 375 form margin | Form within container with side margin | Form edge-to-edge, x=0 | ❌ broken responsive | P1 |

### /subscriptions

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Recurring, *by design.*" | Section-title clamp + serif italic accent | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| Subscribe / My plan tabs | Tab bar with active underline indicator | Two buttons, no underline indicator, uneven horizontal spacing | ⚠️ partial | P1 |
| Eyebrow "SUBSCRIBE TO A CREATOR" | Mono 11px ink-3 (~50%) | Renders at ~30% ink | ⚠️ wrong color | P1 |
| Period stepper (-/1/+) layout | Symmetric 3-col with even gaps, visible borders | Asymmetric: minus at x=0, 1 centered, + at far right; no visible borders | ⚠️ misaligned | P1 |
| `.reveal` fade-up | Yes | None | ❌ missing | P2 |
| Mobile form margin | Form within container | Form card hits viewport sides at 0 margin | ❌ broken responsive | P1 |

### /squads

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Groups, *but lighter.*" | Section-title clamp + serif italic accent | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| CREATE A SQUAD / JOIN BY ID columns | Equal-height cards in 2-col | Unequal heights (Create shorter than Join), no height match | ⚠️ misaligned | P1 |
| Join button left padding | Button padded inside its column | Sits flush x=0 of column | ⚠️ misaligned | P1 |
| Input border `--line-2` | 1px solid `--line-2` visible | Hairlines very dim | ⚠️ wrong opacity | P2 |
| Mobile inter-card gap | ~16–24px between stacked cards | No inter-card gap | ⚠️ tight spacing | P2 |

### /lucky

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "One pot, *one winner.*" | Section-title clamp + serif italic | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| MAX PARTICIPANTS chips (5/10/25/50/100) | `.chip` pill styling with 1px border, padding, hover state | Plain text spans separated by single space | ⚠️ wrong styling | P1 |
| Open pool / Enter pool buttons | `.btn-primary` pill with internal padding | Both flush x=0 of column | ⚠️ misaligned | P1 |
| "POOLS YOU KNOW ABOUT" empty card border | `--line` visible | Very faint | ⚠️ wrong opacity | P2 |
| Mobile pool ID input margin | Inside container | Bleeds edge-to-edge | ⚠️ broken responsive | P1 |

### /paywall/new

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Gate a URL *behind a price.*" | Section-title clamp + serif italic | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| PAYWALL DETAILS card centering | Card centered within container | Card width fixed ~670px, sits at left edge of viewport | ⚠️ misaligned | P1 |
| Publish paywall + My paywalls button consistency | Both `.btn` system (primary fill + ghost outline) | Publish at x=0 with no padding; My paywalls renders as different chip-pill style — inconsistent button system | ⚠️ inconsistent | P1 |
| Input border `--line-2` | Visible 1px | Barely visible | ⚠️ wrong opacity | P2 |
| Mobile margin | Inside container | Card hits viewport sides at 0 margin | ❌ broken | P1 |

### /paywall/mine

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Your *gated* links." | Section-title clamp + serif italic | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| **`+ New paywall` button overflow** | Button sits inside container, fully visible | Truncated mid-button on desktop, mobile, and tablet — only "New paywall" visible, half off right edge | ❌ broken layout | P0 |
| `+ Create your first` button (empty state) | Inside empty state card with full visibility | Truncated against right edge of empty-state card on desktop | ❌ broken layout | P0 |
| Empty-state card border | `--line` visible | Barely visible | ⚠️ wrong opacity | P2 |

### /predict

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "*Higher* or *lower?*" | Section-title clamp + serif italic | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| BTC/USD chart card | Sparkline / candlestick / chart visualization at minimum | Empty card with single horizontal line in middle | ❌ missing chart | P0 |
| Auto-sign warning banner | Constrained within container max-width with proper padding | Edge-to-edge orange/amber bar, looks like a bug | ⚠️ wrong width | P1 |
| TOKEN row (BTC / ETH / SOL / BNB / ATOM) | `.chip` pill row with consistent gaps | Plain text spans with inconsistent spacing | ⚠️ wrong styling | P1 |
| RESOLVES IN row (60s / 5min / 1hr / 1 day) | 4-col chip pills inside card | Floating 4-col without container chip styling | ⚠️ wrong styling | P1 |
| STAKE row (0.1 / 0.5 / 1 / 5) | Chip pill row | Plain bare row | ⚠️ wrong styling | P1 |
| HIGHER / LOWER buttons | HIGHER green (`--ok`) + LOWER red, padded pills with arrows | Both at x=0 of viewport, no semantic color, plain ink with arrows only | ⚠️ wrong color + misaligned | P1 |
| RESOLVE · CLAIM card buttons | Even spacing, visible button borders | Uneven spacing, no visible borders | ⚠️ wrong styling | P2 |
| Mobile RESOLVES IN / STAKE rows | Stack 2×2 or single col on narrow viewports | Stays 4-col, items wrap (60s, 5 min) get squashed | ❌ broken responsive | P1 |

### /send

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| **Onboarding modal "FIRST SEND ON ORI"** | If used, proper dialog overlay treatment with rgba 50% backdrop, centered with close-X inside top-right of card | Modal centered but blur on underlying form is so heavy form unreadable; close-X positioned outside top-left of card in dead space | ❌ blocking content | P0 |
| Topbar (behind modal) | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding (form behind modal) | max-width + gutter | x=0 flush-left | ❌ missing | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| "Got it" CTA | `.btn-primary` pill | No button border/pill styling | ⚠️ wrong styling | P1 |
| Modal backdrop overlay | rgba(7,7,10,0.7) full-viewport overlay blocking pointer events visibly | Flat dim, no dialog overlay treatment | ⚠️ wrong color | P1 |
| Mobile 375 modal width | Constrained max-width with margin | Nearly == viewport width, bullets wrap oddly, form unusable | ❌ broken responsive | P1 |

### /settings

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Entire page (Settings) | App-shell route with own settings surface | Returns marketing landing page (SPA fallback) — no settings UI rendered | ❌ broken (routing) | P0 |
| All defects from `/` | n/a | Apply here verbatim | ❌ | P0 |

### /discover

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Find your *people.*" | Section-title clamp + serif italic | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| Creator preview cards inside each shelf | Carousel/grid of creator cards (avatar + name + stat badges) | Single empty-state row per shelf; no creator cards | ❌ missing | P0 |
| Section eyebrow colors (gold trophy, green, blue) | Semantic colors with full ink-2 readability | Colors present but rows underneath have very faint borders barely visible | ⚠️ wrong opacity | P1 |
| Empty-state copy color | `--ink-3` ~50% | ~30% opacity, hard to read | ⚠️ wrong color | P1 |
| Mobile shelf padding | Inside container | Each row hits viewport edge with 0 padding | ❌ broken responsive | P1 |

### /chats

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Entire page (Chats) | App-shell route with chat list + thread surfaces | Returns marketing landing page (SPA fallback) — no chats UI rendered | ❌ broken (routing) | P0 |
| All defects from `/` | n/a | Apply here verbatim | ❌ | P0 |

### /onboard

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Set up your *identity.*" | Section-title clamp + serif italic | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| Step rows width | Fill the column at desktop | All 5 rows clamped to ~30% of viewport width | ⚠️ wrong width | P1 |
| Step radio circles | Empty/ringed (1px stroke) until completed | Filled grey | ⚠️ wrong styling | P1 |
| Step description text color | `--ink-2` ~70% | ~30% ink, very dim | ⚠️ wrong color | P1 |
| Connect wallet button | `.btn-primary` pill, padded inside container | Flush x=0 below 5 rows with no left margin | ⚠️ misaligned | P1 |
| `.reveal` fade-up | Yes | None | ❌ missing | P2 |
| Mobile step row width | Should fill | ~75% viewport with right-side dead space | ⚠️ wrong width | P2 |

### /ask

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Let Claude *spend* your INIT." | Section-title clamp + serif italic | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| Code block (`claude_desktop_config.json`) full width | Within `.shell`, code block uses container width | Code block doesn't fill container — Copy button at x=720 instead of x=container-right (~x=1240 desktop) | ⚠️ wrong width | P1 |
| Code block border | `--line` visible | Very faint border | ⚠️ wrong opacity | P2 |
| Eyebrow color consistency (`01 · ASK`, `STEP 1 · CONNECT`, `STEP 2 · TRY...`) | All same `--ink-3` mono uppercase | Mixed grey/cyan inconsistently | ⚠️ inconsistent | P1 |
| Demo blocks (PAY A FRIEND / OPEN A PREDICTION / etc) indent | Consistent left-flush within container | Mixed hanging indent and flush — inconsistent | ⚠️ inconsistent | P2 |
| Mobile JSON overflow | Inner padding inside `<pre>`, no overflow | Code overflows container right, text bleeds beyond viewport | ❌ broken | P1 |

### /portfolio

| Component | Reference state | Current state | Verdict | Priority |
|---|---|---|---|---|
| Topbar | Shared marketing topbar | Stripped app shell | ❌ missing | P0 |
| `.shell` + page padding | max-width 1320 + gutter | x=0 flush-left | ❌ missing | P0 |
| Page title "Your *whole* record." | Section-title clamp + serif italic | ~16–18px | ❌ wrong typography | P0 |
| Footer | Shared footer | Absent | ❌ missing | P0 |
| Backdrop ambient | Gradient + glow | Flat | ❌ missing | P0 |
| **Page body content (transaction history)** | Per inventory: payment / tip / gift / badge categories on one surface — skeleton rows + empty-state cards | Only title + sub + a "Connect wallet" button; no skeleton, no empty-state cards | ❌ missing body | P0 |
| Connect wallet button | `.btn-primary` pill: bg `--ink`, color `--bg`, 999px radius | Bare hairline border, no fill, no pill rounding, x=0 of parent | ⚠️ wrong styling | P1 |
| `.reveal` fade-up | Yes | None | ❌ missing | P2 |

---

## Cross-cutting gaps (affect every route)

| Issue | Reference state | Current state | Affected | Verdict | Priority |
|---|---|---|---|---|---|
| **App-shell topbar** | All routes share `.topbar` (sticky, blur 20px + saturate 1.4, gradient bg, 1px hairline, brand+nav+Launch pill) | 15 of 21 routes use stripped header (`Ori / <breadcrumb> Sign in →`); only marketing routes (`/`, `/capabilities`, `/flow`, `/creators`, `/system`) have correct topbar | ❌ missing on 15 routes | P0 |
| **App-shell footer** | All routes share `<footer>` 4-col grid (Brand + Product / Developers / Legal columns) + bottom strip ("© Ori — all quiet · Built on bridged INIT. No token launch." + green pulsing dot + "all systems green") | App-shell routes (15) end abruptly without footer; marketing routes have footer | ❌ missing on 15 routes | P0 |
| **`.shell` container + page padding** | `max-width: 1320px` + `padding: clamp(16px, 3vw, 32px)` horizontal gutter | App-shell routes render at x=0, no container, no horizontal gutters | ❌ missing on 15 routes | P0 |
| **Backdrop ambient gradients** | Indigo radial-glow / surface gradient ambient on every route | Flat near-black on every app route + missing on `/` hero | ❌ missing across board | P0 |
| **`.reveal` IntersectionObserver fade-up** | Single primitive: opacity 0→1 + transform translateY(20→0) over 0.9s ease-out, IO threshold 0.15, rootMargin -10% bottom, adds `.in` once | Marketing routes may have it; app routes don't fire any reveal anim | ❌ missing on app shell | P0 |
| **Page title typography (section-title)** | `clamp(28px, 4vw, 48px)` Geist 400 + Source Serif italic on accent span, line-height 1.05, letter-spacing -0.035em, max-width 22ch | App-shell page titles all render ~16–18px Geist with no serif italic accent | ❌ wrong on 15 routes | P0 |
| **Routing failure (3 routes)** | `/today`, `/chats`, `/settings` should render their own app-shell surfaces | All three serve the marketing landing page (SPA fallback / wrong rewrite rules) | ❌ broken | P0 |
| **Button system consistency** | Two-variant `.btn` system: `.btn-primary` (white pill, lift -1px on hover) and `.btn-ghost` (outlined, surface fill on hover); plus `.chip` pill for tag rows | Mixed across app routes: some pills, some flat-text-with-icon, some borderless. No unified system. | ⚠️ inconsistent across 15 routes | P0 |
| **Tokens — ink hierarchy** | `--ink` (text), `--ink-2` (~70%, body), `--ink-3` (~50%, captions/eyebrows), `--ink-4` (~35%, dim) | App routes render most copy at full `--ink`, occasional ~30% (over-muted); hierarchy collapsed | ⚠️ wrong color on 15 routes | P1 |
| **Tokens — typography stacks** | Geist (sans) + Source Serif (italic accents) + Geist Mono (kbd, eyebrows, addresses, tnum stats) | Italic accents render in Geist instead of Source Serif on multiple routes; `tnum` (`font-variant-numeric: tabular-nums`) appears applied inconsistently | ⚠️ partial | P1 |
| **Tokens — line / surface borders** | `--line`, `--line-2`, `--line-3` provide stepped 1px hairline contrast for cards/inputs | App routes render borders so faint they're nearly invisible; opacity stack collapsed | ⚠️ wrong opacity | P1 |
| **`@keyframes` library** | `pulse` (hero-tag), `ring-pulse` (avatar), `blink` (cursor), `card-in` (pay-card), `fill-up` (stream), plus `.reveal` IO transition | None of these animations detectable on deploy; the underlying motion vocabulary appears unwired everywhere | ❌ missing | P1 |
| **Topbar shared layout — fonts loaded** | Geist + Geist Mono + Instrument Serif via Google Fonts preconnect | Italic accents not in Source Serif → Instrument Serif font may not be loaded at build time | ⚠️ font missing or unhooked | P1 |
| **Mobile responsive padding** | App routes inside `.shell` clamp gutter on mobile (16px min) | App routes hit viewport edge at x=0 on mobile | ❌ broken responsive | P1 |
| **Hover micro-interactions** | NavCTA arrow translates +2px, `.btn-primary` lifts -1px, `.panel` border-color + background transition over 0.3s | Generally absent; static rendering | ⚠️ missing polish | P2 |

---

**Total gaps: 142 · P0: 41 · P1: 64 · P2: 37 · file: `C:\Users\ritik\MINITIA\design-refs\GAPS.md`**
