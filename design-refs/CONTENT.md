# CONTENT — Ori frontend rebuild copy & microcopy audit

Source of truth: `design-refs/source/Ori-landing.html` (single-page reference, lines 1–1783).
Cross-referenced against `design-refs/source/Ori_-_standalone.html` (alternate copy variant —
sanity check only, not authoritative). The standalone file ships as a JSON-encoded bundle on
line 182; decoded body in `design-refs/source/_standalone_decoded.html` for diffing.

Routes and component IDs follow `design-refs/IA.md`.

All quoted strings below are verbatim from the canonical reference. Em-dash characters (—) and
ellipses (…) are preserved as authored. Italic accents marked with `*asterisks*` to preserve
the serif emphasis.

---

## Shared chrome

### Topbar (sticky, marketing routes only)

**Brand mark** (links to `/`):
- "*O*ri" (serif italic on the leading O; lines 1079, 1700)

**Nav links** (in order):
- "Capabilities" → `/capabilities` (was `#capabilities` in source)
- "Flow" → `/flow` (was `#flow`)
- "Creators" → `/creators` (was `#profile` in source)
- "System" → `/system` (was `#system`)

**NavCTA pill** (with `→` arrow icon, mono-styled small text):
- "Launch" → `/today` (source 1086–1088 routed at `#flow`; rebuild routes to `/today` per
  `IA.md` §3)

### Hero-tag (pulsing green ok-dot, used on `/` only)

**Eyebrow string** (mono):
"Now on Initia · v0.1"

### Footer (4-col + bottom strip; marketing routes)

**Brand block (col 1)**
- Brand mark + name "*O*ri"
- Long description (mono-n class, paragraph): "Ori is a chat app where your friends, your
  funds, and your AI agents live on the same screen. Built on Initia."

**Product column (col 2)**
- Heading: "Product"
- Links (in order):
  - "Capabilities" → `/capabilities`
  - "Flow" → `/flow`
  - "Creators" → `/creators`
  - "System" → `/system`

**Developers column (col 3)**
- Heading: "Developers"
- Links:
  - "Agent SDK" → (placeholder `#`)
  - "MCP server" → (placeholder `#`)
  - "Paywall API" → (placeholder `#`)
  - "GitHub" → (placeholder `#`)

**Legal column (col 4)**
- Heading: "Legal"
- Links:
  - "Privacy" → (placeholder `#`)
  - "Terms" → (placeholder `#`)
  - "Keys" → (placeholder `#`)

**Bottom strip (left)**
"© 2026 Ori Labs — All quiet."

**Bottom strip (right)**
"v 0.1 · ● all systems green" (the bullet is rendered with `color: var(--ok)`)

---

## /

**Page name**: Landing

**Hero-tag** (eyebrow, mono):
"Now on Initia · v0.1"

**Headline** (verbatim, italic accent):
"Messages that *move* money."

**Subhead** (verbatim):
"Ori is a chat app where your friends, your funds, and your AI agents share one surface. One
name everywhere. Settlement in a hundred milliseconds. Nothing to confirm."

**Buttons / CTAs**:
- "Open the app" (with `→` arrow icon, `.btn-primary`) → `/today` (source 1113 routes to
  `#flow`; rebuild routes to `/today` per `IA.md` §3)
- "See it work" (`.btn-ghost`) → `/capabilities` (source 1117 routes to `#capabilities`)

### Hero device (chat preview, decorative)

**Chat header**:
- Name string (with muted .init suffix): "mira.init" (rendered as `mira` + dim `.init`)
- Status: "typing…"

**Chat body**:
- Inbound bubble: "dinner at nobu, $64.80 split 4 ways?"
- Outbound bubble: "sending now"
- PayCard label (mono uppercase): "Sent · mira.init"
- PayCard amount (mono tnum): "$16.20"
- PayCard meta (mono): "Landed · 97ms · 0x4a…b3c2"
- Inbound bubble: "🫡"

**Chat input**:
- Pill placeholder: "Message…"

### StatsRibbon (4-up, top+bottom hairline)

**Stat 1**
- Number (mono tnum): "97" + suffix "ms"
- Caption: "median settlement"

