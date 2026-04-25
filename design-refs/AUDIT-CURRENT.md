# AUDIT — current state, ori-chi-rosy.vercel.app

Captured 2026-04-19 by Agent 3 (audit-current.mjs). All 21 routes returned HTTP 200.
PNGs in `design-refs/audit-current/<slug>-<viewport>.png` (slug map: `/` → `home`, `/paywall/new` → `paywall-new`, `/paywall/mine` → `paywall-mine`, others = path with leading `/` trimmed).

Reference baseline: `design-refs/INVENTORY.md` + `design-refs/source-shots/landing-{desktop,tablet,mobile}.png`.

Two distinct shells are in use:
- **Marketing shell** — used by `/`, `/capabilities`, `/flow`, `/creators`, `/system`. Mostly aligned to the Ori-landing.html reference; has the proper sticky topbar with brand lockup, nav links, and "Launch" pill.
- **App shell** — used by every other route (`/today`, `/create`, `/streams`, `/subscriptions`, `/squads`, `/lucky`, `/paywall/*`, `/predict`, `/send`, `/settings`, `/discover`, `/chats`, `/onboard`, `/ask`, `/portfolio`). This shell is broken across the board: no max-width container, no horizontal padding, missing typography rhythm, no backdrop ambient gradients, content butts the left edge at x=0.

**`/today`, `/chats`, `/settings` do NOT render their advertised pages — all three show the marketing landing page. The Vercel SPA fallback (or rewrites) is mis-routing these paths.**

---

## /

HTTP 200.

1. **Wrong typography (hero title)** — Hero `<h1>` "Messages that *move* money." renders at much smaller scale than reference. On desktop 1440 the headline is roughly 56–64px tall vs reference ~104px (`clamp(42px,7.2vw,104px)`). Letter-spacing/line-height also looser.
2. **Misalignment (hero columns)** — Reference puts hero copy on the left, device mockup on the right at desktop with ample whitespace; current build has device pushed to the far right edge (overlap with viewport boundary, no right gutter).
3. **Missing component (stats ribbon values)** — Reference shows `97 ms / 1 / 0 / e2e`. Current shows `97 / 1 / 0 / e2e` but the `.sfx` "ms" / "%" units are missing on the desktop view (mobile shows them). Inconsistent across viewports.
4. **Wrong color / opacity (sub-text)** — `.hero-sub` paragraph reads at full ink instead of `--ink-2` (~70% opacity). Should be muted secondary text.
5. **Missing backdrop ambient** — No indigo radial-glow backdrop behind hero device. Reference has a clear violet/indigo halo around the phone mockup. Current is flat near-black.
6. **Wrong spacing (capabilities grid)** — `.cap-grid` panels are crammed; on desktop the 8 cards stack 4×2 in current build with ~12px gap, reference uses mixed 1.4fr/1fr top row + 3-col rows after, with ~18–24px gap. Cards also significantly shorter than reference.
7. **Missing component (Flow window labels)** — Reference §02 Flow uses three OS-style `.window` panels (WinChats / WinThread / WinSend) side-by-side at desktop. Current shows only two windows (WinThread+WinSend) plus a numbered text list `01/02/03/04`. WinChats panel with chat-item rows is missing entirely.
8. **Missing component (Creators profile)** — Reference §03 uses Linktree-style profile mock. Current renders some items but hides the cover band, the verified badge SVG on avatar, the `.tip-bar` chip row ($1, $5 accent, $10, $25, custom), and `.profile-tabs`. The bottom `.feed` (5 activity rows) is also missing.
9. **Missing component (Philosophy section)** — Reference §04 shows three columns "01 Quiet by default / 02 Fast enough to feel native / 03 Built to hand off". Current homepage shows only the header text "*The restraint* is the product." cropped at the bottom — the three columns appear but truncated and scaled down vs reference.
10. **Missing animation** — `.pay-card` `@keyframes card-in` spring entry not visible (card present but no animation evident).
11. **Missing animation** — Hero-tag pulse on the green ok-dot not detectably animating; reference uses `@keyframes pulse` breathing ring shadow.
12. **Broken responsive (tablet 820)** — Hero device sits below the title at full width; reference tablet stacks copy + device with device aligned right. Current has device occupying entire width and crowding margins.
13. **Broken responsive (mobile 375)** — Stats ribbon collapses but the two action pills "Open the app" and "See it work" overflow horizontally, breaking the row.

## /capabilities

HTTP 200.

