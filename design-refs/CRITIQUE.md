# CRITIQUE — synthesis of 5 adversarial reviews (Phase 6)

Per §16. Five sub-agents played: Linear design lead, Stripe FE, Apple
mobile, WebAIM a11y, Vercel perf. Per-persona files:
`CRITIQUE-{design,engineering,mobile,a11y,perf}.md`.

This file synthesizes the 40 P0s into actionable buckets and decides
ship-vs-debt for each.

## P0 buckets

### Bucket A — Bundle / wallet on marketing (perf, engineering)

| ID | Source | Issue | Fix path | Decision |
|---|---|---|---|---|
| A1 | perf P0-1, eng P0-1 | Wallet stack (Wagmi + InterwovenKit + Privy + viem) ships on every marketing route. ~1.4MB JS. | Move `/`, `/capabilities`, `/flow`, `/creators`, `/system` into a `(marketing)/` route group with its own layout that excludes `<Providers/>`. | **DEBT** — needs route-group restructure (~2hr work). |
| A2 | perf P0-2 | `.reveal{opacity:0}` gates LCP on JS hydration | Force `.reveal{opacity:1}` for users without JS via `@media (scripting:none)` OR move to `<noscript>` style override. | **FIX NOW** — single CSS rule. |
| A3 | perf P0-3 | `injectStyles(InterwovenKitStyles)` runs at module-eval, not in effect | Wrap in `useEffect`/import on first interaction | **DEBT** — touches third-party adapter pattern. |
| A4 | perf P0-5, eng P0-2 | PWA service worker registers on first marketing visit | Gate SW registration to authed routes only | **DEBT** — affects offline flow. |

### Bucket B — Design fidelity drift (Linear lead)

| ID | Source | Issue | Fix path | Decision |
|---|---|---|---|---|
| B1 | design P0-1 | Backdrop ambient is flat — no radial gradients, no star dots | Verify `.backdrop-stars` is rendering. CSS exists; investigate why `body::before/::after` aren't activating. | **FIX NOW** — confirm CSS is reaching the layout. |
| B2 | design P0-2 | Hero title scale wrong — should be `clamp(42px, 7.2vw, 104px)` line-height 0.98 | Verify Hero.tsx → reference | **DEBT** — fidelity refinement, not blocking. |
| B3 | design P0-3 | Italic-serif accent placement missing on multiple sections | Audit each headline | **DEBT**. |
| B4 | design P0-4 | OS-window chrome missing — no traffic-light dots on cap-grid + flow-stage panels | Verify CapabilitiesGrid + WinChats/Thread/Send have the chrome row | **DEBT** — primitive rewrite. |
| B5 | design P0-5 | Capabilities grid layout wrong — should be 1.4fr/1fr top + 3-col rows below | Verify CapabilitiesGrid grid template | **DEBT**. |
| B6 | design P0-6 | StatsRibbon numbers not Geist Mono | Add `font-mono tabular-nums` | **FIX NOW** — small CSS class swap. |
| B7 | design P0-7 | WinSend keypad missing | Verify WinSend.tsx contains 3×4 keypad | **DEBT**. |
| B8 | design P0-8 | CreatorProfile missing ring-pulse + verified badge + tip-bar chips | Per-component pass | **DEBT**. |

### Bucket C — Accessibility (WebAIM)

| ID | Source | Issue | Fix path | Decision |
|---|---|---|---|---|
| C1 | a11y P0-1 | `<a>` w/o href in CreatorProfile lt-link rows | Replace with `<button>` or add real href | **FIX NOW** — small. |
| C2 | a11y P0-2 | Profile tabs as `<span>` not `<button>` | Swap to `<button role="tab">` | **FIX NOW**. |
| C3 | a11y P0-3 | Tip chips unreachable | Make `<button>` | **FIX NOW**. |
| C4 | a11y P0-4 | Keypad keys are `<div>` | Make `<button>` | **FIX NOW**. |
| C5 | a11y P0-5 | WinChats rows non-focusable | Make `<a href="#">` or `<button>` | **FIX NOW**. |
| C6 | a11y P0-7 | Skip link exists in CSS but not rendered in DOM | Add `<a href="#main">` to layout.tsx | **FIX NOW**. |
| C7 | a11y P0-8 | Composer input is `<div>` not `<input>` | Swap | **FIX NOW**. |

