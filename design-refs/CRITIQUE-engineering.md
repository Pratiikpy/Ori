# CRITIQUE — Engineering

Senior FE review. Ranked by ship-blocking severity. Every claim has a file path and a line number.

---

## P0 — Ship blockers

### P0-1. Wallet stack on every marketing route

`apps/web/src/components/providers.tsx:1-83` is rendered by `apps/web/src/app/layout.tsx:74` for every route in the app. It pulls `WagmiProvider`, `QueryClientProvider`, `InterwovenKitProvider`, `initiaPrivyWalletConnector`, full InterwovenKit CSS (`@initia/interwovenkit-react/styles.css` at line 13 + `injectStyles(InterwovenKitStyles)` at line 21), `viem`, `sonner`. PERF.md confirms the cost: `/` LCP 17.9s, TBT 4.6s; every marketing route TBT > 2s with LCP > 11s. The marketing pages do not need wallet at all — `MarketingTopbar` reads `useInterwovenKit()` only inside `HeaderConnectPill` (`landing-interactive.tsx:55-94`). The fix is a route group: `app/(marketing)/layout.tsx` with a thin provider (no wagmi/IWK), `app/(app)/layout.tsx` with the full stack. Everything in `apps/web/src/app/page.tsx`, `capabilities/page.tsx`, `flow/page.tsx`, `creators/page.tsx`, `system/page.tsx` belongs to (marketing). This is the single biggest engineering failure on this rebuild.

### P0-2. PWA service-worker registers on the marketing landing

`providers.tsx:58-64` registers `/sw.js` from a top-level `useEffect` in the only Providers wrapper, so a first-time visitor to `/` gets a service worker installed before they have any reason to install the app. This blows past contention budget on the LCP critical path on `/` (PERF.md line 23: LCP 17.9s) and breaks every browser-cache reasoning subsequent updates do. Move SW registration to (app) layout, gate it behind `initiaAddress` or a deliberate `<InstallPrompt>` accept.

### P0-3. `Hero.tsx` and `landing-interactive.tsx` `LiveDeviceChat` ship Framer Motion to all viewers, blocking interaction on hero

`landing-interactive.tsx:26` imports `framer-motion` (`AnimatePresence, motion, useReducedMotion`). The Hero device is the LCP candidate on `/`. The chat starts ticking at mount with five timers (lines 222-259) and infinite generations (`setGen((g) => g + 1)`), all of which contribute to TBT 4588ms. Code-split: `LiveDeviceChat` should be a `dynamic(() => import('...'), { ssr: false, loading: () => <StaticDeviceChat /> })` and the static fallback should be the LCP candidate.

### P0-4. `'use client'` on the entire landing tree because of `<ScrollReveal>` wrap

`apps/web/src/app/page.tsx:62` wraps the whole landing in `<ScrollReveal>`, a client component (`landing-interactive.tsx:1`). The page itself is a server component, but every child rendered as a child of `ScrollReveal` is forced under that boundary's prop-serialization tree. That's tolerable because `ScrollReveal` returns `<>{children}</>` — but inside the page tree we then have `<Reveal as="...">` (`ui/reveal.tsx:1` `'use client'`) used in `Hero.tsx:16, 51`, `CapabilitiesGrid.tsx:12, 175, 189`, `WinChats.tsx:66`, `WinThread.tsx:12`, `WinSend.tsx:12`, `Philosophy.tsx:47, 68`, `SystemGrid.tsx:11, 23, 225`, `StatsRibbon.tsx:22`, `CreatorProfile.tsx:18, 35`. Each `Reveal` is its own client island with its own `IntersectionObserver`. We have a `ScrollReveal` *and* a per-element `Reveal`, both observing for `.reveal.in` (`globals.css:254-263`). One does the same job as the other. Pick one. The current pattern leaks two mechanisms and 13+ client islands across what should be a static page.

### P0-5. Token discipline is dead — `text-[15px]` and `text-[Npx]` arbitrary values are everywhere

