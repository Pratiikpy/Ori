# CRITIQUE — Performance (Ori frontend, ship-day)

Reviewer: Performance Engineer (Vercel)
Source: `design-refs/PERF.md` + `design-refs/playwright/perf-home-mobile.json`
Subject: `https://ori-chi-rosy.vercel.app` (Lighthouse mobile, 4G throttle, 4× CPU)

## Verdict

**Do not ship.** Landing scores **35** with **LCP 17.9s** and **TBT 4.6s**. Every marketing route ships a ~2.2 MB script payload (1,025 KB + 460 KB + 319 KB top three chunks) — wallet/Privy/wagmi/InterwovenKit code that has no business on `/`, `/capabilities`, `/flow`, `/creators`, `/system`. The headline "Messages that move money" is rendered behind `opacity: 0` and only flips visible when JS hydrates, so LCP is gated on 6.6s of script eval. Fix the architecture first, optimize second.

---

## Root cause (one sentence)

`apps/web/src/app/layout.tsx` mounts `<Providers>` (WagmiProvider + QueryClientProvider + InterwovenKitProvider with Privy connector + sonner) at the root, AND `apps/web/src/components/marketing-chrome.tsx` imports `HeaderConnectPill` from `apps/web/src/components/landing-interactive.tsx` which calls `useInterwovenKit()` — so every public/marketing page is a client subtree dragging the entire wallet stack into the initial JS bundle. Combined with `.reveal { opacity: 0 }` gating the LCP element on JS hydration, the headline literally cannot paint until ~17s on a throttled phone.

---

## Where the 17.9s LCP comes from

Lighthouse `metrics` block:

| Metric | Observed (real paint) | Simulated (4G/4× CPU) |
|---|---:|---:|
| FCP | 2.36s | 2.26s |
| **LCP** | **3.35s** | **17.9s** |
| Speed Index | 2.65s | 6.29s |
| TBT | — | 4.59s |
| TTI | — | 18.1s |

The 14-second gap between observed-LCP (3.3s) and simulated-LCP (17.9s) is the giveaway. Lighthouse's simulation models main-thread contention. The LCP element is inside a `.reveal` wrapper (`apps/web/src/components/landing/Hero.tsx:16` wraps the H1 in `<Reveal>`), and `apps/web/src/app/globals.css:254-258` says:

```css
.reveal { opacity: 0; transform: translateY(20px); transition: 0.9s … }
```

The `.in` class only gets added by `ScrollReveal`'s `IntersectionObserver` in `apps/web/src/components/landing-interactive.tsx:30`, which can't run until that file's chunk parses, which can't happen until the 1 MB wallet chunk before it finishes evaluating (bootup-time audit shows chunk `15mqzui-a-er0.js` alone is 1.5s of script eval, `09mw6_~mi6pkt.js` another 2.1s, `0vhh61zkr3ivs.js` another 2.2s — total 6.6s of CPU time). LCP cannot fire until the headline is visible, so LCP = (network for big chunk) + (parse) + (eval) + (IO callback).

There are also **5 layout shifts** in the StatsRibbon section (CLS 0.085, biggest is `.shell` at 0.069 — likely the stats ribbon mounting after font swap), but CLS is in budget. LCP and TBT are the fire.

---

# Findings, ranked

## P0 — Blocking ship

### P0-1. Wallet stack runs on every marketing page (1.4 MB JS)

**File**: `apps/web/src/app/layout.tsx:74` mounts `<Providers>` globally.
**File**: `apps/web/src/components/providers.tsx:1-83` is a `'use client'` module that statically imports `wagmi`, `viem`, `@tanstack/react-query`, `@initia/interwovenkit-react`, `initiaPrivyWalletConnector`, `sonner`, plus side-effect imports `@initia/interwovenkit-react/styles.css` and `injectStyles(InterwovenKitStyles)` at module top-level (line 21).

**Evidence**: `total-byte-weight` = 2,335 KiB. The three offending chunks:

| Chunk | Size | Unused % | Dominant cost |
|---|---:|---:|---|
| `15mqzui-a-er0.js` | 1,025 KB | 77% unused (749 KB dead on `/`) | wagmi + viem + InterwovenKit |
| `09mw6_~mi6pkt.js` | 460 KB | 78% unused (354 KB dead) | Privy connector + cosmjs |
| `0g1l99k6~xx1p.js` | 319 KB | 60% unused (186 KB dead) | InterwovenKit styles + react-query |

