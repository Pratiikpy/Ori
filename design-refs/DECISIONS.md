# DECISIONS — open questions resolved before code (Phase 2)

Per §12. Every decision below is final. If a coder drifts from one of these,
they're drifting from the contract.

## D1 — Module count: 16 vs 18

**Decision:** **16 primitives** on `/capabilities` (matches the headline
"Sixteen primitives. One conversation."). Show **all 18 deployed Move modules**
on `/system` (developer-facing, exhaustive table is appropriate).

**Rationale:** the headline is the headline; reconciling the count
keeps the visual rhythm. `/system` is technical reference where
completeness > headline conformance.

**The 16 on /capabilities** (mapped to existing app pages):

| # | Primitive | Route | Module |
|---|---|---|---|
| 01 | Pay without leaving the chat | /send | payment_router |
| 02 | One name, everywhere | /[identifier] | profile_registry |
| 03 | Tip with one tap | /[identifier]#tip | tip_jar |
| 04 | Gift a link, not a form | /gift/new | gift_packet |
| 05 | Group gifts | /gift/new (group mode) | gift_group |
| 06 | Stream by the second | /streams | payment_stream |
| 07 | Subscribe / be subscribed | /subscriptions | subscription_vault |
| 08 | Lock a URL behind a price | /paywall/new | paywall |
| 09 | Predict, in a sentence | /predict | prediction_pool |
| 10 | Lucky pools | /lucky | lucky_pool |
| 11 | Squads | /squads | squads |
| 12 | Follows + reputation | /[identifier] | follow_graph + reputation |
| 13 | Wager 1v1 | (component-level on profile) | wager_escrow |
| 14 | Achievement badges | /[identifier] | achievement_sbt |
| 15 | Merchant profile | /settings (merchant tab) | merchant_registry |
| 16 | Agent policy + kill switch | /settings (agent tab) | agent_policy |

`/system` shows all 18 modules including `gift_box_catalog` (admin-only theme
catalog) and `lucky_pool` listed under both 10 and a developer-row entry —
on `/system` the table is the technical reference, not the user pitch.

## D2 — `/today` data source

**Decision:** **wired to live API** for activity + weekly stats + auto-sign +
agent dashboard, but **graceful degradation** to skeleton + dashed-empty
when API is asleep on Render free-tier (15-min sleep). Static demo data
is NOT acceptable — judges check.

**Rationale:** every backend route already exists in `apps/api/`. The work
is making the UI handle slow / cold-start cleanly, not faking data.

## D3 — Styling system

**Decision:** **Tailwind v4 with `@theme` block in globals.css**, tokens
ported verbatim from `TOKENS.md`. Continue the existing setup.

**NOT** vanilla `tokens.css` — the project already has the theme port
working. Switching would be a regression.

**Rule:** every Tailwind utility maps to a token. No `text-[15px]`. No
`bg-[#6c7bff]`. If the value isn't in the theme, add it to the theme.

## D4 — Component framework

**Decision:** **React Server Components by default**. Use `'use client'`
only where required: pages with hooks, animations driven by JS, wallet
interactivity, IntersectionObserver wrappers.

Marketing pages are server components except for: `<HeaderConnectPill/>`,
`<ScrollReveal/>`, `<DeviceParallax/>`, `<LiveDeviceChat/>`.

App pages stay `'use client'` because of `useInterwovenKit()`.

## D5 — Animation runtime

**Decision:** **native CSS keyframes + IntersectionObserver** matching the
reference exactly. Framer Motion stays only in `<LiveDeviceChat/>` where
it's already in use for the springy chat-message entry — that's a
performance win + the existing code is correct.

**Forbidden:** GSAP, anime.js, Lottie, motion-one. The reference doesn't
use them; we don't either.

## D6 — Image strategy

**Decision:** **SVG only**. No raster except favicon + apple-touch-icon
which already exist. The reference uses zero raster — verified.

## D7 — Font loading

**Decision:** **Geist + Geist Mono + Instrument Serif** loaded via
`next/font/google`, exposed as CSS variables `--font-sans`, `--font-mono`,
`--font-serif`. `display: swap`. Already wired in `apps/web/src/app/layout.tsx`.

The reference's `font-feature-settings: "ss01", "ss02", "cv11"` on body
and `"ss02", "zero"` on `.mono` is **mandatory** — already in
`globals.css`, verify.

## D8 — Iconography

**Decision:** **inline SVGs lifted verbatim** from `Ori-landing.html`.
Lucide-react stays for app-page icons (already there, ~50 imports).
Brand mark, NavCTA arrow, network SVG, verified badge come from reference.

**Rule:** if a marketing-route icon needs to match the reference, use the
verbatim SVG from `ASSETS.md`. Don't substitute lucide.

## D9 — Multi-page strategy