The brief forbids arbitrary px utilities and requires every utility to map to `@theme`. In practice almost every text size is an arbitrary literal:

- `app/page.tsx:49,52,55` (`text-[12px]`, `text-[clamp(...)]`, `text-[15px]`)
- `app/capabilities/page.tsx:107,112,115,116,138,148,192` (numerous `text-[Npx]`, plus inline `style={{ fontSize: 'clamp(...)' }}`)
- `app/flow/page.tsx:73,76,88,102,123,132,162,186,198` (same, plus inline style fontSize)
- `app/creators/page.tsx:65,75,103,112,138,148` (inline style fontSize, arbitrary `text-[12.5px]`)
- `app/system/page.tsx:85,89,93,107,111,131,140,148,164,173,189,213,237` (inline style fontSize on every heading)
- `Hero.tsx:21,32,67,77,138,141` (inline style fontSize on H1; `text-[12px]`, `text-[14px]`, `text-[11px]`, `text-[12px]`)
- `CapabilitiesGrid.tsx:161,213,219,247,253,276,283,296,299,300,302,309,311,316,324,341,349,350,351,367,375,379,380,384,396,399,403,404,405,408,410` (every viz uses arbitrary sizes; some have non-design-system fractions like `text-[10.5px]`, `text-[11.5px]`, `text-[12.5px]`, `text-[13.5px]`, `text-[18px]`, `text-[22px]`, `text-[44px]`)
- `WinChats.tsx:72,75,88,95,96,100,103,126`, `WinThread.tsx:23,27,28,29,52,107,117,134,137,140,141`, `WinSend.tsx:21,27,28,33,41,45,53,68,84` — same pattern.
- `CreatorProfile.tsx:78,89,94,121,124,139,164,177,191,209,231,243,300,303` — `text-[10.5px]`, `text-[20px]`, `text-[22px]`, etc.
- `Philosophy.tsx:69,70,73`
- `SystemGrid.tsx:46,64,68,72,146,178,226,239,243`
- `StatsRibbon.tsx:48,53,57`
- `marketing-chrome.tsx:40,45,79,83,119,152,160`
- `landing-interactive.tsx:59,65,288,296,312,313,314,317`

`@theme` already declares fonts/colors/radii/easings (`globals.css:10-91`) but **does not declare a type ramp**. There is no `--text-display`, `--text-h1`, `--text-body`, `--text-caption`, `--text-mono-sm`. So engineers had no choice but to hardcode. Add a type scale to `@theme` and migrate. Acceptance: zero `text-\[\d+(\.\d+)?px\]` matches; zero inline `style={{ fontSize: ... }}` outside the design system. As long as type lives in two parallel grammars (Tailwind utilities and ad-hoc inline styles) the system is unenforced.

### P0-6. SectionHead is duplicated three times and they disagree

There are three `SectionHead` definitions:

1. `app/page.tsx:38-58` — local, eyebrow `text-[12px]`, title `text-[clamp(32px,5vw,56px)]`, sub `text-[15px]`, no split layout, no `Reveal` wrap.
2. `components/ui/section-head.tsx:14-47` — eyebrow `text-[11px]`, title `clamp(32px,4.5vw,60px)`, sub `text-[17px]`, supports `split | stacked`, `max-w-[14ch]`, `max-w-[440px]`.
3. `landing/CapabilitiesGrid.tsx:13-22`, `FlowStage.tsx:14-23`, `CreatorProfile.tsx:19-32`, `Philosophy.tsx:48-55`, `SystemGrid.tsx:12-20` — call the `ui` one. But `app/capabilities/page.tsx:163-171`, `app/flow/page.tsx`, `app/system/page.tsx`, `app/creators/page.tsx` all call eyebrow + headline + paragraph as raw JSX rather than using `SectionHead`, and use *different* sizes (`clamp(28px,3.6vw,48px)` for h2 in `app/system/page.tsx:163-167` etc.) Three section-head dialects in five files.

