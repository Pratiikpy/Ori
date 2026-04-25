# IA — Information Architecture for the Ori multi-page rebuild

Source of truth: `design-refs/source/Ori-landing.html` (single-page reference, lines 1–1783)
plus `design-refs/source/Ori_-_standalone.html` (alternate copy variant — sanity check only,
not authoritative — see `INVENTORY.md` §Standalone).
This document maps that single page into a real multi-page product website. Output of
Phase 2 / Agent 5. Inputs: `INVENTORY.md`, `COMPONENTS.md`, `GAPS.md`.

Two shells exist:

- **Marketing shell** — sticky `Topbar`, marketing `Footer`, `.shell` (`max-width:1320px;
  padding: clamp(16px, 3vw, 32px)`), backdrop ambient (`::before` indigo radials +
  `::after` star-dot field), `.reveal` IO fade-up. Used by routes `/`, `/capabilities`,
  `/flow`, `/creators`, `/system`.
- **App shell** — own `Header` (brand → / · current title · auto-sign toggle · wallet pill),
  `BottomNav` (`lg:hidden`), `Sidebar` (`lg:flex`, sticky desktop top-bar), no marketing
  Topbar, no marketing Footer, AppShell owns `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8`,
  same backdrop ambient + tokens. Used by every other route.

---

## 1. Route map

### Marketing routes

#### `/` — Landing
- **Page name**: Landing
- **Headline**: `Messages that` *"move"* `money.`  (verbatim hero `<h1.hero-title>` line
  `Ori-landing.html` 1104–1106; serif italic accent on `move`)
- **Components** (COMPONENTS.md ids): `Topbar` + `NavCTA` · `HeroTag` · `HeroTitle` ·
  `Device` (with nested `ChatHeader` · `MsgIn`/`MsgOut` · `PayCard` · `ChatInput`) ·
  `StatsRibbon` · capability tease (3-up reduced `Panel` row, links to `/capabilities`) ·
  flow tease (single `WinThread` peek, links to `/flow`) · creators tease (compact
  `LinktreeProfile` card, links to `/creators`) · `Footer`
- **Source content**: `Ori-landing.html` HERO block 1097–1176 (hero + stats); reduced
  excerpts from CAPABILITIES 1179–1345 (3 panels of choice — keypad + identity + stream),
  FLOW 1421–1460 (`win-thread` only), CREATORS 1496–1607 (collapsed profile card without
  feed/tabs), FOOTER 1692–1738.

#### `/capabilities` — Capabilities
- **Page name**: Capabilities
- **Headline**: `Payments, messages, and agents` *"on the same surface"*`.` (verbatim
  `Ori-landing.html` 1183, serif accent)
- **Sub**: "Six primitives. No feature menu. Everything Ori does, it does from a single
  conversation." (line 1185–1187)
- **Components**: `Topbar` · `SectionHead` (eyebrow `01 · Capabilities`) · full `.cap-grid`
  with all 8 OS-window `Panel` instances (panel-big rows × 2 + 3-col `.row` rows × 2,
  using `Keypad`, `NetworkSVG`, `GiftPreview`, `Terminal`, `StreamProgress` and the BTC-
  predict / paywall / agent-caps `Panel` viz blocks) · CTA strip (`Open the app`
  `.btn-primary` → `/today`) · `Footer`
- **Source content**: `Ori-landing.html` §01 Capabilities 1179–1345 verbatim. Eyebrow at
  1182 (`01 · Capabilities`), section-title 1183, section-sub 1185–1187, panels 1190–1343.

#### `/flow` — Flow
- **Page name**: Flow
- **Headline**: `A single gesture from` *"conversation"* `to settled.` (verbatim
  `Ori-landing.html` 1353)