`unused-javascript` audit estimates **6.28s of LCP savings** if these never loaded on `/`.

**Remediation**:
1. Move `<Providers>` out of the root `layout.tsx`.
2. Create a **route group** `apps/web/src/app/(app)/` with its own `layout.tsx` that wraps `{children}` in `<Providers>`. Move `today/`, `chats/`, `chat/`, `send/`, `create/`, `predict/`, `portfolio/`, `subscriptions/`, `streams/`, `squads/`, `gift/`, `lucky/`, `discover/`, `claim/`, `settings/`, `[identifier]/`, `onboard/`, `paywall/`, `obs/`, `agent/` into it.
3. Create a **route group** `apps/web/src/app/(marketing)/` with a thin layout (no Providers). Move `page.tsx` (landing), `capabilities/`, `flow/`, `creators/`, `system/`, `ask/` into it.
4. Result: marketing routes ship ~50-100 KB JS for ScrollReveal + framer-motion (still trim-able — see P1-2).

### P0-2. `.reveal { opacity: 0 }` gates LCP on JS hydration

**File**: `apps/web/src/app/globals.css:254-258` plus `apps/web/src/components/landing/Hero.tsx:16` (the H1 — the LCP candidate — sits inside `<Reveal>` which renders a `.reveal` div).

The hero text (`Messages that <Serif>move</Serif> money.`) is the largest above-the-fold content, but it's invisible until JS adds `.in`. On a throttled mobile this happens at ~17s. The reveal-on-scroll effect is decorative; bricking the headline behind it is malpractice.

**Remediation** (any one is sufficient):
1. **Preferred**: Remove `.reveal` from above-the-fold elements entirely. Apply it only from section 02 (`#flow`) onward. Hero, StatsRibbon, the first half of CapabilitiesGrid should render without the `.reveal` opacity gate.
2. Alternative: Change the default to `opacity: 1` and use a `:not(.has-js)` guard via a one-line `<script>` in `<head>` that adds `has-js` to `<html>` before paint, e.g.:
   ```html
   <script>document.documentElement.classList.add('has-js')</script>
   ```
   Then `.has-js .reveal { opacity: 0; transform: translateY(20px) }`. No-JS users (and Lighthouse, until JS lands) see the page at full opacity.
3. Alternative: Replace `IntersectionObserver` reveals with pure CSS `@starting-style` + `animation-timeline: view()` — no JS, no LCP gate. Modern browsers only; Safari 17.4+, Chrome 115+. Both are within Baseline 2024.

The lines `apps/web/src/app/globals.css:375` and `:394` already give `prefers-reduced-motion` users `opacity: 1`. Generalize that.

### P0-3. `injectStyles(InterwovenKitStyles)` runs at module evaluation, not in an effect

**File**: `apps/web/src/components/providers.tsx:20-22`:
```ts
if (typeof document !== 'undefined') {
  injectStyles(InterwovenKitStyles)
}
```

This executes synchronously at JS parse-time on every page that imports the module — even before React mounts. `InterwovenKitStyles` is a fat string in `0g1l99k6~xx1p.js` (319 KB total). Inlining it via `injectStyles` (which appends a `<style>`) creates a render-blocking style insertion mid-script. Once P0-1 puts Providers in the `(app)` group this stops affecting marketing, but on app pages it still ships needlessly on first load.

**Remediation**: Move into `useEffect(() => { injectStyles(...) }, [])` inside the `Providers` component, or import the stylesheet via the `import '@initia/interwovenkit-react/styles.css'` line above and let webpack tree-shake / split. The dual import (CSS file *and* JS string) is double-shipping styles.

### P0-4. `MarketingTopbar` imports the wallet stack via `HeaderConnectPill`

**File**: `apps/web/src/components/marketing-chrome.tsx:8` does `import { HeaderConnectPill } from './landing-interactive'`.
**File**: `apps/web/src/components/landing-interactive.tsx:27` does `import { useInterwovenKit } from '@initia/interwovenkit-react'`.

Even with P0-1 splitting Providers, the marketing topbar will still pull `@initia/interwovenkit-react` into every marketing route's client bundle the moment the chunk graph resolves, because `HeaderConnectPill` is statically imported and depends on `useInterwovenKit`.