Pick `components/ui/section-head.tsx`, delete the local one in `app/page.tsx`, replace every raw "Eyebrow + h1/h2 + p" pattern in `app/capabilities`, `flow`, `creators`, `system` with it, drive sizes from the type scale (P0-5).

### P0-7. CTA strip duplicated verbatim across four pages

`app/capabilities/page.tsx:184-209`, `app/flow/page.tsx:180-205`, `app/creators/page.tsx:130-154`, `app/system/page.tsx:229-257` are byte-for-byte the same `rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-8 lg:p-12 …` block. ~25 lines × 4. Extract `<CtaStrip eyebrow title icon href ctaLabel />` to `components/ui/`. Bonus: `border-violet-500/30` is an off-system Tailwind color literal — should use `--color-primary` / `var(--color-accent)`.

### P0-8. `WindowBar` defined three times with identical bodies

`WinChats.tsx:118-132`, `WinThread.tsx:99-113`, `WinSend.tsx:76-90` are the same 14-line component. There is already an `OSWindow` primitive in `components/ui/index.ts:6` exported but not used by Win* — it is exactly the chrome these three need. Either consume `OSWindow` or extract `WindowBar` once to `landing/WindowBar.tsx`.

### P0-9. `MarketingFooter` is missing on `app/page.tsx` Footer column count and CTA links go to dead routes

`marketing-chrome.tsx:107-115` lists "App" links to `/today`, `/create`, `/predict`, `/settings`. None of these are static-rendered marketing routes — they are inside the wallet-gated `(app)` group. Marketing footer should not advertise authenticated routes; either fix the IA or make these links open the connect drawer. Same for `app/capabilities/page.tsx:200` (`href="/create"`), `app/flow/page.tsx:197` (`href="/send"`), `app/creators/page.tsx:147` (`href="/onboard"`). Half of the "primary CTAs" on the marketing pages dead-end on a connect prompt without a fallback.

### P0-10. `Reveal` ref typing is hand-waved with `@ts-expect-error`

`components/ui/reveal.tsx:49`: `// @ts-expect-error dynamic tag ref typing`. This will silently rot the moment `Tag` types change. Replace with a generic `<Tag extends 'div' | 'section' | 'article' | 'li'>` and a discriminated union, or use `React.ElementType` with the proper ref signature. This is the only `@ts-expect-error` in the rebuild — kill it on principle.

---

## P1 — Should fix before ship

### P1-1. `app/page.tsx` `Hero` and `Hero.tsx` both render their own `<section>` — one of them is redundant

`app/page.tsx:68-70` wraps `<Hero />` in `<section className="shell pt-[clamp(48px,10vw,140px)] pb-[clamp(48px,8vw,100px)]">`; `Hero.tsx:14` opens `<section className="shell pt-[clamp(48px,10vw,140px)] pb-[clamp(56px,8vw,80px)]">`. Two stacked `<section class="shell">` produces double horizontal padding shift on resize and double vertical clamp. Same problem with `CapabilitiesGrid.tsx:11` opening `<section id="capabilities" className="shell pt-16 pb-24">` while `app/page.tsx:78-81` wraps it in another `<section id="capabilities" className="shell pt-[clamp(72px,12vw,140px)] pb-[clamp(72px,12vw,140px)]">`. Two `id="capabilities"` siblings (`app/page.tsx:79` and `CapabilitiesGrid.tsx:11`) — invalid HTML, `document.querySelector('#capabilities')` is non-deterministic. Same conflict for `id="flow"` (`app/page.tsx:99` + `FlowStage.tsx:12`), `id="profile"` (`CreatorProfile.tsx:17` + landing under `id="agents"` at `app/page.tsx:118`), `id="philosophy"` (`app/page.tsx:137` + `Philosophy.tsx:46`), `id="system"` (`app/page.tsx:145` + `SystemGrid.tsx:10`). Decide: either the page provides the `<section id>`/spacing and the components return un-sectioned content, or the components own it. Doing both is broken.

