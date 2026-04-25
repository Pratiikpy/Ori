# Ori Mobile Critique — Apple Senior Mobile Engineer Review

Reviewer brief: shipping today. Source assets at `design-refs/audit-final/*-mobile.png`. Code under `apps/web/src/app/{layout.tsx,globals.css}` and `apps/web/src/components/{bottom-nav.tsx,header.tsx}`. Reference viewports: iPhone 13 mini 375x812, iPhone 14 390x844, Pro Max 430x932. iOS Safari uses 16px base.

Apple HIG minimum tap target is 44x44pt (CSS px). WCAG 2.5.5 AA = 24x24, AAA = 44x44. Material says 48dp. Anything below 44 on a primary action is a P0 by HIG.

---

## P0 — Ship-blockers

### P0-1. Bottom nav tap target 56x76px-ish in a 5-col grid — items hover near the home-bar
File: `apps/web/src/components/bottom-nav.tsx:46,56`
- `<nav>` is `sticky bottom-0`. Container height comes from `h-14` on each `<Link>` = 56px.
- 56px is below Apple HIG 44pt minimum on the *vertical* axis only marginally OK (56 > 44), BUT on a 375px-wide viewport with `grid-cols-5`, each column = ~75px so width is fine. Real failure: there is no inner padding floor — the icon (18x18) plus 10.5px label plus `gap-1` collapses to ~44px of content centered vertically inside 56px, and the active 8px primary line sits at `top-0` *under* the iOS home-bar safe-area. On a 14 Pro / 15 / 16 the home indicator at the bottom (34px) overlays the label row.
- `safe-area-bottom` adds `padding-bottom: max(1rem, env(safe-area-inset-bottom))` *to the nav itself*, which does push content up — but the 56px row stays fixed at 56px (height is on `<Link>`, not the row), so labels are only ~6px above the indicator after inset is applied. On a Pro Max in landscape (428x... with notch on the left), the grid columns shrink to 75px each, no inset on the sides, so taps near the screen edge fight the iOS swipe-up gesture. Add `safe-area-left/right` and lift the row to `h-16` (64px) minimum.
- Fix: change `h-14` to `h-16`, add `pb-[env(safe-area-inset-bottom)]` ONLY on the inner `<ul>`, not the nav, so the hairline border sits flush against the bezel and items get the extra height. Also add `pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]` for landscape on iPhone with notch.

### P0-2. Header is 56px and shares vertical airspace with the iOS dynamic island on 14 Pro / 15 / 16 series
File: `apps/web/src/components/header.tsx:30-31`
- `h-14` (56px) + `safe-area-top` (`max(1rem, env(safe-area-inset-top))`) — on iPhone 14 Pro the dynamic island is roughly 37x125pt centered at the top, with `safe-area-inset-top` ≈ 59px. So total header height becomes ~115px.
- That's fine geometrically, BUT the brand lockup `Link` at `flex items-center gap-2.5` with `h-6 w-6` SVG and the "Sign in" / wallet button at `h-8` (32px) sit centered in 56px, *below* the safe-area inset. 32px tap targets fail HIG 44pt outright — primary nav button "Sign in" / wallet pill is 32px tall.
- Auto-sign toggle: `h-8` rounded-full pill at line 80 — 32px — same issue, and it is the most-tapped affordance on a paying-user surface.
- Fix: bump button height to `h-11` (44px). Or keep visual height at 32 but add `before:absolute before:inset-[-6px]` invisible hit-slop (the React Native trick), giving a 44px touch zone without changing layout.

### P0-3. Predict page (predict-mobile.png) — 4 stake amount buttons on one row at 375px width
Image: `predict-mobile.png` rows "0.1 / 0.5 / 1 / 5" and "60s / 5 min / 1 hr / 1 day"
- At 375px viewport with 16px page padding each side, content width = 343px. Four equal columns = ~85.75px, minus `gap` (likely 8-12px) → ~76px per cell. Cell height visually ~32px. That's 76x32 — fails 44x44.
- "BTC ETH SOL ATOM BNB" token row above is 5 across at 343px — ~67px each, again ~32px tall. Fail.
- Fix: stack stake amounts as 2x2 grid on mobile (`grid-cols-4 lg:grid-cols-4 sm:grid-cols-2`), bump cell to `min-h-11`. Token chips: horizontal scroll with `overflow-x-auto snap-x` and `min-w-11 min-h-11` per chip. Hide scrollbar but keep momentum scroll.