**Stat 2**
- Number: "1" + suffix "%"
- Caption: "creator tip fee"

**Stat 3**
- Number: "0"
- Caption: "wallet popups"

**Stat 4**
- Number (no suffix): "e2e"
- Caption: "encryption by default"

### Mono-formatted strings on this page

- "Now on Initia · v0.1"
- "mira" (with dim ".init" suffix)
- "typing…"
- "Sent · mira.init"
- "$16.20"
- "Landed · 97ms · 0x4a…b3c2"
- "97ms" (stat key)
- "1%" (stat key)
- "0" (stat key)
- "e2e" (stat key)

**Footer**: see Shared chrome → Footer.

---

## /capabilities

**Page name**: Capabilities

**Eyebrow** (mono, uppercase):
"01 · Capabilities"

**Headline** (verbatim, italic accent):
"Payments, messages, and agents *on the same surface*."

**Subhead** (verbatim):
"Six primitives. No feature menu. Everything Ori does, it does from a single conversation."

> **Note**: source says "Six primitives" but the grid actually contains **eight** OS-window
> panels (per `IA.md` route map: panel-big × 2 + 3-col × 2 = 8). Source/asset mismatch — see
> `## Tone audit` below.

### Panel 1 — `/send` (panel-big, kp.send)

**Window chrome (mono)**:
- Path: `/send`
- Tag (right): `kp.send`

**Headline** (in-panel `.h`):
"*Pay* without leaving the chat."

**Body copy** (`.p`):
"Tap $, type a number, send. No recipient form, no gas picker, no confirmation modal. The
money lands inside the conversation as a card both sides see at the same moment."

**Viz** (Keypad):
- Amount row (mono tnum): "$" + "42" + cursor
- Keys (mono): "1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · . · 0 · ⌫"

### Panel 2 — `/identity` (panel-big, id.graph)

**Window chrome (mono)**:
- Path: `/identity`
- Tag: `id.graph`

**Headline**:
"One name, *everywhere*."

**Body copy**:
"Your .init name is your chat handle, your payment address, your profile URL, and your agent
endpoint. No copy-paste. No QR codes. No forks of who you are."
(`.init` rendered in mono)

**Viz** (NetworkSVG node labels, mono):
- Center node: "you.init"
- Outer nodes: "mira", "alex", "jamie", "sam"

### Panel 3 — `/gift` (gft.create)

**Window chrome**:
- Path: `/gift`
- Tag: `gft.create`

**Headline**:
"*Gift* a link, not a form."

**Body copy**:
"Wrap a payment. Share the URL. First tap claims it, even before they've set up Ori."

**Viz** (GiftPreview):
- Pin (mono): "For you"
- Amount (mono tnum): "$50"
- Note: "happy birthday, m"

### Panel 4 — `/agent` (mcp.ori)

**Window chrome**:
- Path: `/agent`
- Tag: `mcp.ori`

**Headline**:
"Agents that *actually* pay."

**Body copy**:
"Every action a user can take, an agent can take too — over a standard API, with no human in
the loop."

**Viz** (Terminal lines, mono):
- "› tip alice.init 5 USD — \"for the stream\"" (prompt char `›`, dim aside in `.dim`)
- "resolving .init → 0xc2…8d" (`.dim`)
- "signing with grant · 24h" (`.dim`)
- "✓ landed · 94ms · 0xa1…f7" (`.ok` class)
- "done" + blinking cursor

### Panel 5 — `/stream` (flow.live)

**Window chrome**:
- Path: `/stream`
- Tag: `flow.live`

**Headline**:
"*Stream* by the second."

**Body copy**:
"Pay consulting, subscriptions, or attention as a continuous flow. Stops when anyone says
stop."

**Viz** (StreamProgress rows, mono tnum values):
- Row: "per second" / "$0.0139"
- Row: "elapsed" / "00:48:12"
- (animated bar)
- Row: "streamed" / "$40.19"

### Buttons / CTAs

- (Implicit per `IA.md` §1) "Open the app" `.btn-primary` → `/today`

### Mono-formatted strings on this page