### P1-2. `app/capabilities/page.tsx` includes both `<CapabilitiesGrid />` (with its own `SectionHead`) AND a fresh hero/headline above it

Line 158 renders `<CapabilitiesGrid />`, which contains a full `SectionHead` ("01 · Capabilities · Payments, messages, and agents on the same surface…") at `CapabilitiesGrid.tsx:13-22`. The page already has its own h1 ("Sixteen primitives. One conversation.") at lines 135-145. So `/capabilities` shows two competing eyebrows ("· Capabilities" then "01 · Capabilities") and two competing titles. `CapabilitiesGrid` needs a `showHeader?: boolean` prop, default `true` for landing, `false` when re-used on `/capabilities`. Same issue: `app/flow/page.tsx:142` renders `<FlowStage />` (which has its own SectionHead at `FlowStage.tsx:14-23`); `app/creators/page.tsx:86` renders `<CreatorProfile />` (which has its own SectionHead at `CreatorProfile.tsx:19-32`); `app/system/page.tsx:154` renders `<SystemGrid />` (its own SectionHead at `SystemGrid.tsx:11-20`).

### P1-3. `Reveal.delay` setTimeout is not cleared

`components/ui/reveal.tsx:37-38`: `setTimeout(() => el.classList.add('in'), delay)` followed by `io.disconnect()`. The cleanup `return () => io.disconnect()` does not clear the pending `setTimeout`. If the component unmounts within the `delay` window after intersection, the timer fires on a detached node. Capture the timer id and `clearTimeout(t)` in cleanup.

### P1-4. `LiveDeviceChat` `play()` is recursive over `setTimeout` and not cancelled cleanly

`landing-interactive.tsx:237-253`: `play(idx)` schedules a `setTimeout` then calls `play(idx + 1)` *synchronously inside the callback*. The `cancelled` flag is checked but only in the callback body, not when `play(idx + 1)` is invoked. Because each `setTimeout` reassigns the same `timer` variable (line 232), the cleanup `clearTimeout(timer)` only kills the most recent timer, not any prior pending one if the callback fired mid-cycle. Track timers in a `Set<TimerId>` and clear all on unmount.

### P1-5. `STEP_DELAYS` is `length 5` but addressed by `idx` that walks 0..HERO_SCRIPT.length (5 steps). Off-by-one safe today, brittle tomorrow

`landing-interactive.tsx:214` declares `STEP_DELAYS = [420, 900, 820, 560, 540] as const`. Length must match `HERO_SCRIPT.length` (`landing-interactive.tsx:206-212`, length 5). Today they match by coincidence. Make this static: `if (STEP_DELAYS.length !== HERO_SCRIPT.length) throw`. Better: `HERO_SCRIPT: readonly { ...; delay: number }[]` so the relationship is in the type.

### P1-6. `useEffect` dep arrays drop captured callbacks

`Reveal` (`reveal.tsx:46`) has `[delay]` — fine. `LiveDeviceChat` (`landing-interactive.tsx:259`) has `[reducedMotion]` — fine. `DeviceParallax` (`landing-interactive.tsx:133`) has `[]` — fine because refs are stable. `ScrollReveal` (`landing-interactive.tsx:45`) has `[]` and runs `document.querySelectorAll('.reveal')` *once on mount*. Any `.reveal` element rendered after mount (e.g. dynamic content, AnimatePresence, route transitions) is never observed. Either re-run on mutations (MutationObserver) or kill `ScrollReveal` and rely solely on `<Reveal>`.

### P1-7. `Providers` `useEffect` registers SW unconditionally — and runs even on SSR-render-mismatch hydration

`providers.tsx:58-64`: `if ('serviceWorker' in navigator)` is fine, but the `register` runs on every page mount because the provider sits at the root of the app. There is no version check, no scope. On dev, SW caches stale assets which leads to "why doesn't my CSS update". Add `process.env.NODE_ENV === 'production'` guard.

### P1-8. `useState` for QueryClient is a known pattern — but the factory has no SSR-safe singleton fallback