**Remediation**:
1. Make `HeaderConnectPill` a server-rendered placeholder that links to `/onboard` by default. Render the wallet-aware variant only on app routes via a separate `AppTopbar` component.
2. Or: `next/dynamic(() => import('./landing-interactive').then(m => m.HeaderConnectPill), { ssr: false, loading: () => <LaunchPillStatic /> })` and ship the static "Launch →" link in the SSR HTML. The dynamic chunk only loads after hydration, doesn't block LCP.
3. The whole `HeaderConnectPill` reads a single auth flag — it doesn't need wagmi. A cookie/localStorage check would let the link be a server component.

### P0-5. Route hopping re-downloads the wallet stack (or doesn't, but the bundle still ships)

Per PERF.md, /capabilities/flow/creators/system all sit at LCP ~11.2-11.4s and TBT ~2.1-2.2s. There is no auction page logic on those routes — the only client code they ship is the marketing topbar's `HeaderConnectPill`. Confirms P0-4: the wallet stack is being chunk-loaded on first visit to any marketing page because the topbar pulls it in. Fix P0-4 and these routes drop to LCP ≤ 2.5s without any further work.

---

## P1 — Should fix before ship if possible, must fix this week

### P1-1. `framer-motion` ships on the landing page just for the hero chat loop

**File**: `apps/web/src/components/landing-interactive.tsx:26` imports `AnimatePresence, motion, useReducedMotion` from `framer-motion`. Used by `LiveDeviceChat` (visible above the fold) and the `LivePayCard` checkmark animation.

framer-motion is ~60 KB gzipped and compiles to ~180 KB raw. It accounts for a meaningful slice of `0vhh61zkr3ivs.js` (72 KB chunk, 2.2s scripting time per bootup-time audit).

**Remediation**:
1. The `LiveDeviceChat` is the hero centerpiece — it's what sells the product. Keep it, but `dynamic(() => import('@/components/landing/LiveDeviceChat'), { ssr: true, loading: () => <StaticDeviceChat /> })` with a server-rendered fallback that shows the four bubbles all-at-once (same as the reduced-motion branch already does at line 226). Hydration upgrades to animated.
2. Better: rewrite `LiveDeviceChat` with Web Animations API (`element.animate()`) + CSS transitions. Spring physics for 4 bubbles is overkill; cubic-bezier easing is indistinguishable. Saves the framer-motion dependency entirely on `/`.
3. The `LivePayCard` checkmark `motion.path` `pathLength` animation can be replaced with `stroke-dasharray` + `@keyframes`. CSS only.

### P1-2. `lucide-react` import-all on marketing pages

**File**: `apps/web/src/app/capabilities/page.tsx`, `flow/page.tsx`, `creators/page.tsx`, `system/page.tsx` all do `import { ArrowRight, … } from 'lucide-react'`.
**File**: `apps/web/src/components/install-prompt.tsx:5` does `import { Share, Plus, X, Download } from 'lucide-react'`.

`lucide-react` ships a barrel that, depending on tree-shaking quality, can drag in tens of KB even when 4-5 icons are used. Verify by inspecting the chunks; if any of `09mw6_…` or `0g1l99k6…` contains `lucide-react/dist/`, it's mis-tree-shaken.