- "01 · Capabilities" (eyebrow)
- "/send", "kp.send", "/identity", "id.graph", "/gift", "gft.create", "/agent", "mcp.ori",
  "/stream", "flow.live" (window chrome paths/tags)
- "$42", "$50", "$0.0139", "00:48:12", "$40.19" (viz numerics)
- ".init" (inline tokens in body copy)
- "you.init", "mira", "alex", "jamie", "sam" (network labels)
- "› tip alice.init 5 USD — \"for the stream\""
- "resolving .init → 0xc2…8d"
- "signing with grant · 24h"
- "✓ landed · 94ms · 0xa1…f7"

**Footer**: see Shared chrome → Footer.

---

## /flow

**Page name**: Flow

**Eyebrow** (mono, uppercase):
"02 · Flow"

**Headline** (verbatim, italic accent):
"A single gesture from *conversation* to settled."

**Subhead** (verbatim):
"Three surfaces. One continuous thought. Roll your pointer across them."

### FlowStage — Window 1 (WinChats)

**Window-bar title**: "Ori · Chats"

**Search**:
- Placeholder: "Search names…"
- Kbd hint (mono): "⌘K"

**Chat-item rows** (avatar · name · time · preview, optional unread badge):

| Avatar | Name | Time | Preview | Badge |
|---|---|---|---|---|
| M | mira.init | now | typing… | 2 |
| A | alex.init | 2m | ⚡ Sent $12 · "thx for coffee" | — |
| J | jamie.init | 14m | split for dinner tomorrow? | — |
| S | sam.init | 1h | stream.ended · $42.70 total | — |
| · | studio (3) | yday | rent for march · 4 paid | — |
| L | lina.init | yday | Gift claimed · $25 | — |

### FlowStage — Window 2 (WinThread)

**Window-bar title**: "mira.init"

**Thread head**:
- Avatar (M, ringed)
- Name: "mira.init"
- Status: "⚡ active · e2e encrypted"

**Thread body**:
- Inbound: "dinner at nobu, $64.80 split 4 ways?"
- Outbound: "sending now"
- PayCard label: "Sent · to mira.init"
- PayCard amount: "$16.20"
- PayCard meta: "Landed · 97ms"
- Inbound: "🫡 thanks"
- Inbound: "want me to charge j and a too?"
- Outbound: "yes pls"

**Thread input**:
- "$" prefix
- Placeholder: "Message mira…"

### FlowStage — Window 3 (WinSend)

**Window-bar title**: "Send"

**Recipient row**:
- Name: "mira.init"
- Address (mono): "0xc29d…8a4f"
- Dismiss control: "×"

**Amount block**:
- Big amount (mono tnum): "$" + "16.20"
- Balance row: "Balance · $245.00 USD"

**Keypad**: same 12-key set as Capabilities (1–9, ., 0, ⌫)

**Send-foot CTA**:
- "Send · $16.20" (with `→` arrow)

### StatsRibbon (reused on this page per `IA.md` §1)

Same four stats as `/`: 97ms median settlement / 1% creator tip fee / 0 wallet popups /
e2e encryption by default.

### CTA card (per `IA.md`, new but uses `.btn-primary`)

- "Try sending a payment to yourself" → `/send`

### Mono-formatted strings on this page

- "02 · Flow" (eyebrow)
- "⌘K" (kbd hint)
- "now", "2m", "14m", "1h", "yday" (chat-item times)
- "mira.init", "alex.init", "jamie.init", "sam.init", "studio (3)", "lina.init" (chat
  names)
- "0xc29d…8a4f" (recipient address)
- "$16.20", "$245.00 USD", "$12", "$42.70", "$25" (amounts)
- "Landed · 97ms"

**Footer**: see Shared chrome → Footer.

---

## /creators

**Page name**: Creators

**Eyebrow** (mono, uppercase):
"03 · Creators"

**Headline** (verbatim, italic accent):
"A profile, a tip jar, *and a stage*."

**Subhead** (verbatim, mono inline):
"Every .init name has a public home at ori.chat/name — no setup, no theme picker, no shop
to configure."
(`.init` rendered in mono)

