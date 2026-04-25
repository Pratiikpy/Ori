# DEBT — known P2 issues with owner + date

Per §16 / Phase 6 process. Items here are **not blocking** the rebuild
but are tracked for the next iteration.

| Owner | Due | Item |
|---|---|---|
| ritik | 2026-05-15 | **LCP perf**: marketing routes ship the wallet stack (InterwovenKit + Privy + viem + wagmi). Move `/`, `/capabilities`, `/flow`, `/creators`, `/system` into a `(marketing)/` route group with its own layout that excludes `Providers`. Expected outcome: LCP < 2.5s on mobile 4G, Performance ≥ 90. Currently 11–17s LCP / 35–45 score. |
| ritik | 2026-05-08 | **Wallet-gated routes UX**: `/today`, `/chats`, `/settings`, `/portfolio` redirect to `/` when not connected. For SEO + share-link UX, render a minimal "Sign in to continue" surface instead, so the URL stays meaningful. Audit harness can then capture them. |
| ritik | 2026-05-08 | **Reference-fidelity contrast**: `Ori-landing.html` uses `--ink-3` at 0.38 alpha (~3.5:1) which fails WCAG 2.1 AA. We bumped to 0.50 (~5.6:1). If reference visual fidelity is later prioritized over a11y, swap to a 14px+ text-size threshold so the eyebrow falls under "large text" 3:1 rule and the original alpha can return. |
| ritik | 2026-05-08 | **Lighthouse SEO 82** on `/` and `/creators`. Add `<meta name="description">`, set `lang="en"` (already set), provide `og:image` (currently set), reach 90+. |
| ritik | 2026-05-15 | **Cross-browser pass**: Phase 4 only ran Chromium. Spot-check Safari + Firefox at desktop, mobile Safari especially for `backdrop-filter` glitches. |
| ritik | 2026-05-15 | **Reduced-motion test**: confirm `@media (prefers-reduced-motion: reduce)` disables: `pulse`, `ring-pulse`, `card-in`, `blink`, `fill-up`, `slide`, `.reveal` translateY. Add explicit overrides if any leak through. |
| ritik | 2026-05-22 | **Visual diff CI**: pixelmatch-based regression suite using the `audit-final/` images vs `source-shots/` to catch drift on each PR. |
| ritik | 2026-05-22 | **Print stylesheet**: minimal print rules so a creator profile prints cleanly. |
| ritik | 2026-05-22 | **OG image generation**: `/api/og/profile/[id]` exists; verify per-page OG cards for `/capabilities`, `/flow`, `/creators`, `/system`. |

## How to clear an item

When fixed: move the row to a new "✅ Done" section at the bottom with
the commit hash that resolved it. Don't delete — keep the trail.

## ✅ Done

(none yet — this is the first iteration)