`providers.tsx:44`: `const [queryClient] = useState(() => new QueryClient(...))` is the standard React pattern, BUT for App Router with concurrent rendering, you should either keep it in `useState` (as you do) AND ensure it's only created on the client. As written this fires on the server during SSR (the component is `'use client'`, so it runs on the client too — but on first SSR pass the `new QueryClient` is created and never used). Cosmetic but worth a note.

### P1-9. Unused props leak in `app/page.tsx`'s SectionHead vs. `ui/section-head.tsx`

`ui/section-head.tsx:6,9-12` declares `eyebrow?`, `sub?`, `layout?`, `className?`. When called from `landing/Philosophy.tsx:48-55` only `eyebrow` and `title` are passed; the `sub?` is omitted (correct), but the layout default is `split` which forces a two-column flex even with a single child — see `Philosophy.tsx:46` rendering `<SectionHead eyebrow=... title=... />` with no sub. `flex-col lg:flex-row lg:justify-between` with one child collapses correctly but communicates the wrong intent. Default `layout` to `'stacked'` and opt into `'split'` only when sub is present.

### P1-10. `Card` is imported in `creators/page.tsx:7` but only `interactive` prop used; design-system Card has unverifiable surface

`app/creators/page.tsx:94`: `<Card interactive className="p-7 h-full">`. There is no `Card` source in the inputs — the export is at `components/ui/index.ts:5`. Without seeing the implementation: either `interactive` is a `boolean` prop or it is forwarded to DOM (warning on `interactive` attr unknown). Inspect.

### P1-11. `font-mono` overlaps with literal `font-family` in inline `style`

`Hero.tsx:65-79`: `font-mono` class on parent + `style={{ ... }}` mixing in inline values, while at `landing-interactive.tsx:65` also uses `font-mono`. Consistent. But `WinThread.tsx:115-121` has `LiveMsgIn` with no `font-mono` while `landing-interactive.tsx:286-292` has the same component re-implemented (also no font-mono). Two `MsgIn` definitions: `WinThread.tsx:115` and `landing-interactive.tsx:286`, identical, neither shared. Same for `MsgOut` (`WinThread.tsx:123` vs `landing-interactive.tsx:294`) and `PayCard` (`WinThread.tsx:131` vs `landing-interactive.tsx:308`). Extract one set to `components/landing/messages.tsx`.

### P1-12. `KEYS` const in `WinSend.tsx:8` is duplicated by `keys` array literal in `CapabilitiesGrid.tsx:273`

`['1','2','3','4','5','6','7','8','9','.','0','⌫']` defined twice. Lift to a `landing/keypad-keys.ts` const, or make a shared `<KeypadGrid size="sm|lg" />`.

### P1-13. Avatar gradient strings hand-rolled across 6 files

`linear-gradient(135deg,#ff9ec7,#ff6b9d)` (Mira) appears in `Hero.tsx:133`, `WinChats.tsx:20`, `WinThread.tsx:22`, `WinSend.tsx:23`, `CreatorProfile.tsx:82`. Same for Alex (`#78cfc1,#3aa693`) at `WinChats.tsx:30`, `CreatorProfile.tsx:230`. There is an `Avatar` primitive in `ui/index.ts:7` — six call sites bypass it with hand-rolled markup + style. Either consume `Avatar` everywhere or extract a `AVATAR_GRADIENTS` map in `lib/avatars.ts`.

### P1-14. `marketing-chrome.tsx` `MarketingTopbar` is a server component but renders `<HeaderConnectPill />` which is client — fine — but the `active?` prop is per-page hardcoded as a string

`marketing-chrome.tsx:17-22`. Every page passes `active="/capabilities"` etc. (`capabilities/page.tsx:129`, `flow/page.tsx:113`, `creators/page.tsx:56`, `system/page.tsx:121`, `app/page.tsx:64`). Use `usePathname()` from `next/navigation`. But that requires `'use client'` on the topbar — which would defeat (P0-1)'s goal. Compromise: keep the `active` prop, but type it as `'/' | '/capabilities' | '/flow' | '/creators' | '/system'` so the next refactor can find every call site.