### LinktreeProfile — mira.init mock

**Profile head**:
- Avatar (xl, M, gradient pink)
- Name (serif italic): "mira"
- Verified badge SVG (accent-filled checkmark star)
- Tag (`.h` 13px): "videographer · lisbon"
- Handle (mono): "mira.init · 0xc29d…8a4f"

**Bio** (paragraph):
"Short films, travel cuts, and the occasional slow-motion rain. Tips go straight to better
gear and coffee for the team."

**lt-stats** (3-up, hairline-bordered):
- "$4,280" / "TIPPED"
- "128" / "SUBSCRIBERS"
- "2.1k" / "FOLLOWERS"

**Tip block**:
- Section label (mono uppercase): "TIP MIRA"
- Quick-amount chips: "$1", "$5" (accent), "$10", "$25", "custom"
- CTA button: "Send tip →"

**lt-links** (4 link rows, emoji + label):
- "🎬  Latest film · \"Lisbon at 4am\""
- "📸  Instagram · @mira.films"
- "🔓  Unlock · behind-the-cut ($3)"
- "☕  Subscribe · monthly ($9)"

**Profile tabs**:
- "Recent activity" (active)
- "Paywalls"
- "Subscribers · 128"

**Feed** (5 rows; avatar · txt · amt · time):

| Who | Action | Amount | Time |
|---|---|---|---|
| alex.init | tipped — *"the golden hour one was perfect"* (serif italic on quote) | $5 | 2m |
| sam.init | unlocked `film/behind-the-cut` (mono path) | $3 | 11m |
| jamie.init | subscribed — monthly | $9 | 34m |
| lina.init | tipped | $20 | 1h |
| agent.claude | paid paywall — `research/slow-rain` (mono path) | $1 | 2h |

### Explainer cards (4-up, derived per `IA.md` from §01 Capabilities + §03 sub-copy)

- "How tipping works" (derived from §01)
- "Subscriptions" (derived from `lt-link` "Subscribe · monthly ($9)")
- "Paywalls" (derived from §01 paywall panel)
- "Agent payouts" (derived from §01 `/agent` panel)

> **Note**: per `IA.md` route map line 80, exact card copy not in source — synthesise from
> `/gift`, `/stream`, `/agent` panel `.p` text and `Subscribe · monthly ($9)` lt-link copy.

### CTA pair (per `IA.md`)

- "Claim your name" `.btn-primary` → `/onboard`
- "Browse creators" `.btn-ghost` → `/discover`

### Mono-formatted strings on this page

- "03 · Creators" (eyebrow)
- ".init" (inline in subhead)
- "mira.init · 0xc29d…8a4f" (handle)
- "$4,280", "128", "2.1k" (stats numbers)
- "TIPPED", "SUBSCRIBERS", "FOLLOWERS", "TIP MIRA" (stat / section labels)
- "$1", "$5", "$10", "$25" (chip amounts)
- "$3", "$9", "$5", "$20", "$1" (feed amounts)
- "2m", "11m", "34m", "1h", "2h" (feed times)
- "film/behind-the-cut", "research/slow-rain" (mono paths in feed)

**Footer**: see Shared chrome → Footer.

---

## /system

**Page name**: System

**Eyebrow** (mono, uppercase):
"05 · System"

**Headline** (verbatim, italic accent):
"The pieces that *make* the whole."

**Subhead** (verbatim):
"Four primitives: type, color, radii, motion. Each one does one job, and does it the same
way everywhere in the product."

### DSGrid (4 cards)

**Card 1 — Type** (`type-sample`):
- Label: "Type"
- "CAPTION · 11" (size-xs)
- "Body 13 — Geist regular" (size-sm)
- "Subhead 18 — tight tracking" (size-md)
- "*D*isplay 32" (size-lg, serif italic on the leading D)

**Card 2 — Color**:
- Label: "Color"
- Swatches (4): "bg", "surf", "ink", "accent"

**Card 3 — Radii**:
- Label: "Radii"
- 4 ring-radius blocks
- Caption (size-xs, mono): "4 · 10 · 16 · FULL"