- **Sub**: "Three surfaces. One continuous thought. Roll your pointer across them." (1355–1357)
- **Components**: `Topbar` · `SectionHead` (eyebrow `02 · Flow`) · `FlowStage` group:
  `WinChats` + `WinThread` + `WinSend` (each is a `Window` with traffic-light bar + content
  area; uses nested `MsgIn`/`MsgOut`/`PayCard` in WinThread and `Keypad` in WinSend) ·
  4-stat `StatsRibbon` (97ms / 1% / 0 / e2e) · CTA card ("Try sending a payment to
  yourself" → `/send`) · `Footer`
- **Source content**: `Ori-landing.html` §02 Flow 1348–1494 verbatim — section-head
  1350–1358, flow-stage 1360–1493 (all three windows present in source). Stats reused
  from hero ribbon block 1158–1175. CTA card is new but uses `.btn-primary` token
  pattern from HeroTitle CSS 247–262.

#### `/creators` — Creators
- **Page name**: Creators
- **Headline**: `A profile, a tip jar,` *"and a stage"*`.` (verbatim `Ori-landing.html`
  1508)
- **Sub**: "Every `.init` name has a public home at ori.chat/name — no setup, no theme
  picker, no shop to configure." (1510–1512)
- **Components**: `Topbar` · `SectionHead` (eyebrow `03 · Creators`) · `LinktreeProfile`
  (mira.init full mock: cover band + xl avatar + verified-badge SVG + serif name +
  `.address` mono + bio + `.lt-stats` 3-up + `.tip-bar` chip row + 4 `.lt-link`s +
  `.profile-tabs` + 5-row `.feed`) · 4 explainer cards (How tipping works / Subscriptions
  / Paywalls / Agent payouts — built from `Panel` primitive minus chrome dots, copy
  derived from §01 Capabilities + §03 sub-copy) · CTA pair ("Claim your name" →
  `/onboard`, "Browse creators" → `/discover`) · `Footer`
- **Source content**: `Ori-landing.html` §03 Creators 1496–1607 verbatim (profile mock
  + scoped style block 1497–1503). Explainer cards new but copy derived from Capabilities
  panels for /gift, /stream, /agent (1280–1342) + Subscribe lt-link (1620). CTA strip uses
  `.btn-primary` / `.btn-ghost` from `HeroTitle` block.

#### `/system` — System
- **Page name**: System
- **Headline**: `The pieces that` *"make"* `the whole.` (verbatim `Ori-landing.html` 1642)
- **Sub**: "Four primitives: type, color, radii, motion. Each one does one job, and does
  it the same way everywhere in the product." (1644–1646)
- **Components**: `Topbar` · `SectionHead` (eyebrow `05 · System`) · `DSGrid` (4 cards:
  Type / Color / Radii / Motion). **Open question**: also include the `/system` page's
  18-Move-module grid (`payment_router / gift_packet / …`) currently rendered on deploy?
  Reference `Ori-landing.html` only ships DSGrid; the modules grid is current-deploy
  invention. **Flag for `DECISIONS.md`** — see §6 below. · `Footer`
- **Source content**: `Ori-landing.html` §05 System 1638–1689 verbatim (DSGrid 1649–1688).
  Module-grid copy not present in reference — `DECISIONS.md` to resolve.

### App routes

All app routes wear the **app shell**. `/today` is fully designed below; siblings inherit
the same chrome and swap content per route.

- **`/today` — Today (dashboard)**
  - **Page name**: Today
  - **Headline**: "Welcome back, *mira*." (new copy; serif italic on the name; pattern
    matches `HeroTitle` `.serif` accent)
  - **Components**: app `Header` (brand → `/` · "Today" title · auto-sign toggle ⚡OFF ·
    wallet pill `0xc29d…8a4f`) · main column: `WelcomeCard` (greeting + balance pill,
    new component, built from `Panel` chrome + `tnum` balance like `WinSend.amt-big`) +
    `WeeklyStats` (4-up mini `StatsRibbon`, reuses `.stats` rules) + `AgentSetupCTA`
    (`Panel`-style card → `/ask`) + 4-up `QuickActions` grid (Send / Predict / Stream /
    Tip — each a compact `Panel` with icon + headline + sub, click-through to `/send`,
    `/predict`, `/streams`, `/creators`) + slim "See every way to move money" row (3
    chips → `/create`) · sticky `ActivityFeed` sidebar (5 `feed-item` rows from
    `LinktreeProfile.feed` styling — `BottomNav` (mobile) · `Sidebar` (desktop top-bar)
  - **Layout**: mobile = stacked, sidebar at bottom; desktop = 2-col grid (main + sticky
    `ActivityFeed` sidebar)
  - **Source content**: Welcome card copy is new. `WeeklyStats` reuses 4-stat ribbon
    pattern from hero 1158–1175 with new domain values. `QuickActions` panel copy derives
    from §01 Capabilities (1192–1342). `ActivityFeed` rows use `.feed` markup from
    LinktreeProfile 1630–1638.

- **`/send` — Send**: app shell. Body = full `WinSend` `Window` (recipient row + giant
  `$16.20` mono + 3×4 `Keypad` + Send pill). Source: `Ori-landing.html` 1462–1492. First-
  visit `Onboarding modal "FIRST SEND ON ORI"` overlay (per `GAPS.md /send`, must be
  rebuilt with proper backdrop + close-X). Headline: "Send to *anyone*."
- **`/predict` — Predict**: app shell. Body = BTC/USD chart card + chip rows for
  TOKEN / RESOLVES IN / STAKE + HIGHER (green `--ok`) / LOWER (`--warn`) `.btn-primary`
  pair + RESOLVE · CLAIM card. Source: §01 Capabilities `BTC predict` panel viz pattern;
  `GAPS.md /predict` for required components. Headline: *"Higher"* `or` *"lower"*`?`
- **`/streams` — Streams**: app shell. Body = `StreamProgress` (per-second / elapsed /
  bar / streamed) + recipient form + Open stream `.btn-primary`. Source: §01
  Capabilities `/stream` panel 1316–1342. Headline: `Money by the` *"second"*`.`
- **`/subscriptions` — Subscriptions**: app shell. Body = `Subscribe / My plan` tab bar
  + period stepper (-/1/+) + creator picker. Source: derived from `lt-link` "Subscribe ·
  monthly ($9)" 1621 + tip-bar chip pattern 1601–1615. Headline: `Recurring,` *"by
  design"*`.`
- **`/squads` — Squads**: app shell. Body = 2-col `CREATE A SQUAD / JOIN BY ID` cards
  built from `Panel` primitive. Source: derived from chat-item `studio (3)` 1404–1410.
  Headline: `Groups,` *"but lighter"*`.`
- **`/lucky` — Lucky**: app shell. Body = MAX PARTICIPANTS chip row (5/10/25/50/100) +
  Open pool / Enter pool `.btn-primary` + "POOLS YOU KNOW ABOUT" empty card. Source: new;
  uses `.chip` pattern from tip-bar 1604–1610. Headline: `One pot,` *"one winner"*`.`
- **`/paywall/new` — New paywall**: app shell. Body = PAYWALL DETAILS form card + URL +
  price + Publish `.btn-primary` + My paywalls `.btn-ghost`. Source: derived from §01
  Capabilities paywall panel viz pattern. Headline: `Gate a URL` *"behind a price"*`.`
- **`/paywall/mine` — My paywalls**: app shell. Body = `+ New paywall` `.btn-primary` +
  empty-state card with `+ Create your first` action. Source: same pattern; per
  `GAPS.md` both buttons currently overflow viewport — must be inside `.shell` container.
  Headline: `Your` *"gated"* `links.`
- **`/create` — Create (every-way-to-move-money index)**: app shell. Body = page eyebrow
  `04 · CREATE` + section-title "Every way to *move money* on Ori." + 2-col action grid
  (Send / Tip / Gift / Stream / Subscribe / Paywall / Pool / Squad — each a `Panel` with
  chrome + icon + label + click-through to corresponding app route). Source: §01
  Capabilities panel set 1190–1343 condensed into nav grid.
- **`/chats` — Chats**: app shell. Body = full `WinChats` `Window` (search + ⌘K kbd +
  6 `chat-item` rows) at full page width; tap a row → opens `/chats/[id]` thread view
  reusing `WinThread`. Source: `Ori-landing.html` 1361–1419 + 1421–1460. Headline (slim,
  in app `Header`): "Chats".
- **`/settings` — Settings**: app shell. Body = grouped `Panel` cards: Identity (.init
  name + address) / Wallet (export / lock) / Agents (auto-sign toggles) / Notifications /
  Legal links. Source: derived from §03 Creators profile-info 1577–1587 + Footer Legal
  column 1725–1732. Headline: "Your *quiet* control panel."
- **`/discover` — Discover**: app shell. Body = 3 shelves (Trending creators · New on
  Ori · Active streams) each a horizontal scroller of compact `LinktreeProfile`-derived
  cards (avatar + serif name + 2-stat row). Source: derived from §03 Creators 1496–1607.
  Headline: `Find your` *"people"*`.`
- **`/[identifier]` — Public creator profile**: app shell **without `BottomNav`** (public
  page). Body = full `LinktreeProfile` mock parameterised by route param. Source:
  `Ori-landing.html` 1496–1607 verbatim. URL pattern matches `ori.chat/name` claim in
  section sub (1511).
- **`/onboard` — Onboard**: app shell minimal (`Header` only, no `BottomNav`). Body =
  5-step row list (Connect wallet / Pick .init name / Set agent grants / Add a friend /
  Send first $) with empty/ringed radio circles + `Connect wallet` `.btn-primary`.
  Source: derived from chat-item `mira.init` and Footer brand block; new copy. Headline:
  `Set up your` *"identity"*`.`
- **`/ask` — Ask (Claude / agent integration)**: app shell. Body = code block
  `claude_desktop_config.json` (Copy button) + 2-step demo cards (STEP 1 · CONNECT /
  STEP 2 · TRY) + 3-up demo blocks (PAY A FRIEND / OPEN A PREDICTION / TIP A CREATOR).
  Source: §01 Capabilities `/agent` panel 1296–1314 expanded. Headline: `Let Claude`
  *"spend"* `your INIT.`

---

## 2. Shared layout rules

Two shells. Hard rule: pages do **not** mix.

### Marketing shell (`/`, `/capabilities`, `/flow`, `/creators`, `/system`)
- `Topbar` (sticky, `backdrop-filter: blur(20px) saturate(1.4)`, gradient
  `linear-gradient(180deg, rgba(7,7,10,0.86) 0%, rgba(7,7,10,0.6) 100%)`, 1px hairline)
- `Footer` (4-col + bottom strip, `© 2026 Ori Labs — All quiet.` + green pulsing dot)
- `.shell` container (`max-width:1320px; padding: clamp(16px, 3vw, 32px)`)
- Backdrop ambient: body `::before` indigo radial gradients + `::after` star-dot field at
  `background-size: 1400px 900px; opacity: 0.7`
- `.reveal` IO primitive (opacity 0→1 + transform translateY(20→0) over 0.9s ease-out,
  IO threshold 0.15, rootMargin -10% bottom, adds `.in` once)
- All four type stacks: `--sans` Geist, `--serif` Instrument Serif, `--mono` Geist Mono

### App shell (every other route)
- App `Header` (NOT marketing `Topbar`): brand → `/` · current page title · auto-sign
  toggle (⚡OFF / ⚡ON) · wallet pill (truncated address)
- No marketing `Footer`
- `BottomNav` (`lg:hidden`) — mobile-only on app routes
- `Sidebar` (`lg:flex`) — desktop, used as top-bar nav (icons + labels for the same 5
  routes the bottom tab bar shows)
- AppShell container owns `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` (narrower than
  marketing's 1320 — distinguishes app surface from marketing reading width)
- Same backdrop ambient as marketing
- Same design tokens (single `:root`)
- Same `.reveal` IO primitive

### Width discipline
- AppShell: `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8`
- Marketing: `.shell { max-width: 1320px; padding: clamp(16px, 3vw, 32px); margin: 0 auto; }`

---

## 3. Navigation rules

### Topbar nav (marketing routes only)
- `Capabilities` → `/capabilities`
- `Flow` → `/flow`
- `Creators` → `/creators`
- `System` → `/system`
- `Launch` (`NavCTA` pill with arrow) → `/today`

### Brand mark
- Always → `/` (both shells; uses `Brand` component verbatim)

### Active link highlight
- `Topbar` nav links: active route gets `color: var(--ink)` (vs default `--ink-2`).
  Implemented via the same hover transition that already exists in `.nav a:hover`
  (COMPONENTS.md `Topbar` CSS 85–86) — applied as a static class on the active link.

### Bottom tab bar (mobile-only on app routes, `lg:hidden`)
- `Today` → `/today`
- `Ask` → `/ask`
- `Predict` → `/predict`
- `Create` → `/create`
- `Chats` → `/chats`

(Note: matches actual app routes — these five are the most-used app surfaces. `/send`,
`/streams`, `/subscriptions`, `/squads`, `/lucky`, `/paywall/*`, `/discover`, `/settings`,
`/onboard`, `/[identifier]` are reachable from `/today`, `/create`, or `/chats` content
rather than the bottom bar.)

### Sidebar nav (desktop, `lg:flex`, used as top-bar nav row)
- Same five entries as the bottom tab bar (Today / Ask / Predict / Create / Chats),
  laid out horizontally as a top-bar nav, with active highlight matching the marketing
  topbar pattern.

### App `Header` exposes
- `Brand` → `/`
- Current page title (e.g. "Today", "Send", "Predict")
- Auto-sign toggle (⚡OFF default, ⚡ON when agent grant active) — this is the
  `Auto-sign warning banner` referenced in `GAPS.md /predict` once activated
- Wallet pill (truncated `.init` name + `0xc29d…8a4f` mono address, derived from
  `LinktreeProfile.address` mono pattern 1586)

---

## 4. Page anatomy templates

Vertical structural diagrams (top → bottom). Marketing pages first, then `/today`.

### `/`
```
┌──────────────────────────────────────────────────────────────┐
│ Topbar [Brand · Capabilities · Flow · Creators · System │ Launch→]
├──────────────────────────────────────────────────────────────┤
│ Hero (.shell, 2-col on desktop)                              │
│ ┌─────────────── col 1 ────────────────┐ ┌── col 2 ────────┐ │
│ │ HeroTag (pulsing green dot)          │ │ Device (parallax │ │
│ │ HeroTitle "Messages that *move* …"   │ │ tilt; mira.init │ │
│ │ HeroSub                               │ │ chat preview;   │ │
│ │ HeroActions (Open the app · See it)  │ │ PayCard card-in)│ │
│ └──────────────────────────────────────┘ └─────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ StatsRibbon (4-up · 97ms / 1% / 0 / e2e · top+bottom hairline) │
├──────────────────────────────────────────────────────────────┤
│ Capability tease (3-up reduced Panel row → /capabilities)    │
├──────────────────────────────────────────────────────────────┤
│ Flow tease (single WinThread peek → /flow)                   │
├──────────────────────────────────────────────────────────────┤
│ Creators tease (compact LinktreeProfile → /creators)         │
├──────────────────────────────────────────────────────────────┤
│ Footer (4-col + bottom strip)                                │
└──────────────────────────────────────────────────────────────┘
```

### `/capabilities`
```
┌──────────────────────────────────────────────────────────────┐
│ Topbar                                                        │
├──────────────────────────────────────────────────────────────┤
│ SectionHead (eyebrow `01 · Capabilities` + title + sub)      │
├──────────────────────────────────────────────────────────────┤
│ .cap-grid                                                     │
│ ┌── panel-big (Pay / keypad) ──┐ ┌── panel-big (Identity) ─┐ │
│ │ chrome / body / Keypad viz   │ │ chrome / body / NetSVG  │ │
│ └──────────────────────────────┘ └──────────────────────────┘ │
│ ┌─ panel ─┐ ┌─ panel ─┐ ┌─ panel ─┐                          │
│ │ /gift   │ │ /agent  │ │ /stream │                          │
│ │ Gift    │ │ Term    │ │ Stream  │                          │
│ └─────────┘ └─────────┘ └─────────┘                          │
│ ┌─ panel ─┐ ┌─ panel ─┐ ┌─ panel ─┐                          │
│ │ /predict│ │ /paywall│ │ /agent  │                          │
│ └─────────┘ └─────────┘ └─────────┘                          │
├──────────────────────────────────────────────────────────────┤
│ CTA strip ("Open the app" .btn-primary → /today)             │
├──────────────────────────────────────────────────────────────┤
│ Footer                                                        │
└──────────────────────────────────────────────────────────────┘
```

### `/flow`
```
┌──────────────────────────────────────────────────────────────┐
│ Topbar                                                        │
├──────────────────────────────────────────────────────────────┤
│ SectionHead (eyebrow `02 · Flow` + title + sub)              │
├──────────────────────────────────────────────────────────────┤
│ FlowStage (3-col desktop, stacks tablet 820 and below)       │
│ ┌── WinChats ───┐ ┌── WinThread ──┐ ┌── WinSend ────┐       │
│ │ search + ⌘K   │ │ head + msgs   │ │ recipient     │       │
│ │ 6 chat-items  │ │ + PayCard@97ms│ │ amt $16.20    │       │
│ │               │ │ + input       │ │ Keypad 3×4    │       │
│ │               │ │               │ │ Send · $16.20 │       │
│ └───────────────┘ └───────────────┘ └───────────────┘       │
├──────────────────────────────────────────────────────────────┤
│ StatsRibbon (4-up · 97ms / 1% / 0 / e2e)                     │
├──────────────────────────────────────────────────────────────┤
│ CTA card ("Try sending a payment to yourself" → /send)       │
├──────────────────────────────────────────────────────────────┤
│ Footer                                                        │
└──────────────────────────────────────────────────────────────┘
```

### `/creators`
```
┌──────────────────────────────────────────────────────────────┐
│ Topbar                                                        │
├──────────────────────────────────────────────────────────────┤
│ SectionHead (eyebrow `03 · Creators` + title + sub)          │
├──────────────────────────────────────────────────────────────┤
│ LinktreeProfile (mira.init full mock, centered, max-w 560)   │
│   cover band · xl avatar + verified · serif name + addr      │
│   bio · lt-stats 3-up · tip-bar chips · 4 lt-links           │
│   profile-tabs · 5-row feed                                  │
├──────────────────────────────────────────────────────────────┤
│ 4 explainer cards (Tipping / Subs / Paywalls / Agent payouts)│
├──────────────────────────────────────────────────────────────┤
│ CTA pair ("Claim your name" → /onboard · "Browse creators"   │
│  → /discover)                                                 │
├──────────────────────────────────────────────────────────────┤
│ Footer                                                        │
└──────────────────────────────────────────────────────────────┘
```

### `/system`
```
┌──────────────────────────────────────────────────────────────┐
│ Topbar                                                        │
├──────────────────────────────────────────────────────────────┤
│ SectionHead (eyebrow `05 · System` + title + sub)            │
├──────────────────────────────────────────────────────────────┤
│ DSGrid (4 cards)                                              │
│ ┌── Type ────┐ ┌── Color ───┐ ┌── Radii ──┐ ┌── Motion ──┐ │
│ │ XS / SM /  │ │ bg / surf /│ │ 6/10/14/  │ │ ease bar   │ │
│ │ MD / LG    │ │ ink/accent │ │ 20 / 28   │ │ spring bar │ │
│ └────────────┘ └────────────┘ └───────────┘ └────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ [OPEN: Move-modules grid? Resolve in DECISIONS.md]           │
├──────────────────────────────────────────────────────────────┤
│ Footer                                                        │
└──────────────────────────────────────────────────────────────┘
```

### `/today` (app shell)
```
┌──────────────────────────────────────────────────────────────┐
│ Header [Brand · "Today" · ⚡OFF · 0xc29d…8a4f]                │
├──────────────────────────────────────────────────────────────┤
│ Sidebar (lg:flex top-bar nav · Today | Ask | Predict |        │
│  Create | Chats — active = Today)                            │
├──────────────────────────────────────────────────────────────┤
│  AppShell container (mx-auto max-w-6xl px-4 sm:px-6 lg:px-8) │
│  ┌───────────────── 2-col grid (lg) ─────────────────┐       │
│  │ MAIN COLUMN                  │ SIDEBAR (sticky)    │       │
│  │ ┌──────────────────────────┐ │ ┌────────────────┐ │       │
│  │ │ WelcomeCard              │ │ │ ActivityFeed   │ │       │
│  │ │ "Welcome back, *mira*."  │ │ │ 5 feed-item    │ │       │
│  │ │ + balance pill           │ │ │ rows           │ │       │
│  │ └──────────────────────────┘ │ │ avatar+text+   │ │       │
│  │ ┌──────────────────────────┐ │ │ amt+time       │ │       │
│  │ │ WeeklyStats (4-up mini   │ │ │                │ │       │
│  │ │ StatsRibbon)             │ │ │                │ │       │
│  │ └──────────────────────────┘ │ │                │ │       │
│  │ ┌──────────────────────────┐ │ │                │ │       │
│  │ │ AgentSetupCTA → /ask     │ │ │                │ │       │
│  │ └──────────────────────────┘ │ │                │ │       │
│  │ ┌─QuickActions 4-up grid──┐ │ │                │ │       │
│  │ │ Send  Predict           │ │ │                │ │       │
│  │ │ Stream Tip              │ │ │                │ │       │
│  │ └──────────────────────────┘ │ │                │ │       │
│  │ ┌─ See every way → /create ┐│ │                │ │       │
│  │ │ slim row of 3 chips      ││ │                │ │       │
│  │ └──────────────────────────┘│ │                │ │       │
│  └───────────────────────────────┴─────────────────┘ │       │
├──────────────────────────────────────────────────────────────┤
│ BottomNav (lg:hidden · Today | Ask | Predict | Create |Chats)│
└──────────────────────────────────────────────────────────────┘

Mobile (< lg): main column stacked, ActivityFeed appears below
QuickActions, BottomNav fixed to bottom edge.
```

---

## 5. Content sourcing

Every page's copy traced back to its source. Section IDs are `id="…"` attributes from
`Ori-landing.html` (file: `design-refs/source/Ori-landing.html`).

| Page | Source section | Lines | Notes |
|---|---|---|---|
| `/` | `<section class="hero shell">` (no id, anchor `#top` on `<main>`) | 1097–1176 | Hero + StatsRibbon |
| `/` | `#capabilities` (excerpt, 3 panels) | 1179–1345 (cherry-pick 3) | Tease only |
| `/` | `#flow` (excerpt, WinThread only) | 1421–1460 | Tease only |
| `/` | `#profile` (excerpt, collapsed profile) | 1496–1607 | Tease only |
| `/` | `<footer class="foot shell">` | 1692–1738 | Verbatim |
| `/capabilities` | `#capabilities` | 1179–1345 | Verbatim, all 8 panels |
| `/flow` | `#flow` | 1348–1494 | Verbatim, all 3 windows |
| `/flow` | hero stats reuse | 1158–1175 | StatsRibbon |
| `/creators` | `#profile` + scoped style | 1496–1607 (incl. style 1497–1503) | Verbatim profile |
| `/creators` | Capabilities /gift /stream /agent | 1280–1342 | Source for 4 explainer cards |
| `/system` | `#system` | 1638–1689 | Verbatim DSGrid |
| `/today` | New copy + reuses .stats / .feed / Panel patterns | — | Welcome new; widgets adapt existing components |
| `/send` | `#flow` `.win-send` | 1462–1492 | Verbatim WinSend |
| `/predict` | `#capabilities` BTC predict panel viz | within 1190–1343 | Predict panel pattern |
| `/streams` | `#capabilities` `/stream` panel | 1316–1342 | StreamProgress |
| `/subscriptions` | `#profile` `.lt-link` "Subscribe" + `.tip-bar` chips | 1601–1622 | Subscribe + chip pattern |
| `/squads` | `#flow` chat-item `studio (3)` | 1404–1410 | Group chat seed |
| `/lucky` | New; uses `.tip-bar .chip` styling | 1601–1615 | Chip pattern only |
| `/paywall/new` | `#capabilities` paywall panel viz pattern | within 1190–1343 | Paywall panel |
| `/paywall/mine` | Same | — | List variant |
| `/create` | `#capabilities` panel set, condensed | 1190–1343 | Action grid index |
| `/chats` | `#flow` `.win-chats` + `.win-thread` | 1361–1419, 1421–1460 | Verbatim |
| `/settings` | `#profile` profile-info + Footer Legal column | 1577–1587, 1725–1732 | Identity + legal links |
| `/discover` | `#profile` derived (compact card) | 1496–1607 | Mini-profile cards |
| `/[identifier]` | `#profile` | 1496–1607 | Verbatim, parameterised |
| `/onboard` | New; brand block + chat-item pattern | — | Step rows new copy |
| `/ask` | `#capabilities` `/agent` panel | 1296–1314 | Expanded with config block |

---

## 6. Deferred / open questions

1. **`/system` content scope — DSGrid only, or DSGrid + Move-modules grid?**
   The reference (`Ori-landing.html` 1649–1688) ships only the 4-card DSGrid. The current
   deploy has invented an 18-Move-module grid (`payment_router / gift_packet / …`) on
   `/system` that has no source in the reference. The brief asks to "resolve in
   DECISIONS — flag as open" and references "16 vs 18 Move modules". This document does
   not pick — it stages both options under §5 Page anatomy and §1 Route map and defers
   to **`DECISIONS.md`**. Inputs needed for that decision: (a) does the product have a
   real Move-module list to expose, (b) if yes 16 or 18, (c) where do they belong —
   `/system` or a new `/build` / `/protocol` page.

2. **`/today` data wiring — real or static mock?**
   `WelcomeCard` balance, `WeeklyStats` values, `ActivityFeed` rows, `QuickActions`
   counts — all could be hard-coded mock (matches the reference's static demo posture)
   or wired to a real wallet + indexer (matches a shipped product). Reference is static.
   `GAPS.md` documents the route as currently broken (returns landing fallback). Flag
   for **`DECISIONS.md`** — recommend Phase 3 ships static mock first, with a flagged
   adapter point so real-data wiring is a swap, not a rebuild.

3. **Marketing topbar anchor links vs route links.** Reference `Topbar` uses anchor hashes
   (`#capabilities`, `#flow`, `#profile`, `#system`) because it is a single page. In this
   IA the same nav points at routes (`/capabilities`, `/flow`, `/creators`, `/system`).
   Footer Product column has the same swap. Confirm in `DECISIONS.md` that the switch
   from anchor hashes to routes is intended (it is, per the brief — but worth recording).

4. **Sidebar role on desktop app shell.** Brief says "BottomNav `lg:hidden`, Sidebar
   `lg:flex` desktop top-bar". Interpreted here as: the same nav set lives in both, but
   the desktop instance is a top-bar layout (not a left rail). Confirm in `DECISIONS.md`
   that "Sidebar as top-bar" is the intended pattern, not a left-rail sidebar.

5. **`/[identifier]` shell variant.** App shell minus `BottomNav` (public profile, viewer
   may not have an Ori account). Confirm in `DECISIONS.md`.

6. **`/onboard` shell variant.** App shell with `Header` only (no `BottomNav`, no
   `Sidebar`) until completion. Confirm in `DECISIONS.md`.