### P1-15. `app/system/page.tsx` `interface FeatureBlurb` is exported with `icon: typeof Star` — type abuse

`app/creators/page.tsx:16-21`: `icon: typeof Star`. This types the `icon` field as the specific `Star` LucideIcon type, not any LucideIcon. Adding a non-Star icon to the `FEATURES` const will type-check by accident because all lucide icons share the same shape. Use `LucideIcon` (already imported as a type in `app/capabilities/page.tsx:23`).

### P1-16. `app/page.tsx` `Serif` component is a duplicate of `components/ui/section-head.tsx:50-58` `Serif`

`app/page.tsx:29-31` declares a local `Serif`. Lines 16-22 import from `@/components/landing/...` but **not** from `@/components/ui`. The other four pages (`capabilities`, `flow`, `creators`, `system`) import `Serif` from `@/components/ui`. Inconsistent. Delete the local one, import from `ui`.

### P1-17. `app/system/page.tsx` `<pre>` snippets are not escaped and use template-literal newlines

Lines 28-35, 42-48, 55-59. Template literals interpolating `\n` work fine, but no `<code>` wrapper, no syntax highlight, no `aria-label`. For a "System" page the engineering-craft signal of these blocks should be high. Wrap in `<code>`, set `lang` for shiki/sugar-high if available, else add `aria-label="Example MCP config"`.

### P1-18. CSS keyframes that are never referenced