**Card 4 — Motion**:
- Label: "Motion"
- Animated motion-bar
- Caption (size-xs, mono): "EASE · 0.2 0.7 0.2 1"

> **Open question (deferred to `DECISIONS.md`)**: an additional 18-Move-module grid
> (`payment_router / gift_packet / …`) currently exists on the deployed `/system` page but
> has **no source in the reference**. `IA.md` §6 flags this as TBD and references "16 vs 18
> Move modules". Do not invent copy here without `DECISIONS.md` resolution.

### Mono-formatted strings on this page

- "05 · System" (eyebrow)
- "CAPTION · 11"
- "4 · 10 · 16 · FULL"
- "EASE · 0.2 0.7 0.2 1"
- "bg", "surf", "ink", "accent" (swatch labels)

**Footer**: see Shared chrome → Footer.

---

## (Tooltips, toasts, empty states — global notes)

The reference (`Ori-landing.html`) is a **static, non-interactive** marketing single-page.
There are **no tooltips, toasts, or empty-state strings** in the canonical source — every
piece of copy is presentational. The interactive `Ori_-_standalone.html` build has a
keypad/threadlist demo with click handlers, but no tooltip / toast / empty-state copy
either (verified by absence of `aria-label`, `title=`, `toast`, `empty` strings in the
decoded body).

Empty-state and toast copy listed in `IA.md` for app routes (`/paywall/mine` empty card,
`/predict` Auto-sign warning banner, etc.) are **not present in the reference** — they are
new copy to be authored in Phase 3 with sign-off from `DECISIONS.md`.

---

## Tone audit

**Exclamation marks**: **0** in canonical (`Ori-landing.html`). Confirms the "Quiet by
default" philosophy stated in §04. Pass.

**Marketing-fluff phrases**: **0** in canonical. No "revolutionize", no "next-gen", no
"Welcome to the future of...", no "cutting-edge", no "seamless", no "leverage", no
"game-changer". Pass.

The closest the canonical comes to a marketing claim is the §04 Philosophy line "100ms
settlement is not a feature bullet — it's the only reason in-chat payments stop feeling
bolted on. Without it, this UI would be a lie." This is **deliberately self-aware**, not
fluff — it names the failure mode rather than the win. Keep verbatim.

**Placeholder / TODO / Lorem**: **0** instances. Pass.

**Profanity / unsafe words**: **0**. Pass.

### Inconsistencies / drift

1. **"Six primitives" vs eight panels** (`Ori-landing.html` 1186): subhead claims "Six
   primitives" but the cap-grid renders **eight panels** (panel-big × 2 + 3-col × 2 = 8).
   Recommend: update subhead to "Eight primitives" **OR** consolidate the grid to six. If
   the brand commits to six, drop the third row (kept: send, identity, gift, agent, stream
   — and a sixth TBD). Flag for `DECISIONS.md`.

2. **"chat app" vs brief's "chat wallet"** (`Ori-landing.html` 1108, 1703): both the hero
   subhead and the footer mono-n use the phrase "chat app where your friends, your funds,
   and your AI agents …". The Phase-2 brief that initiated this audit used "chat wallet"
   verbatim. Source wins; do not adopt "chat wallet". This audit's instructions quoted the
   brief, not the source — the source is canonical per `IA.md` line 3.

3. **"Sixteen vs Eighteen primitives"** (raised by Phase-2 brief and `IA.md` §6.1): the
   reference does **not** use either word. Both `Six primitives` (Capabilities subhead) and
   `Four primitives` (System subhead) are in the canonical. The "16 vs 18 primitives"
   debate refers to the deployed `/system` page's invented Move-modules grid, **not** the
   reference. Keep `Four primitives` for the System DSGrid; resolve the modules-grid count
   only after `DECISIONS.md`.

4. **Topbar "Launch" CTA destination**: source line 1086 routes `Launch` to `#flow`; per
   `IA.md` §3 the rebuild routes it to `/today`. Confirm in `DECISIONS.md` that the change
   is intended (it is, per the brief — but worth recording).