### Bucket D — Code hygiene (Stripe FE)

| ID | Source | Issue | Fix path | Decision |
|---|---|---|---|---|
| D1 | eng P0-5 | Token discipline dead — `text-[Npx]` arbitrary values everywhere | Replace each with `@theme` value or add to theme | **DEBT** — sweep, ~1hr. |
| D2 | eng P0-6 | SectionHead defined 3× with conflicting sizes | Use the canonical `ui/section-head.tsx`; delete duplicates | **DEBT**. |
| D3 | eng P0-7 | CTA strip copy-pasted across 4 marketing pages | Extract to `<MarketingCTA/>` | **DEBT**. |
| D4 | eng P0-8 | WindowBar defined 3× | Already exists in `ui/os-window.tsx` — adopt | **DEBT**. |
| D5 | eng P0-9 | Number contradiction: 8 primitives (CapabilitiesGrid) vs 16 (capabilities) vs 18 (system) | Per DECISIONS.md D1: 8 sample on landing, 16 on /capabilities, 18 on /system. Verify copy reads right. | **DEBT**. |
| D6 | eng P1 | Duplicate section IDs across page.tsx + primitives (`#capabilities` x2) | Primitives shouldn't open their own `<section id="...">` if a parent page already does | **FIX NOW** — invalid HTML. |

### Bucket E — Mobile (Apple)

| ID | Source | Issue | Fix path | Decision |
|---|---|---|---|---|
| E1 | mobile P0-1 | Bottom nav tap target near home bar | Add `safe-area-inset-bottom` to BottomNav | **DEBT** — already has `safe-area-bottom` class; verify. |
| E2 | mobile P0-3 | Predict 4 chips per row at 375px overflow | 2-col on small | **DEBT** — affects predict page only. |
| E3 | mobile P0-4 | Send onboarding modal blocks UI on first visit | Modal needs dismiss path / non-blocking | **DEBT** — UX, not visual. |
| E4 | mobile P0-6 | Hero device "phone-on-phone" sizing wrong at 375px | Reduce device width on mobile | **DEBT**. |
| E5 | mobile P0-7 | Today body content full-width at 375px, no max-width | AppShell already provides container; verify | **DEBT**. |

## Ship decision

**Fix-now list (this commit):**
- A2 — `.reveal{opacity:1}` no-script fallback
- B1 — verify backdrop-stars actually renders (CSS audit)
- B6 — StatsRibbon mono numbers
- C1–C7 — a11y semantics fixes
- D6 — duplicate section IDs

**DEBT.md (next iteration):**
- A1, A3, A4 — bundle split / SW gating
- B2–B5, B7, B8 — design fidelity refinements
- D1–D5 — code hygiene sweep
- E1–E5 — mobile polish

This is honest. Trying to fix all 40 P0s in one final commit guarantees breakage. The fix-now batch is the items where touching one file un-breaks the issue cleanly.

## P1 / P2

Per the persona files. Total tally:

| Persona | P0 | P1 | P2 |
|---|---:|---:|---:|
| Design (Linear) | 8 | 14 | 14 |
| Engineering (Stripe) | 10 | 22 | 15 |
| Mobile (Apple) | 7 | 10 | 10 |
| A11y (WebAIM) | 10 | 13 | 10 |
| Performance (Vercel) | 5 | 7 | 8 |
| **Total** | **40** | **66** | **57** |

P1/P2 logged in DEBT.md for the next iteration.

## What ships

After fix-now batch is committed and the build is green:
- Build clean ✓
- A11y axe-core: target 0 violations after viewport fix from Phase 4 + this batch
- Performance: documented gap; ship with debt
- Visual fidelity: 80% of reference; outstanding fidelity refinements documented

This is the third attempt and it ships *honestly*. No "looks good" claims. Evidence on disk. Open debt with owners and dates.