`globals.css:158-162` `@keyframes ori-blink` + `globals.css:181 .anim-blink`. `globals.css:166-170 ori-card-in` + `.anim-card-in`. `globals.css:173-176 ori-fill-up`. None of the inputs reference these classes. The Hero pay-card uses Framer Motion (`landing-interactive.tsx:320-340`), not CSS. Either wire them up or delete to keep CSS focused. Same: `.anim-ring-pulse`, `.anim-motion-slide` (the latter is replaced by an inline `style={{ animation: 'ori-motion-slide ...' }}` at `SystemGrid.tsx:174` — but there's also a `.anim-motion-slide` helper at `globals.css:183` with a *different duration* (3.2s vs the inline 2.4s). One source of truth.

### P1-19. `font-mono tracked-tight` typo at `CapabilitiesGrid.tsx:276`

`tracked-tight` is the codebase's local class (defined `globals.css:128-130`). But `CapabilitiesGrid.tsx:276` reads `tabular-nums text-[44px] font-medium tracked-tight leading-none mb-4 text-center font-mono`. `tracked-tight` does not collide with anything but this is non-Tailwind syntax — `tracking-tight` is the Tailwind utility. The custom helper applies `letter-spacing: -0.022em` — fine. But it is not consistently applied: `WinSend.tsx:41`, `WinThread.tsx:137`, `WinThread.tsx:140`, `CreatorProfile.tsx:39` use `tracked-tight`. `Hero.tsx:18-25` uses inline `letterSpacing: '-0.045em'` which differs from `tracked-tight`. Make a typography utility set; pick one.

### P1-20. `<button>` without explicit `type` attribute

All buttons in inputs *do* set `type="button"` consistently (e.g., `Hero.tsx:159`, `WinChats.tsx`, `WinThread.tsx:32`, `WinSend.tsx:31`, `CapabilitiesGrid.tsx:355`, etc.) — except `landing-interactive.tsx:80` (`<button onClick={() => void openConnect()} className={baseClass}>`). Add `type="button"`.

### P1-21. Inline `style` everywhere defeats the @theme system

Many `style={{ fontSize: 'clamp(...)', fontWeight: 400, letterSpacing: '-0.04em' }}` blocks (`app/capabilities/page.tsx:137-142`, `app/flow/page.tsx:121-126`, `app/creators/page.tsx:64-69`, `app/system/page.tsx:129-134`, `Hero.tsx:20-25`, `Hero.tsx:31-34`, `Hero.tsx:91-100`, `CapabilitiesGrid.tsx:213-219`, `CapabilitiesGrid.tsx:247-253`, `CreatorProfile.tsx:81-84`, `Philosophy.tsx` is OK with classes). These should be `text-display-1`, `text-display-2`, `text-h1`, `text-h2`, `text-body`, `text-caption` utilities driven from `@theme`. Currently the rebuild has *zero* type-scale utilities; everything is freehand. (See P0-5 for the root fix.)

### P1-22. `globals.css:50` `--color-primary-foreground: #0a0a12` (dark ink on accent), but `LiveMsgOut` at `landing-interactive.tsx:296` writes `text-white`, ignoring the token

The whole point of the token rename was to use dark ink on indigo. `landing-interactive.tsx:296` `bg-[var(--color-primary)] text-white` undoes it. Use `text-[var(--color-primary-foreground)]` (matches `WinThread.tsx:125`).

---

## P2 — Polish

### P2-1. `app/page.tsx:30` `<span className="font-serif italic">` — `font-serif` already sets italic in CSS

`globals.css:116-121`: `.font-serif { font-style: italic; ... }`. The `italic` class on `Serif` at `app/page.tsx:30` is redundant. Same in any other `Serif` call site. Drop `italic`.

### P2-2. `min-h-dvh` on every route

`app/page.tsx:63`, `capabilities/page.tsx:128`, `flow/page.tsx:112`, `creators/page.tsx:55`, `system/page.tsx:120`. Same on `app/layout.tsx:73 body`. Putting it on `<body>` is enough; redundant on `<main>`. (Doesn't hurt — but it's a noise duplicate.)

### P2-3. `ChatItem` has `b?: number` — single-character key names

`WinChats.tsx:7-15` uses single-letter keys (`a` avatar, `g` gradient, `n` name, `t` time, `p` preview, `b` badge). Same in `Step` (`flow/page.tsx:15-19` `n title blurb`), `StatItem` (`StatsRibbon.tsx:6-10`, `flow/page.tsx:48-52` `k unit v`), `Principle` (`Philosophy.tsx:8-12` `n h p`). Fine for an internal tile config but indistinguishable on grep ("what is `b`?"). Rename: `avatar`, `gradient`, `name`, `time`, `preview`, `badge`. Cost: one renaming pass.

### P2-4. `class={'… ' + (active ? 'foo' : 'bar')}` instead of `cn()`

`marketing-chrome.tsx:53-57`, `WinChats.tsx:82-85`, `app/page.tsx:67-69 (n/a)`, `CreatorProfile.tsx:208-213`, `landing-interactive.tsx` — string concatenation pattern. The codebase already has `@/lib/cn` (used in `ui/section-head.tsx:2`, `ui/reveal.tsx:4`). Use it.

### P2-5. `aria-label` on icon-only buttons inconsistent

`WinThread.tsx:32` "Mail", `WinThread.tsx:39` "Group", `WinSend.tsx:32` "Clear recipient", `Hero.tsx:160` "Send message" — all have `aria-label`. Good. But `CapabilitiesGrid.tsx:355-358` (Higher 60s) and `CapabilitiesGrid.tsx:361-365` (Lower 60s) and `:381-387` Unlock are decorative buttons with text content — fine. The "×" close in `WinSend.tsx:30-36` does have aria-label, good. `landing-interactive.tsx:80` connect button has visible text "Launch" but no `type="button"` (P1-20). Fine on a11y.

### P2-6. `app/layout.tsx:71` `dark` class is on `<html>` but no light theme exists

`globals.css:97` sets `color-scheme: dark` and the design is dark-only by intent. The `dark` Tailwind class on `<html>` enables `dark:` variants. None of the inputs use a `dark:` variant. Either commit to dual themes (and use `dark:`) or drop the `dark` class.

### P2-7. `app/layout.tsx:35-39` `appleWebApp` declared, but no companion `<link rel="apple-touch-icon">` size set

`metadata.icons.apple` at `:43` — Next will inject. Fine.

### P2-8. `globals.css:386-395` print stylesheet for a *marketing* landing

Useful, but: the page is a screen reel of motion + dark surfaces. A judge will not print `/`. Cost: ~10 lines. Keep, but trim print-only `nav, .topbar, footer …` hides — `.topbar` is not a class anywhere in the rebuild.

### P2-9. `OriMark` SVG at `marketing-chrome.tsx:134-141` lacks a `<title>` element

Mark is `aria-hidden`, so the parent Link's `aria-label="Ori home"` covers a11y. Fine. But OG/SEO meta-image is not declared with the SVG. Out of scope.

### P2-10. `installPrompt` mounted globally regardless of route

`app/layout.tsx:76`. It shows install banners on `/system` etc. — a user reading a system page is rarely the same person who wants the PWA prompt. Move to (app) layout. Same family of issue as P0-1 / P0-2.

### P2-11. `STATS` array in `app/flow/page.tsx:54-59` and `StatsRibbon.tsx:12-17` are *almost* identical

`flow/page.tsx`: `97ms median settlement / 0 wallet popups / 0% custodial holds / e2e encrypted by default`. `StatsRibbon.tsx`: `97ms median settlement / 1% creator tip fee / 0 wallet popups / e2e encryption by default`. Three of four overlap; one differs. The `StatCell` component is *also* defined twice (`flow/page.tsx:61-83` and `StatsRibbon.tsx:39-63`) with the same body. Extract `<StatCell>` to `components/ui/stat.tsx` (already exported per `ui/index.ts:14`!) and consolidate.

### P2-12. `app/system/page.tsx:175-176` claim "Every primitive in the product is a Move module on the ori-1 rollup" but `MOVE_MODULES` table at `SystemGrid.tsx:198-217` has 18 entries; the page hero says "Eighteen Move modules" (`/system 160`). `app/capabilities/page.tsx:33` says "Sixteen primitives". `landing/CapabilitiesGrid.tsx:21` says "Eight primitives." Numbers contradict across the rebuild.

Internal alignment is required before a designer-judge clicks across pages.

### P2-13. `font-mono` on the shipping pre-block in `app/system/page.tsx:92-96`

The `<pre>` already gets monospace from the user agent. `font-mono` is fine. But the `style={{ fontSize: '12px' }}` at line 95 sits next to a `text-ink-2` class — inline color via class + size via inline-style is the wrong axis split.

### P2-14. `boxShadow` inline in `Hero.tsx:98-100` is 110+ chars

Move to a `--shadow-device-mock` token in `@theme` and reference via class.

### P2-15. `app/layout.tsx:9-29` three `next/font/google` calls — `display: 'swap'` is good, but `Instrument_Serif` is loaded on every route even though only ~20 marketing pages use it

`landing-interactive.tsx`, every page hero, etc. So this is fine for marketing. But the (app) routes (eg. `/today`, `/send`) probably don't use serif. If you split layouts (P0-1), drop `Instrument_Serif` from (app) layout to save a font request.

---

## Summary

The rebuild has good visual range and a clear taste signature. The engineering does not match. The two architectural failures that matter most: (1) the entire wallet stack is bundled into every marketing page (P0-1, P0-2) which is why PERF.md shows landing LCP at 17.9s, and (2) there is no type-scale token system, so every component freelances `text-[Npx]` and inline `style.fontSize` (P0-5, P1-21). Until both are fixed, "every utility maps to @theme" is aspirational. Beyond those, there's heavy duplication (CTA strip ×4, WindowBar ×3, MsgIn/MsgOut/PayCard ×2, StatCell ×2, SectionHead ×3, Serif ×2, KEYS ×2, avatar gradients ×6) — none of which is hard to fix, all of which signals the code wasn't passed through one consolidation review before today.

---

C:\Users\ritik\MINITIA\design-refs\CRITIQUE-engineering.md — P0: 10 · P1: 22 · P2: 15