5. **Hero CTAs destinations**: source 1113 routes "Open the app" to `#flow`, source 1117
   routes "See it work" to `#capabilities`. Rebuild per `IA.md` routes them to `/today`
   and `/capabilities` respectively. Confirm in `DECISIONS.md`.

6. **Footer Product link "Creators"**: source 1712 anchor `#profile` (the section ID is
   `id="profile"`, not `id="creators"`). Rebuild route is `/creators`. Acceptable swap.

7. **"v 0.1" vs "v0.1"** (footer bottom-strip line 1736): footer renders **with a space**
   ("v 0.1") while hero-tag renders **without** ("v0.1", line 1102). Inconsistent
   formatting of the version literal. Recommend: pick one and apply globally. Suggest
   `v0.1` (mono, no space) — matches the way the same string is used in product chrome.

8. **"$245.00 USD" vs "$16.20" without currency suffix** (WinSend recipient amt-box, line
   1478 and 1477): the balance line says `$245.00 USD` while the amount above says
   `$16.20`. Consistent everywhere else in the site is currency-symbol-only ("$16.20",
   "$5", "$50"). Recommend: drop the trailing "USD" from the balance line for consistency.

9. **"e2e" stat suffix** (line 1172): "e2e" is the only stat without a numeric value or a
   suffix glyph. Reads fine in context, but accessibility-wise the screen-reader pronounces
   it "ee-two-ee". Recommend: add an `aria-label="end-to-end encrypted"` on the
   `.stat .k` element. Copy stays the same.

10. **Status string casing on chat-items** (lines 1387, 1401, 1408, 1415):
    `"⚡ Sent $12 · \"thx for coffee\""`, `"stream.ended · $42.70 total"`,
    `"rent for march · 4 paid"`, `"Gift claimed · $25"`. Mixed sentence-case and lower-case
    leads. The site's voice elsewhere is **lower-case-default** (chat bubbles "dinner at
    nobu", "sending now", "want me to charge j and a too?"). Recommend: lower-case
    `"sent"`, `"gift claimed"` to match. **OR** capitalise the others. Pick one rule.

11. **"All quiet" footer signature** (line 1735): `"© 2026 Ori Labs — All quiet."` — sets
    the brand voice perfectly. Keep verbatim, do not rewrite.

12. **"all systems green" + green dot** (line 1736): the `●` is a literal U+25CF char, not
    an SVG. Make sure the rebuild keeps it as a styled span (`color: var(--ok)`) rather
    than letting the markdown linter normalise it to "•".

---

## Reconciliations

Divergences between `Ori-landing.html` (canonical) and `Ori_-_standalone.html` (decoded).
Standalone is **not authoritative** per `IA.md` line 4 — but flagged here for visibility.
For each: which to use, why.