### P0-4. Predict page first-send onboarding sheet (send-mobile.png) blocks the entire UI behind a backdrop blur
Image: `send-mobile.png` shows a popover anchored to bottom-left ("FIRST SEND ON ORI") with three bullets and a "Got it" CTA. Above it the entire page content is blurred to ~20% legibility.
- Sheet has no clear close target other than the tiny `x` at top-left ~24x24px. HIG fail.
- Sheet is anchored bottom — the iOS keyboard will obliterate it if any input gets focus.
- "Got it — send my first one" CTA has no visible button affordance — looks like a text link sitting in a dark void. Below the iOS home indicator footprint based on the screenshot.
- Fix: use a real bottom sheet (radix-ui `Sheet` or vaul), full-width handle, 44x44 close button top-right, primary CTA as a filled button at minimum `h-12` with `mb-[env(safe-area-inset-bottom)+12px]`.

### P0-5. Viewport meta is good — but `viewportFit: 'cover'` is set without consistent safe-area handling on inner pages
File: `apps/web/src/app/layout.tsx:60` — `viewportFit: 'cover'` is correct for edge-to-edge.
- BUT: there is no global `body { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right) }`. Inner pages using `.shell` get `clamp(20px, 4vw, 40px)` horizontal padding which is independent of safe-area. In landscape on a notched iPhone, content slides under the notch.
- `.safe-area-top` and `.safe-area-bottom` exist (globals.css:319-322) but they only apply *padding* — they don't account for left/right insets in landscape.
- Fix: add `.safe-area-x { padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right)) }` and apply on header + bottom-nav. Or set `body { padding-inline: env(safe-area-inset-left) env(safe-area-inset-right) }`.

### P0-6. Home hero device mockup — phone-on-phone is sized wrong at 375px
Image: `home-mobile.png` — the device mockup (chat showing Maya, "-16.20", keypad) appears full-width inside a phone frame.
- On a real 375px viewport, a "phone showing a phone" mockup needs the inner phone to be ≤ 65% of outer width or it loses framing context. The screenshot suggests the mock device is essentially edge-to-edge — at that scale it looks like the actual page chrome, not a mockup.
- Worse: the mockup contains its own keypad + animated "-16.20" amount + send buttons. Users will *try to tap the keypad in the mockup*. There is no `pointer-events: none` indication, and the visual hierarchy makes it indistinguishable from a real input.
- Fix on mobile: either (a) replace the device frame with a static screenshot at 88% width with explicit "preview" chrome (window dots, label "ori.app"), or (b) hide the device mockup below `lg:` and use a much simpler hero illustration.

### P0-7. Today page (today-mobile.png) — long-form essay column with no readable line length control
Image: `today-mobile.png` — content runs the full available width at 375px. Body sans at presumably 15-16px, but the "Three surfaces. One conversation." heading is enormous and the prose paragraph runs full-bleed.
- Reading width of 38-45 chars/line on mobile is the iOS HIG/Readability default. At 375px - 32px gutters = 343px container, with 15px body text and no `max-w-prose`, line length is ~60 chars — readable, but the H1 above runs ~28 chars at very large size which causes ugly orphan breaks.
- Status fields (`-16.20`, `97`, `0`, `e2e`) at the bottom appear in a 4-col grid — same issue as P0-3, cells too narrow.
- Fix: add `max-w-[34ch]` on the H1 to control breaks. The metric grid: 2x2 instead of 4x1.

---

## P1 — Should ship today, but fixable in <2hr