**Remediation**: Either inline the SVGs (these are 4 trivial icons per page) into local `apps/web/src/components/icons/` modules — there's already a folder for this — or switch to subpath imports `import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right'`. The marketing topbar/footer already inline the OriMark; keep going.

### P1-3. `InstallPrompt` is in root layout and pulls framer-motion + lucide

**File**: `apps/web/src/app/layout.tsx:5` imports `InstallPrompt`.
**File**: `apps/web/src/components/install-prompt.tsx:1-5` is `'use client'` and imports `framer-motion` and `lucide-react`.

It guards with a 20-second delay (`SHOW_DELAY_MS`), so it's never visible on first paint. But its bundle ships in the initial chunk because it's a static import from the root layout.

**Remediation**:
```tsx
const InstallPrompt = dynamic(() => import('@/components/install-prompt'), {
  ssr: false,
  loading: () => null,
})
```
Even better, move it into the `(app)` route group only — there's no value showing the PWA install prompt on the marketing landing page.

### P1-4. Three Google Fonts (Geist, Geist_Mono, Instrument_Serif) all eagerly fetched

**File**: `apps/web/src/app/layout.tsx:9-29`. Three font families at module top-level. font-display: swap is set (good — avoids FOIT), but the page is fetching 6 font files (per `numFonts: 6` in diagnostics) totaling 60 KB upfront.

`uses-rel-preconnect` audit warns: `<link rel=preconnect>` for `fonts.googleapis.com` and `fonts.gstatic.com` are present but unused (next/font self-hosts and inlines these — the preconnects come from somewhere else and waste 400ms LCP per the audit).

**Remediation**:
1. The serif (`Instrument_Serif`) is used ONLY for inline accent words (`<Serif>` wrapper). On marketing pages, defer it: drop the `serif.variable` from `<html className>` and only apply it to the `<Serif>` component via a CSS `@font-face` swap. Better: inline the 1-2 glyphs needed (`move`, `O`, `conversation`, `on the same surface`, `and a stage`) via SVG so the font isn't needed for the first viewport.
2. Find and remove the rogue `<link rel=preconnect>` to `fonts.googleapis.com`. Search for it in any custom `<head>` content; next/font handles this internally.
3. Geist_Mono is heavily used in chrome (footer, metadata). Acceptable. Geist is the body font. Acceptable.

### P1-5. `legacy-javascript` audit failing — Array.prototype.at, flat, flatMap, Object.fromEntries shipped as polyfills

**Evidence**: Chunk `0vhh61zkr3ivs.js` shipping 6.7 KB of polyfills for Baseline-2022 features.

**Remediation**: Set explicit `target` in `next.config.ts`:
```ts
experimental: { browserslistTarget: 'modern' }
```
Or update `.browserslistrc` (or `package.json` `browserslist`) to `["last 2 chrome versions", "last 2 firefox versions", "last 2 safari versions"]`. This is also the simplest "modern browsers only" toggle.

### P1-6. PWA service worker registration runs in `<Providers>` `useEffect`

**File**: `apps/web/src/components/providers.tsx:58-64`. Once Providers moves to `(app)`, the SW is no longer registered on marketing — but for first-time visitors arriving at `/` the SW will never register.

**Remediation**: Move SW registration to a tiny standalone client component `<ServiceWorkerBoot />` that's rendered in the root layout (cost: ~200 bytes), independent of the Providers tree. Or register it from a `<script>` in `<head>` directly.

### P1-7. Reactor Compiler is on but bootup time is still 6.6s

**File**: `next.config.ts:4` `reactCompiler: true`. Good intent. But it can't help the cardinal sin (P0-1 wallet on marketing). Once P0 is fixed, react-compiler will measurably reduce the wasted-renders cost on `LiveDeviceChat` (it does setState every 400-900ms in a loop) and the `DeviceParallax` mousemove handler.

**Remediation (after P0)**: Profile the landing page in React DevTools Profiler with the compiler's component memoization on. Confirm `LiveDeviceChat` only re-renders the bubble that changed, not the whole `<AnimatePresence>` subtree.

---

## P2 — Polish, address after ship

### P2-1. Render-blocking CSS chunk: 15 KB blocking 405ms

**Evidence**: `render-blocking-resources` audit calls out `0i10h7cgma9~h.css` (15 KB, 405ms wasted, est savings 120ms LCP).

**Remediation**: Inline critical CSS in `<head>`. Next.js 16 supports `experimental.inlineCss: true`. Ship the rest async via media-print swap trick. Marginal once P0 is fixed (the chunk is small relative to the JS payload), but free wins.

### P2-2. CLS 0.085 — StatsRibbon shifts when fonts swap

**Evidence**: `layout-shifts` audit, biggest shift score 0.069 on `body > main > div > section.shell` (snippet matches StatsRibbon — `97ms median settlement / 1% creator tip fee / 0 wallet popups`).

**Remediation**: Add explicit `min-height` or `aspect-ratio` to the StatsRibbon container. The issue is the big tabular numerals reflow when Geist swaps in for the system fallback. Apply `font-size-adjust: 0.5` or set `size-adjust` in the next/font declaration to match Geist's x-height to the fallback.

### P2-3. `useEffect` mousemove listener in `DeviceParallax` runs on every page visit

**File**: `apps/web/src/components/landing-interactive.tsx:108-133`. Cheap (single rAF), but the listener is attached unconditionally on hover-capable devices. Acceptable, but consider gating to viewports >1024px (the device mock layout switches to centered below `lg:`).

### P2-4. `numTasks: 2233` and `numTasksOver50ms: 7`

**Evidence**: diagnostics block.

Mostly explained by P0-1. Re-measure after fix; if still > 4 long tasks, profile and split.

### P2-5. No `<link rel="preload">` for the Hero font

The Hero H1 is `clamp(42px, 7.2vw, 104px)` of Geist regular. The Geist `.woff2` (31 KB per total-byte-weight) is the LCP-critical font, but next/font renders it with `display: swap` and no priority hint. Once P0-2 is fixed, paint will happen with fallback then swap; OK. If you want to push LCP under 1.5s consider next/font's `preload: true` (default) is fine, but verify the woff2 is in the resource hints.

### P2-6. `serverSourceMaps: true` is dev-only ergonomics — confirm it's not leaking to prod

**File**: `next.config.ts:38`. Lighthouse won't catch it but source maps can blow up Vercel function size and leak code. Confirm this is gated to `process.env.NODE_ENV !== 'production'`.

### P2-7. `transpilePackages: ['@ori/shared-types']` and `serverExternalPackages` config look fine

Not a perf issue. Listed for completeness — the `serverExternalPackages` list is correct (Fastify/Prisma/Redis stay out of the client edge bundle).

### P2-8. No `<link rel="preconnect" crossorigin>` to `auth.privy.io`, `router-api.initiation-2.initia.xyz`, `registry.testnet.initia.xyz`, `indexer.initia.xyz`

These get hit during wallet boot. Once Providers move to `(app)`, add preconnect hints in the `(app)` layout's `<head>` so DNS+TLS happens during initial hydration rather than on first wallet interaction. Saves ~200-400ms on the first connect. **Do not add these to the root layout** — that re-introduces marketing waste.

---

## Streaming / RSC boundaries

The landing page (`apps/web/src/app/page.tsx`) is a server component (good). All `landing/*` primitives are server components (good — confirmed: none have `'use client'`). The client islands are correctly minimized to:

1. `ScrollReveal` (wraps everything — but only for the IO setup; the children are server-rendered)
2. `HeaderConnectPill` (in topbar)
3. `HeroPrimaryCta` (one button)
4. `DeviceParallax` (wraps DeviceMock)
5. `LiveDeviceChat` (the animated hero)
6. `InstallPrompt` (delayed)

The architecture is correct. The execution leaks because client islands import the wallet stack via `useInterwovenKit`. Fix the imports (P0-1, P0-4) and the streaming boundaries become useful.

What can become **fully static** (no client JS at all):
- The Stats Ribbon (no interactivity)
- The footer (already server)
- The four marketing routes' bodies (capabilities/flow/creators/system) — confirmed: their imports are `lucide-react` icons + `Link`. The only thing pulling client into them is `MarketingTopbar`.

---

## Concrete remediation order (do in this sequence)

1. **Today, before ship**:
   - Move providers to `(app)` route group (P0-1).
   - Make `HeaderConnectPill` server-renderable with a static fallback for marketing (P0-4).
   - Remove `.reveal` opacity gate from above-the-fold elements (P0-2).
   - Move `injectStyles` call into `useEffect` (P0-3).
   - Re-run Lighthouse. Expect: LCP `/` 2.5-3.5s, TBT < 800ms, perf score 70-85.

2. **This week**:
   - Lazy-load `LiveDeviceChat` with SSR fallback (P1-1).
   - Lazy-load `InstallPrompt` (P1-3).
   - Switch `lucide-react` to subpath imports (P1-2).
   - Set browserslist to modern (P1-5).
   - Move SW registration to standalone (P1-6).

3. **Next sprint**:
   - Inline critical CSS (P2-1).
   - Fix StatsRibbon CLS (P2-2).
   - Add preconnects in `(app)` layout (P2-8).

---

## Acceptance targets after P0

| Route | Perf | LCP | TBT |
|---|---:|---:|---:|
| `/` | ≥ 80 | ≤ 2.5s | ≤ 400ms |
| `/capabilities`, `/flow`, `/creators`, `/system` | ≥ 90 | ≤ 1.8s | ≤ 200ms |

The marketing routes will hit these easily once they shed the wallet stack; the landing page will be slightly behind because of `LiveDeviceChat`'s framer-motion footprint. Address in P1-1 to unlock perf ≥ 90 there too.