| # | Field | Landing (canonical) | Standalone | Recommendation | Why |
|---|---|---|---|---|---|
| R1 | Page `<title>` | `Ori — Messages that move money` | `Ori — Messages that move money. Built on Initia.` | **Use landing** + meta description | Title length matters for SERP and tab; trail "Built on Initia." into `<meta name="description">` instead of the title. |
| R2 | Hero headline | `Messages that *move* money.` (one line) | `Messages that move *money*. And the agents that move it for you.` (two lines) | **Use landing** | Tighter, holds the serif accent on the verb (`*move*`), avoids the second-line fluff. |
| R3 | Hero subhead | `Ori is a chat app where your friends, your funds, and your AI agents share one surface. One name everywhere. Settlement in a hundred milliseconds. Nothing to confirm.` | `Tip alice.init five bucks for the new track. Settles in 100ms inside the conversation. Same surface for friends, creators, and AI agents — no popups, no addresses, no other tabs.` | **Use landing** | Landing is descriptive ("what Ori is"); standalone is a use-case lede. The IA's voice is descriptive-quiet, not scenario-led. |
| R4 | Hero-tag | `Now on Initia · v0.1` (mono pill, pulsing dot) | `A new surface for money` (eyebrow, no pill) | **Use landing** | Pill conveys network + version honestly. Standalone slogan is borderline marketing-fluff. |
| R5 | Hero CTAs | `Open the app` / `See it work` | `Open the demo →` / `See what it does` | **Use landing** | "Open the app" matches the destination (`/today`); "See it work" is shorter and less casual than "See what it does". |
| R6 | Stats | 4 stats (97ms / 1% / 0 / e2e) | 4 specs (100ms / $0.002 / .init / 24h) | **Use landing**, but **adopt** standalone's `$0.002 per send` cost stat | Landing's `0 wallet popups` is brand-defining; keep. But add a fee transparency stat — currently the site never names a per-tx cost. Suggest swapping `e2e` for `$0.002 per send` on the `/today` `WeeklyStats` widget where space is tight. Marketing keeps `e2e`. |
| R7 | Capabilities subhead | `Six primitives. No feature menu. Everything Ori does, it does from a single conversation.` | `Six primitives. No feature menu. Each one happens inside the conversation—no other tabs, no popups, no signing.` | **Use landing**, with edit | "Each one happens inside the conversation" is more concrete than "Everything Ori does, it does from a single conversation". Recommend hybrid: "Six primitives. No feature menu. Each one happens inside the conversation." (Drops the trailing "no other tabs, no popups, no signing" — the rest of the page already proves that.) |
| R8 | Capabilities title | `Payments, messages, and agents *on the same surface*.` | `Everything Ori does, *on one surface.*` | **Use landing** | Names the three nouns up front (payments / messages / agents). Standalone is vaguer. |
| R9 | Hero recipient name | `mira.init` (videographer in Lisbon) | `alice.init` (musician with a "new track") | **Use landing (`mira`)** | `mira.init` recurs through the entire reference (chat preview, FlowStage, LinktreeProfile, feed, Send window). Standalone's `alice` only appears in standalone hero. Keep one canonical persona. |
| R10 | `/identity` panel headline | `One name, *everywhere*.` | `One name. One graph. One you.` | **Use landing** | Landing reads as a fact; standalone is a slogan ("you" pronoun direct address feels Apple-ad). |
| R11 | `/agent` panel headline | `Agents that *actually* pay.` | (no equivalent — paywall card is "Paywalls agents can pay.") | **Use landing for `/agent`** + adopt standalone's `Paywalls agents can pay.` for the future paywall panel | These are two different ideas. Keep both. |
| R12 | `/stream` panel headline | `*Stream* by the second.` | `Pay by the second.` | **Use landing** | Verb "Stream" is the product noun; "Pay by the second" is generic. |
| R13 | `/gift` panel | `*Gift* a link, not a form.` + body | `Gift cards in chat.` + body | **Use landing** | "A link, not a form" is a sharper diff vs. competitor mental model (gift-card forms). |
| R14 | Philosophy /02 | `*Fast* enough to feel native.` + "100ms settlement is not a feature bullet — it's the only reason in-chat payments stop feeling bolted on. Without it, this UI would be a lie." | `Speed you don't notice.` + "~100ms settlement on Initia. No \"pending.\" No \"confirming.\" If you can see it spinning, we did it wrong." | **Use landing**, fold standalone's "No 'pending'. No 'confirming'." as a sub-bullet | Landing's body is the strongest piece of writing in the whole site — keep verbatim. Standalone's "If you can see it spinning, we did it wrong" is also strong; salvage one of those lines into a Phase-3 micro-essay if needed. |
| R15 | Philosophy /03 | `Built to *hand off*.` ("Non-custodial. Open identity. Export your wallet…") | `Agents as citizens.` ("Auto-sign once, agents act for 24h…") | **Use landing for /03**; promote standalone's `Auto-sign once, agents act for 24h. Scoped, revocable, observable.` to a tooltip on the app `Header`'s ⚡ToggleAuto-sign control | Both are true; the one is brand commitment, the other is feature definition. Keep brand for marketing, feature copy for product chrome. |
| R16 | Footer brand description | `Ori is a chat app where your friends, your funds, and your AI agents live on the same screen. Built on Initia.` | `Messages, money, and agents — equal citizens on a single surface. Built on ~Initia~ for ~100ms settlement.` | **Use landing** | Landing is the same voice as the hero subhead. Standalone introduces "equal citizens" which only the standalone Philosophy uses. |
| R17 | Footer bottom-strip | `© 2026 Ori Labs — All quiet.` + `v 0.1 · ● all systems green` | `ORI · 2026 · Built on Initia` + `Back to top ↑` | **Use landing** | "All quiet." is the brand. The `Back to top ↑` link is fine but belongs as a separate utility, not in the copyright line. |
| R18 | Footer Product nav | `Capabilities / Flow / Creators / System` | `Capabilities / Demo / Creators / System` | **Use landing** | "Flow" is the section name; "Demo" was a standalone-only label for the interactive product stage. Rebuild has both `/flow` (marketing) and `/today` (app) routes — neither maps to "Demo". |
| R19 | Footer Resources column | `Developers` (Agent SDK / MCP server / Paywall API / GitHub) | `Resources` (Docs / API / Brand kit) | **Use landing** | Landing's column is more product-forward (names actual surfaces). Standalone's is generic. |
| R20 | Footer Connect column | (no equivalent — landing has Legal: Privacy / Terms / Keys) | `Connect` (Twitter / Discord / GitHub) | **Use landing's Legal**, add a new `Connect` column (Twitter / Discord) — but **do not** remove Legal | Site needs Legal links for compliance. Standalone deleted them. Recommend Phase 3 footer = 5 columns: Brand / Product / Developers / Connect / Legal. |
| R21 | Topbar nav order | `Capabilities · Flow · Creators · System` (+ Launch CTA) | `Capabilities · Product · Creators · System` (+ "Built on Initia" pill + "Try the demo →" button) | **Use landing's labels**, **promote** standalone's "Built on Initia" pill to the brand area | "Flow" beats "Product" (more specific). "Built on Initia" pill is honest network-disclosure and pairs with the ok-dot pulse. |
| R22 | Persona for product demo | mira (videographer · lisbon) | mira (videographer · lisbon) — same | **No divergence** | Standalone's `view-profile` actually uses `mira.init · 0xc29d…8a4f` — same persona as landing. Confirms `mira` is canonical. |
| R23 | Philosophy header | `*The restraint* is the product.` | `The restraint *is* the product.` | **Use landing** (italic on "The restraint") | Landing: italic on the noun phrase ("The restraint" is the subject). Standalone: italic on the copula `is`. Subject-italic reads as the stronger emphasis. Tie-breaker: landing is canonical. |
| R24 | System section presence | Has standalone `#system` slab with DSGrid (4 cards) | **No standalone system section as a marketing slab** — only embedded inside the product demo's `view-system` tab | **Use landing** | The marketing site needs a `/system` page; standalone's tab-inside-app pattern doesn't translate to a marketing route. |
| R25 | Color palette names in DSGrid | `bg / surf / ink / accent` (semantic) | `Sky / Root / Halo / Vine / Bloom` + hex codes (named) | **Use landing's semantic names** for the marketing DS card; **adopt** standalone's `Sky / Halo / Vine / Bloom` named tokens internally if the brand wants them | Marketing audience reads `bg / ink / accent` — clear at a glance. Internal docs / `/system` deep-dive page can introduce the named tokens. |
| R26 | Stream `per second` value | `$0.0139` | (not present in standalone) | **Use landing** | Specific micro-amount conveys "by the second" credibly. |
| R27 | PayCard `Sent` label | `Sent · mira.init` (hero) / `Sent · to mira.init` (FlowStage thread) | `SETTLED · INITIA` | **Use landing**, but **standardise** between the two landing variants | Hero says `Sent · mira.init`, thread says `Sent · to mira.init` — pick one. Recommend `Sent · mira.init` (no `to`). The space saving + plain noun reads better next to a serif `to`. |
| R28 | PayCard meta | `Landed · 97ms · 0x4a…b3c2` (hero) / `Landed · 97ms` (thread) | `100ms · ✓` + `SETTLED · INITIA` label | **Use landing** | "Landed" is ownership of the brand timing claim; standalone's `100ms ✓` is colder. Keep tx hash truncation in hero, drop it in thread (already done). |

---

End of CONTENT.md.