### P1-1. Tap delay / fast-click — `touch-action: manipulation` not set globally
File: `apps/web/src/app/globals.css:93-100` (html block)
- `-webkit-tap-highlight-color: transparent` is set, good. But `touch-action: manipulation` is missing. iOS Safari ≥ 9.3 honors this to remove the 300ms double-tap-to-zoom delay on interactive elements while still allowing pinch-zoom (which is correctly preserved per layout.tsx:56-61). Without it, every Tailwind `<button>` and `<Link>` carries a 300ms delay on iOS for the first tap if it's near previously-tapped territory.
- Fix: `html { touch-action: manipulation }` — or apply to `button, a, [role=button]`. Don't use `touch-action: none` (that breaks pinch-zoom).

### P1-2. Capabilities page (capabilities-mobile.png) — 16-row primitive list with no visual scan affordance
Image: `capabilities-mobile.png` — flat list of 16 items, every row identical typography weight: numbered eyebrow + name + sentence. No chunking, no section dividers, no progressive disclosure. On a 375px screen this is a 4-screen scroll wall with nothing to break it up.
- "Send by name" / "Bulk send" / "One-tap tips" / etc. — names are bolded but at the same size as body, and all 16 sit on identical surfaces.
- Fix: chunk into 3 groups (Pay / Earn / Trade) with a sticky group header that pins as you scroll. Or make rows expandable accordion-style on mobile so the list collapses to 16 short titles ~600px tall.

### P1-3. System page (system-mobile.png) — code blocks overflow horizontally
Image: `system-mobile.png` — multiple `{...}` JSON code blocks visible. On 375px viewport, JSON like `"address":"0x...long..."` will require horizontal scroll inside the code box.
- Code blocks should wrap or use `overflow-x-auto` with a clear scroll cue (gradient mask on the right edge). If they don't have it, the content sits unread and feels broken.
- Also "MCP — Model Context Protocol" and other A2A/x402 sections have schema diagrams that look like they're pre/code — verify each `<pre>` has `overflow-x-auto` and `text-xs` on mobile.
- Fix: `pre { overflow-x: auto; -webkit-overflow-scrolling: touch; mask-image: linear-gradient(to right, black calc(100% - 24px), transparent) }`.

### P1-4. Flow page (flow-mobile.png) — chat bubbles render at fixed 80% width on mobile, look unbalanced
Image: `flow-mobile.png` — chat conversation with multiple bubbles. On mobile chat bubbles should follow iMessage convention: max-width ~75% of container, never edge-to-edge. From the screenshot the bubbles do limit to ~80% but the embedded "card" with `-16.20` amount is full-width — breaks the visual rhythm.
- The keypad mock below ("-16.20" with 0-9 buttons) at full width again, same phone-on-phone issue as P0-6.
- Fix: keep payment-card mock to ≤ 280px max-width and center, add subtle frame/shadow that makes it read as "embedded receipt" not "this is the page".

### P1-5. Creators page (creators-mobile.png) — two-column-feeling layout pinches at 375px
Image: `creators-mobile.png` — large pink/magenta avatar + name, then horizontal stat strip "1.2k / $1.81 / $1.81 / 2.1k", then a row of action items.
- Stat strip: 4 cells across 343px = ~85px each. At label + value + sub-label stacked, height likely 50-60px — borderline tap target if these are interactive.
- "Latest film" / "Tip jar URL" / "Subscriptions, escrowed" / "Loyalty as on-chain badge" — these read as cards but each appears very short (~80px) with action targets unclear.
- Fix: stat strip 2x2; cards all `min-h-20` with full-width tap surface and explicit chevron-right cue.

### P1-6. Header brand lockup wraps when title is long
File: `apps/web/src/components/header.tsx:32-48`
- "Ori / Predict" — at 375px with brand lockup (~65px) + slash + `text-[13px]` title, fine at ~120px total. But "Ori / Subscriptions, escrowed" or longer page names will push the auto-sign 1-TAP pill + wallet pill off-screen.
- The right cluster has `ml-auto` but no `min-w-0` on the Link — meaning truncate won't kick in and the right buttons get clipped.
- Fix: add `min-w-0` on the Link, `truncate` on the title `<span>`, `max-w-[120px]` on the title at sm breakpoint.