1. **Wrong typography (section title)** — "Sixteen primitives. *One conversation.*" renders Geist 500 weight roughly; reference uses Geist 400 with serif italic accent on "One conversation." The italic should be in `--font-serif` (Source Serif). Current italic looks like the same Geist family.
2. **Wrong color / opacity (capability items)** — Each capability row's eyebrow line (`SEND_PAYMENT`, `BULK_SEND`, etc.) renders too dim; the kicker text appears at ~30% ink, reference uses Geist Mono ~50% ink-2.
3. **Missing animation** — No `.reveal` IO fade-up on scroll evident; items pop in without the 0.9s opacity 0→1 + y 20→0 motion (reference's IntersectionObserver pattern).
4. **Missing component** — "Pick a flow and start *moving money*" CTA banner at bottom is present but the right-side accent button "Open the app" lacks the white pill styling; renders as a low-contrast rounded button.
5. **Wrong spacing (cap rows)** — Vertical gap between rows is ~8px; reference uses ~16–18px. Rows feel cramped.
6. **Misalignment (footer columns)** — Footer 4-col grid has columns starting at random x-positions on desktop — "Capabilities/Flow/Creators/System" column is offset slightly right of the brand block, "MCP server/A2A protocol" sits oddly. Reference aligns all column heads to the same baseline with even gutters.
7. **Broken responsive (mobile 375)** — Footer column "Capabilities/Flow/Creators/System" stays at desktop layout instead of stacking below the brand block; columns jam together with text overlap.

## /flow

HTTP 200.

1. **Missing component (Flow stage)** — Reference shows `.flow-stage` 3-column grid at desktop with three OS-style `.window` panels (WinChats search row + chat-item rows; WinThread head + msgs + pay-card; WinSend keypad). Current shows ONE thread window only — WinChats and WinSend keypad windows are missing.
2. **Wrong typography (section title)** — "Conversation to *settled.*" renders correctly but at wrong size — looks ~52px vs reference ~72–80px.
3. **Missing component (numbered steps)** — Reference doesn't have a numbered step list; current page adds `/01 You open a chat /02 You tap the amount /03 You hit send /04 They see it land` text list. This is a bespoke addition to the route that doesn't match either the inventory or the landing reference.
4. **Wrong color / opacity (step numbers)** — `/02`, `/03`, `/04` mono labels render in dim ink-3, but the "01 / 02 / 03" placement doesn't have the same kicker style as the reference's section eyebrows.
5. **Missing animation** — `.pay-card` card-in animation not running. The pay card just appears static.
6. **Missing backdrop ambient** — No subtle indigo glow around the phone window; reference uses indigo shadow stack.
7. **Misalignment (CTA card)** — "Try sending *a payment* to yourself" CTA at bottom has the "Send a payment" button vertically miscentered relative to its parent box (button hugs left edge with no left padding).
8. **Broken responsive (tablet 820)** — Single window centered without the 3-column stack pattern that the reference uses.
9. **Wrong spacing** — Stats trio (`97ms / 0 / e2e`) at the bottom has uneven spacing; "97ms median settlement" sits flush left with no gutter to the next column.

## /creators

HTTP 200.

1. **Missing component (cover band)** — Reference profile mock has a colored indigo gradient cover band at top of the `.profile` card. Current has no cover band — avatar floats on plain dark.
2. **Missing component (verified badge SVG)** — Reference avatar has a verified-tick SVG overlay; current avatar shows just the "M" letterform on indigo circle.
3. **Missing component (tip-bar chips)** — Reference has `.tip-bar` row with $1 / $5 (accent filled) / $10 / $25 / custom chips + Send tip button. Current shows a single "Send tip" CTA without the chip row.
4. **Missing component (profile-tabs)** — Reference has tabs "Activity / Tips / Subs" beneath the link rows; current has no tab bar.
5. **Missing component (activity feed)** — Reference shows 5 activity items (avatar + text + mono amount + time). Current shows the empty `.feed` rows but only 3 of them and without the right-aligned mono amount column.
6. **Wrong typography (profile name)** — `mira.init` should render in serif with mono `.address` underneath. Current renders both in mono.
7. **Wrong color (stats-row dividers)** — Reference uses 1px vertical dividers between $4,280 / 128 / 2.1k. Current shows the values but the dividers are invisible (likely missing border-left).
8. **Wrong spacing (profile card)** — Profile card has no horizontal margin from page edges on desktop; reference centers it within max-width container with ~80px breathing room each side.
9. **Misalignment (lt-link rows)** — "Latest film", "Instagram", "Unlock $3", "Subscribe $9" rows have inconsistent right-edge alignment; some chevrons cut off near right edge.
10. **Broken responsive (tablet 820)** — Stats row $4,280 / 128 / 2.1k collapses incorrectly; column wraps below avatar without dividers.

## /system

HTTP 200.

1. **Wrong typography (section title)** — "The pieces that *make* the whole." renders smaller than reference (looks ~52px vs ~72–80px clamp).
2. **Wrong component (DSGrid contents)** — Reference §05 system has 4 cards: Type swatches / Color swatches / Radii row / Motion easings demo. Current page renders code blocks with JSON snippets (MCP / A2A / x402 sample HTTP responses) instead. The route's *content* is structurally different from the inventory spec.
3. **Missing component** — Type swatch table absent.
4. **Missing component** — Color swatch grid (`--bg`, `--surface`, `--line`, `--ink`, `--accent`, `--ok`) absent.
5. **Missing component** — Radii row (6 / 10 / 14 / 20 / 28) absent.
6. **Missing component** — Motion easings demo (3 animated bars) absent.
7. **Misalignment (module list)** — A 12-item grid `payment_router / gift_packet / agent_inbox / ...` uses 3 columns with uneven row heights and bumpy alignment.
8. **Wrong spacing** — Code blocks butt against right edge with no right padding on desktop.
9. **Broken responsive (mobile 375)** — Code JSON overflows horizontally; horizontal scroll inside but the `<pre>` block bleeds off-screen on the right with no inner padding.

## /today

HTTP 200.

1. **Missing component (entire page)** — `/today` returns the marketing landing page (identical to `/`) instead of a dashboard. Per inventory there is no `/today` in landing.html, so this should be a bespoke "today" surface (per app shell) but the SPA route is falling back to the homepage. **Critical routing bug.**
2. All defects from `/` apply here.

## /create

HTTP 200.

1. **Missing topbar component** — App shell uses minimal `Ori / Create  Sign in →` breadcrumb with no nav, no Launch pill, no `.topbar` blur+gradient. Reference INVENTORY §topbar prescribes brand lockup + nav (Capabilities/Flow/Creators/System) + Launch CTA pill. Current ditches all of this.
2. **Wrong spacing (page padding)** — Body content starts at x=0 with no left/right gutter. Should be inside a max-width ~1200–1280 container with ~24–32px page padding.
3. **Wrong typography (page title)** — "Every way to *move money* on Ori." renders at ~16–18px, no serif italic accent. Should be a section-title clamp.
4. **Wrong color (eyebrow)** — `04 · CREATE` eyebrow renders in dim grey but lacks Geist Mono uppercase tracking treatment.
5. **Missing backdrop ambient** — No indigo glow, no surface gradient — flat solid background.
6. **Missing animation** — No `.reveal` IO fade-in on the action grid; cards just appear.
7. **Wrong spacing (action grid)** — 2-column grid of Send/Bulk send/Open a stream/Subscription plan/etc. has rows touching one another with no vertical gap; horizontal gap ~4px.
8. **Wrong color (panel chrome)** — Action panels have no `.panel-chrome` 3-traffic-light dots + mono `/path` + right mono label header (per inventory cap panel pattern).
9. **Broken responsive (mobile 375)** — Single-column stack works but each action card has no internal padding; icon/title/sub all jam against the left edge.
10. **Wrong color (icon column)** — Action icons (paper plane, antenna, lock, etc.) render in flat grey instead of accent indigo.

## /streams

HTTP 200.

1. **Missing topbar** — Same issue as `/create`: app shell lacks the proper `.topbar` with full nav.
2. **Wrong spacing (page container)** — Content starts at x=0 (no left padding); form card "OPEN A NEW STREAM" stretches edge-to-edge instead of centered max-width.
3. **Wrong typography (page title)** — "Money by the *second.*" at ~16–18px — should be a section-title with serif italic accent at clamp size.
4. **Wrong color / opacity** — All paragraph text and labels render at full ink rather than `--ink-2`/`--ink-3` hierarchy.
5. **Missing backdrop ambient** — No backdrop gradient/glow.
6. **Missing component** — No section-eyebrow "01 · STREAMS" treatment matching reference (reference uses "01 · Capabilities" pattern).
7. **Wrong spacing (form fields)** — Field labels (RECIPIENT, TOTAL AMOUNT, DURATION) sit immediately atop their inputs with no gap; reference would use ~8px gap.
8. **Misalignment (Open stream button)** — "Open stream" CTA has no padding around the play-icon, sits at x=0 of its parent.
9. **Wrong color (active streams empty state)** — "No streams yet" empty card has very faint borders barely visible.
10. **Missing component** — No footer on this route. Reference has 4-col footer with brand + Product/Developers/Legal columns + bottom strip. Current page just ends after the empty state.
11. **Broken responsive (mobile 375)** — Form card extends edge-to-edge with content starting at x=0 (no margin).

## /subscriptions

HTTP 200.

1. **Missing topbar** — Same as `/create`/`/streams`: bare-bones app-shell header.
2. **Wrong spacing (page padding)** — Content starts at x=0.
3. **Wrong typography (title)** — "Recurring, *by design.*" at ~16–18px. Should be section-title clamp with serif italic.
4. **Misalignment (Subscribe / My plan tabs)** — The two tab buttons sit on a single line with no underline indicator and uneven horizontal spacing.
5. **Wrong color** — Eyebrow "SUBSCRIBE TO A CREATOR" at ~30% ink; PERIODS minus/plus stepper buttons have no visible borders.
6. **Misalignment (period stepper)** — `-`, `1`, `+` row: minus sits at x=0 of the box, `1` is centered, `+` sits at far-right edge — gap is asymmetric.
7. **Missing backdrop ambient** — flat black bg.
8. **Missing component (footer)** — No site footer.
9. **Missing animation** — No reveal-fade.
10. **Broken responsive (mobile 375)** — Form card edges hit viewport sides with 0 margin.

## /squads

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — Content flush left at x=0.
3. **Wrong typography (title)** — "Groups, *but lighter.*" at ~16–18px.
4. **Misalignment (CREATE A SQUAD / JOIN BY ID)** — Two columns side-by-side at desktop, but each column has different vertical heights (Create is shorter than Join). Should be height-matched per inventory's even-grid pattern.
5. **Misalignment (Join button)** — Join button (with people icon) sits flush at x=0 of its column with no left padding.
6. **Wrong color (input borders)** — Input fields for "the-lisbon-team" / "e.g. 42" have very dim hairline borders.
7. **Missing backdrop ambient** — flat bg.
8. **Missing component (footer)** — Absent.
9. **Broken responsive (mobile 375)** — Two columns stack but with no inter-card gap.

## /lucky

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — Content flush left at x=0.
3. **Wrong typography (title)** — "One pot, *one winner.*" at ~16–18px instead of section-title clamp.
4. **Misalignment (MAX PARTICIPANTS chips)** — `5 10 25 50 100` chips render as plain text spans without pill styling, sitting on one line with single-space separators only. Reference would use `.chip` pill styling.
5. **Misalignment (Open pool / Enter pool buttons)** — Both buttons sit flush at x=0 of their columns.
6. **Wrong color (panel)** — "POOLS YOU KNOW ABOUT" empty card has very faint border.
7. **Missing backdrop ambient** — flat bg.
8. **Missing component (footer)** — Absent.
9. **Broken responsive (mobile 375)** — Two-column form (Create/Join) stacks but Pool ID input bleeds edge-to-edge.

## /paywall/new

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — x=0 flush-left content.
3. **Wrong typography (title)** — "Gate a URL *behind a price.*" at ~16–18px.
4. **Misalignment (PAYWALL DETAILS card)** — Card has the lock/x402 right-aligned label, but at desktop the card width is fixed ~670px and doesn't fill or center within container — sits at the left edge.
5. **Misalignment (Publish paywall + My paywalls)** — Publish-paywall button sits flush at x=0 of card; "My paywalls" has different button styling (looks like a pill chip) without consistent button system.
6. **Wrong color (input borders)** — Input fields for title/content URL/price barely visible against background.
7. **Missing backdrop ambient** — flat bg.
8. **Missing component (footer)** — Absent.
9. **Broken responsive (mobile 375)** — Card edges hit viewport sides with 0 margin.

## /paywall/mine

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — x=0 flush-left content.
3. **Wrong typography (title)** — "Your *gated* links." at ~16–18px.
4. **Misalignment (CRITICAL: New paywall button)** — At desktop the "+ New paywall" indigo CTA sits half off the right edge of its container (truncated mid-button — only "New paywall" visible). Same defect on mobile and tablet — button overflows the card.
5. **Misalignment (Create your first button)** — Inside the "No paywalls yet" empty state, the indigo `+ Create your first` button sits truncated against the empty-state card right edge on desktop.
6. **Missing backdrop ambient** — flat bg.
7. **Missing component (footer)** — Absent.
8. **Wrong color (empty-state card)** — Border barely visible.
9. **Broken responsive (mobile 375)** — `+ New paywall` button still truncated at the right edge of its parent row.

## /predict

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — x=0 flush-left content.
3. **Wrong typography (title)** — "*Higher* or *lower?*" at ~16–18px.
4. **Wrong color (auto-sign warning)** — Orange/amber auto-sign warning banner has correct color but extends edge-to-edge, no max-width — looks like a bug bar.
5. **Misalignment (TOKEN row)** — `BTC ETH SOL BNB ATOM` chips render as plain text (no pill styling), spaced inconsistently.
6. **Missing component (chart)** — `BTC/USD` chart card is completely empty — just a horizontal line in the middle. Reference suggests a sparkline/sparkline-shaped viz at minimum.
7. **Misalignment (RESOLVES IN row)** — `60s / 5 min / 1 hr / 1 day` 4-column grid spans full container width on desktop; values floating without container chip styling.
8. **Misalignment (STAKE row)** — `0.1 / 0.5 / 1 / 5` row similarly bare.
9. **Misalignment (HIGHER / LOWER buttons)** — Both at x=0 of viewport, stacked without color (HIGHER green, LOWER red would be expected). Both render in plain ink with arrows only.
10. **Misalignment (RESOLVE · CLAIM card)** — `Resolve` and `Claim winnings` buttons sit on one row with uneven spacing and no visible button borders.
11. **Missing backdrop ambient** — flat bg.
12. **Missing component (footer)** — Absent.
13. **Broken responsive (mobile 375)** — RESOLVES IN / STAKE rows stay 4-column on mobile, items getting squashed (60s, 5 min wrap).

## /send

HTTP 200.

1. **CRITICAL — Modal blocking content** — A "FIRST SEND ON ORI / Three things about paying here." onboarding modal renders centered over the entire page with the underlying form blurred. The blur is so heavy the actual `/send` form is unreadable. Same defect on tablet and mobile (mobile modal pushes the form even further off-screen).
2. **Misalignment (modal)** — Modal sits roughly at viewport center but the close-X (✕) is positioned outside the top-left of the card, hovering in dead space.
3. **Misalignment (Got it button)** — "Got it — send my first one" CTA below the bullets has no button border/pill styling.
4. **Wrong color** — Modal backdrop is a flat dim — no proper dialog overlay treatment (no rgba 50% backdrop blocking pointer events visibly).
5. **Missing topbar** — Bare app shell behind the modal.
6. **Wrong spacing (page padding behind modal)** — The form (mostly hidden by blur) starts at x=0.
7. **Missing backdrop ambient** — flat bg.
8. **Missing component (footer)** — Absent.
9. **Broken responsive (mobile 375)** — Modal width nearly == viewport width; bullets text wraps oddly. Form behind is unusable.

## /settings

HTTP 200.

1. **Missing component (entire page)** — `/settings` returns the marketing landing page. No settings UI rendered. **Critical routing bug.**
2. All defects from `/` apply here.

## /discover

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — x=0 flush-left content; section rows extend ~95% of viewport width starting from x=0.
3. **Wrong typography (title)** — "Find your *people.*" at ~16–18px.
4. **Wrong color (section eyebrows)** — `TOP CREATORS` (gold trophy emoji), `RISING · LAST 24H` (green), `RECENTLY ACTIVE` (blue) eyebrows have semantic colors but the rows underneath have very faint borders barely visible.
5. **Wrong color (empty-state copy)** — "Nobody on this shelf *yet* — the first profile here gets the top slot." renders at ~30% opacity, hard to read.
6. **Missing component (creator cards)** — Reference would show creator preview cards inside each shelf; current shows only a single empty-state row per shelf.
7. **Missing backdrop ambient** — flat bg.
8. **Missing component (footer)** — Absent.
9. **Broken responsive (mobile 375)** — Each shelf row extends to viewport edge with 0 padding; eyebrow + empty row stack naturally but with inconsistent gaps.

## /chats

HTTP 200.

1. **Missing component (entire page)** — `/chats` returns the marketing landing page. No chats UI rendered. **Critical routing bug.**
2. All defects from `/` apply here.

## /onboard

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — x=0 flush-left content.
3. **Wrong typography (title)** — "Set up your *identity.*" at ~16–18px.
4. **Misalignment (5 step rows)** — All 5 onboarding rows (Sign in / Claim your .init name / Derive your E2E key / Publish pubkey on-chain / Create your profile) are width-clamped to roughly 30% of desktop viewport, but should fill the column. Each row also has the radio dot at extreme left with text starting after a tiny gap.
5. **Misalignment (Connect wallet button)** — Button sits flush at x=0 below the 5 rows with no left margin.
6. **Wrong color (radio circles)** — Step radio dots are filled grey rather than ringed/empty.
7. **Wrong color (step descriptions)** — Sub-text under each step renders at ~30% ink, very dim.
8. **Missing backdrop ambient** — flat bg.
9. **Missing component (footer)** — Absent.
10. **Missing animation** — No fade-up reveal.
11. **Broken responsive (mobile 375)** — Step rows still ~75% viewport-width with right-side dead space.

## /ask

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — x=0 flush-left content.
3. **Wrong typography (title)** — "Let Claude *spend* your INIT." at ~16–18px.
4. **Wrong color (code block)** — `claude_desktop_config.json` code block renders with off-black background but very faint border. The mono content is at full ink (good) but commenting/copy button is misaligned.
5. **Misalignment (Copy buttons)** — Multiple "Copy" labels sit at far-right of code blocks but at desktop they're at x=720 instead of x=container-right (e.g., x=1240). The code blocks don't use full container width.
6. **Wrong color (kicker)** — `01 · ASK`, `STEP 1 · CONNECT`, `STEP 2 · TRY A PROMPT DEMO` eyebrow colors render in mixed grey/cyan inconsistently.
7. **Misalignment (PAY A FRIEND / OPEN A PREDICTION / etc demo blocks)** — Each demo block has eyebrow + body but inconsistent left-indent — some have hanging indent, others flush.
8. **Missing backdrop ambient** — flat bg.
9. **Missing component (footer)** — Absent.
10. **Broken responsive (mobile 375)** — Code JSON overflows the container on the right; text bleeds beyond viewport.

## /portfolio

HTTP 200.

1. **Missing topbar** — Bare app shell.
2. **Wrong spacing (page padding)** — x=0 flush-left content.
3. **Wrong typography (title)** — "Your *whole* record." at ~16–18px.
4. **Missing component (entire body)** — Page only renders the title + sub + a "Connect wallet" button. No skeleton portfolio rows, no empty-state cards. Reference would show transaction history grid (payment / tip / gift / badge categories per inventory line "Every payment, tip, gift, and badge on one surface").
5. **Misalignment (Connect wallet button)** — Button sits at x=0 with no left margin.
6. **Wrong color (button)** — Button has bare hairline border, no fill, no pill rounding.
7. **Missing backdrop ambient** — flat bg.
8. **Missing component (footer)** — Absent.
9. **Missing animation** — No reveal-fade.
10. **Broken responsive (mobile 375)** — Same flush-left layout, button at x=0.

---

## Cross-cutting issues (apply to every app-shell route)

A. **No design-system shell** — All app routes share a stripped header (`Ori / <breadcrumb> Sign in →`), no `.topbar` blur+gradient, no nav links, no Launch CTA. Marketing routes have the correct topbar; app routes do not.
B. **No max-width container or page padding** — Every app-shell page renders content at x=0, no horizontal gutters.
C. **No backdrop ambient gradients** — None of the app routes have indigo radial-glow / surface-gradient backdrops.
D. **No `.reveal` IntersectionObserver fade-up** — App routes don't use the landing's animation primitive.
E. **No footer** — Every app-shell page is missing the 4-col footer + bottom strip ("© Ori — all quiet · Built on bridged INIT. No token launch. · all systems green pulsing dot"). Marketing routes include the footer.
F. **Wrong title typography** — All app-shell page titles render as ~16–18px Geist instead of section-title clamp(48–80px) with serif italic accent.
G. **Routing failure** — `/today`, `/chats`, `/settings` all serve the marketing landing page instead of their advertised app shells. Critical bug — those three routes need real implementations or correct rewrite rules.
H. **No button system consistency** — CTAs across app routes (Open stream, Subscribe, Join, Open pool, Enter pool, Publish paywall, etc.) render without consistent pill/border treatment; some are flat text with an icon, others are pill-shaped, others are simple borderless buttons.