**Decision:** **Next.js App Router** (existing). 5 marketing routes
(`/`, `/capabilities`, `/flow`, `/creators`, `/system`) share
`<MarketingTopbar/>` + `<MarketingFooter/>` chrome (already built —
overhaul if needed). 15+ app routes share `AppShell` chrome.

**Routing fix required:** `/today`, `/chats`, `/settings` currently fall
through to `/[identifier]` catch-all. Investigate Vercel rewrites or page
collisions. P0.

## D10 — Width discipline (single source of truth)

**Decision:** width is owned by **layout containers, not pages**.

- Marketing pages: `.shell { max-width: 1320px; padding: 0 clamp(16px, 3vw, 32px); margin: 0 auto; }`
- App pages: `AppShell` provides `<main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">`
- Per-page `max-w-md`, `max-w-2xl` wrappers are forbidden at the page root. Use `max-w-2xl mx-auto` only at the *content level* inside the page when a focused form genuinely needs to be narrower than the column.

## D11 — Active nav state

**Decision:** every Topbar link compares against `usePathname()` and
applies `text-foreground` (active) vs `text-ink-3` (inactive). Already
implemented in `marketing-chrome.tsx` and `header.tsx`; verify on each
new page.

## D12 — Bottom nav scope

**Decision:** `BottomNav` is **`lg:hidden`** (mobile + tablet). Desktop
uses the in-Header tab bar. Already done; verify after rebuild.

## D13 — Backdrop ambient

**Decision:** **two flavors**, both already in `globals.css`:
- `backdrop-stars` — full strength on landing
- `backdrop-stars-quiet` — ~40% intensity for app pages

Marketing pages other than `/` inherit `backdrop-stars` (they're
publication-grade). App pages use `backdrop-stars-quiet`.

## D14 — Reduced motion

**Decision:** every `@keyframes` and IntersectionObserver-driven `.reveal`
must respect `@media (prefers-reduced-motion: reduce)`. Already in
`globals.css`. Verify after Phase 4.

## D15 — Existing work — what stays, what dies

**Stays (good code, correct patterns):**
- `apps/web/src/components/ui/*` (shared primitives)
- `apps/web/src/lib/contracts.ts` (62 msg builders — DON'T TOUCH per cofounder)
- `apps/web/src/lib/tx.ts`, `lib/api.ts`, hooks
- All 10 new feature pages I built (`/streams`, `/subscriptions`, etc.) — wiring is correct
- `apps/web/src/app/layout.tsx` (font loading good)
- `apps/web/src/app/globals.css` (token port is correct, verified vs TOKENS.md)
- 4 marketing pages I added (`/capabilities`, `/flow`, `/creators`, `/system`) — base good but need fidelity uplift

**Dies (broken / needs full rewrite):**
- `apps/web/src/app/page.tsx` (1226 lines, the reference port that drifted) — **rewrite from scratch** using `Ori-landing.html` + `COMPONENTS.md` as ground truth
- Any leftover references to `#capabilities`/`#flow` anchors (replaced with route links)
- Any per-page `max-w-md`/`max-w-xl` width wrappers — already stripped
- `bottom-nav.tsx` — keep file, verify `lg:hidden` discipline
- `header.tsx` — keep file, verify desktop topbar nav

## D16 — Verification gates

**Decision:** Phase 4 is mandatory. Use the existing Playwright harness
at `design-refs/_tools/`. Reuse `audit-current.mjs` pattern for
`audit-final.mjs`. Side-by-side diffs land in `design-refs/audit-final/`.

**Hard gates:**
- All 21 routes return 200 on the live deploy
- All marketing route screenshots match reference fidelity at desktop viewport (visual diff < 5%)
- 0 axe-core P0 violations
- Lighthouse mobile ≥ 90 on Performance, ≥ 95 on Accessibility, ≥ 90 on SEO

## D17 — Build / commit cadence

**Decision:** branch is `main` (cofounder's repo, direct push allowed by
him; we already merged into main earlier). One commit per page rebuild
+ one commit per token / shell update. No squashing failures away.

Final tag: `rebuild-v3-shipped` once §06's checker prints all ✓.

## D18 — Sub-agents per page in Phase 3

**Decision:** spawn one `general-purpose` Task per page rebuild, in
parallel where files don't conflict. Marketing pages can run all 5 in
parallel (separate files). App-shell rebuild + width-discipline pass +
per-page restyle is sequential where they touch the same file
(`AppShell`, `Header`).

## D19 — DEBT.md & BLOCKERS.md ownership

**Decision:** any P2 finding from Phase 6 critique not addressed in this
build cycle goes to `DEBT.md` with `owner = ritik`, `due = next
hackathon iteration` (not blank). Real blockers go to `BLOCKERS.md`
immediately so the main thread sees them.