### P1-7. Send page (send-mobile.png) z-stacking — backdrop blur over keypad does not reach the very top
Image: `send-mobile.png` — the modal sheet blurs the page but the very top status-bar region (where iOS time / battery sit) appears un-blurred — this is just the OS chrome, fine — but the dark gradient transitions abruptly into the unblurred section. Not a bug, just looks unfinished.
- Fix: extend the blur backdrop to `inset-0` and let the OS draw over it.

### P1-8. Globals.css `body { overscroll-behavior-y: none }` disables iOS rubber-band scroll
File: `apps/web/src/app/globals.css:103`
- This removes the bounce-scroll. Users perceive a non-bouncy mobile web view as "feels like a website", and worse, kills the affordance that you've reached the top/bottom of the page. iOS Safari users will think the page is broken.
- Acceptable on a fixed-position chat input page (prevents pull-to-refresh from triggering when scrolling a chat). NOT acceptable on `/today`, `/predict`, marketing pages.
- Fix: scope to `<main data-no-bounce>` or to specific routes. Default body should bounce.

### P1-9. Bottom nav uses `sticky bottom-0` — but `position: sticky` on a child of a non-scrolling root doesn't behave like `fixed`
File: `apps/web/src/components/bottom-nav.tsx:46`
- If any parent has `transform`, `filter`, or `will-change`, sticky breaks down. The `body` has `min-h-dvh` (good) but inner page wrappers often use `motion.div` from framer-motion which sets `transform` — the bottom nav will then scroll WITH the page instead of pinning.
- Fix: change to `fixed bottom-0 left-0 right-0` and add `pb-[64px]` to a `<main>` wrapper to reserve space.

### P1-10. Font ladder — `-apple-system` is NOT in the fallback chain
File: `apps/web/src/app/layout.tsx:9-13` and globals.css token `--font-sans: var(--font-sans)`
- `next/font/google` Geist defines `--font-sans` with a fallback to `system-ui, sans-serif` by default — but the spec doesn't include `-apple-system, BlinkMacSystemFont, 'Segoe UI'` explicitly. On iOS Safari, before Geist loads, you get system-ui which is fine; but on older iOS versions (< 13) system-ui is undefined and falls all the way back to sans-serif (Helvetica), which doesn't match Geist's metrics → layout shift.
- More critically: `font-feature-settings: 'ss01', 'ss02', 'cv11'` is set globally on `html` — these are Geist-specific stylistic sets. When Geist hasn't loaded and the fallback renders, the browser ignores the unknown features (fine), but on the *first paint* iOS may apply them to system-ui causing a flash where digits look subtly wrong.
- Fix: explicit fallback chain `font-family: var(--font-sans), -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif`. Move the `font-feature-settings` to `body.font-sans-loaded` toggled via `next/font` font-display or a CSS `font-loaded` class.

---

## P2 — Polish, post-ship

### P2-1. Status bar style `black-translucent` requires the page to draw under the status bar
File: `apps/web/src/app/layout.tsx:36-40`
- `appleWebApp.statusBarStyle: 'black-translucent'` — when installed as PWA, the status bar overlays your content. With `viewportFit: cover` this is correct. BUT the header `safe-area-top` uses `max(1rem, env(safe-area-inset-top))` so it gets pushed down. Verify on real device — sometimes the top of the header content gets hidden under the iOS status bar when this is wrong.
- Fix: test on real iPhone. If hidden, use `pt-[env(safe-area-inset-top)]` on the body, not the header.

### P2-2. Active indicator on bottom nav is 1.5px tall — invisible on retina at viewing distance
File: `apps/web/src/components/bottom-nav.tsx:60-62`
- `h-[1.5px] w-8` — 1.5 CSS px is 3 device px on a 2x retina screen. Visible, but at arm's length on a 375px iPhone mini, easy to miss. Compare to iOS native tab bar which uses color tinting (whole icon turns blue) — much clearer.
- Fix: increase the active-state contrast on the icon itself: `text-primary-bright` for the active item, lift the indicator to 2px.

### P2-3. The "Launch →" button in screenshots has unclear bounds
Image: top-right of multiple `*-mobile.png` shots
- Looks like a text link rather than a primary CTA. On capabilities-mobile.png it's the only path forward and reads as low-affordance.
- Fix: pill background `bg-white/[0.06]` with explicit border so it reads as button. Or rename to "Get started" and make it `h-9 px-4 rounded-full`.

### P2-4. Keypad in send-mobile.png — 0-9 buttons appear ~52x52px each, OK by HIG, but no haptic / no pressed state visible
- Tap-and-hold on a digit on iOS will trigger context menu / text selection — needs `user-select: none` and `touch-action: manipulation` on the keypad container.
- Fix: `.keypad button { user-select: none; -webkit-user-select: none; touch-action: manipulation; }`

### P2-5. The animated "-16.20" red amount in hero — number flashes update in viewport, may cause vestibular issues
Image: `home-mobile.png`, `flow-mobile.png`
- iOS users with reduced-motion preference should see the static end-state. globals.css:366-376 *does* have a `prefers-reduced-motion` block — verify Framer Motion components also wrap their animations in `useReducedMotion()`.
- Fix: audit any framer-motion `motion.div` for reduced-motion guards.

### P2-6. No iOS pull-to-refresh on `/today` / `/chats`
- Mobile web users now expect pull-to-refresh on feed-like surfaces. `overscroll-behavior-y: none` (P1-8) explicitly blocks the gesture. Even if you don't wire refresh, leaving rubber-band on signals "this is alive".
- Fix: pair with P1-8.

### P2-7. Horizontal scroll bugs — verify no element causes overflow at 375
- Common culprits in this codebase: long mono addresses, untruncated wallet pills (`shortenAddress` truncates at 8...4 = 12+1 chars, ~70px in mono — fine), the auto-sign 1-TAP pill (`h-8 px-3` ~64px — fine).
- Need to verify: code blocks (P1-3), token chips (P0-3), pre-formatted JSON in /system (P1-3).
- Fix: add `<html style="overflow-x: hidden">` as a safety net (controversial — masks real bugs). Better: add a Cypress test `cy.viewport(375, 812).visit('/').scrollTo('right').location().should(eq, scrollX:0)` per route.

### P2-8. Skip-to-content link only triggers on Tab — no mobile equivalent
File: `apps/web/src/app/globals.css:340-351`
- Mobile screen-reader users (VoiceOver) navigate via swipe, not tab. The skip link works for VO too actually (rotor → links) but the visual position is desktop-keyboard-centric. Fine.

### P2-9. Auto-sign 1-TAP / OFF pill state is hidden behind text
File: `apps/web/src/components/header.tsx:74-89`
- "1-TAP" vs "OFF" — color-coded (primary indigo vs muted), but in bright sunlight on iPhone outdoor a colorblind user sees identical pills.
- Fix: add an explicit lock/zap icon alongside text as you already do (Zap/ZapOff) — verify icon color contrasts with bg in both states.

### P2-10. Reflow check at 430x932 (Pro Max) — content centers, gutters grow but no layout takes advantage
- At 430px the `.shell` gives `clamp(20px, 4vw, 40px)` = `min(40, 4vw)` = 17.2px at 430 → clamps to 20px. So content gets 390px wide. On a Pro Max this looks empty — same as iPhone mini visually.
- Not a bug, but missed opportunity: nothing scales up. Fine for ship.

---

## Summary

P0 issues: 7
P1 issues: 10
P2 issues: 10

Most acute: bottom-nav and header tap targets (P0-1, P0-2) — these touch every screen, every session. Predict page button grid (P0-3) is the next must-fix because it's the only page where 4-across is unavoidable from the screenshot. Onboarding sheet (P0-4) breaks first-run flow.

Viewport / accessibility wins (layout.tsx:53-61) are well done — pinch-zoom enabled, viewport-fit cover, safe-area helpers exist. Execution gap is at the page/component layer where helpers aren't applied consistently.
