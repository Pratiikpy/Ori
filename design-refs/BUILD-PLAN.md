# BUILD-PLAN — order of work, file structure, acceptance (Phase 2)

Per §12 / §13. Cite frontend-design SKILL.md ✓ (loaded into prep).
Reads from: TOKENS.md · COMPONENTS.md · IA.md · CONTENT.md · ASSETS.md · GAPS.md · DECISIONS.md.

## Order of work

1. **Phase 3.0 — Token + globals audit (1 commit)**
   - Diff `apps/web/src/app/globals.css` `@theme` block against `TOKENS.md`. Fix any drift.
   - Verify `font-feature-settings` body + `.mono` rules.
   - Verify `backdrop-stars` + `backdrop-stars-quiet` exact values.
   - Verify `.reveal` keyframe + transition.

2. **Phase 3.1 — Shell primitives (1 commit)**
   - `<MarketingTopbar/>` exact height (54px), blur 20px saturate(1.4), gradient bg, 1px hairline border.
   - `<MarketingFooter/>` 4-col → 1-col responsive, status row with pulsing green dot.
   - `<AppHeader/>` (the existing `header.tsx`) — verify max-w-6xl inner row, brand mark + auto-sign + wallet pill, optional desktop nav (Today/Ask/Predict/Create/Chats).
   - `<BottomNav/>` `lg:hidden` discipline, max-w-md inner.
   - `<AppShell/>` provides `<main mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-8>`.

3. **Phase 3.2 — Hero + device mock (1 commit)**
   - `<Hero/>` with heroTag, h1.hero-title, hero-sub, hero-actions
   - `<DeviceMock/>` 9/19.5 aspect, 44px radius, notch, indigo glow shadow, chat innards
   - `<LiveDeviceChat/>` already exists — verify spring entry, card-in keyframe
   - `<DeviceParallax/>` already exists — verify hover-only gating

4. **Phase 3.3 — Landing `/` rebuild (1 commit, 1 sub-agent)**
   - From scratch using `page.tsx` slot.
   - Sections in order: Topbar → Hero → Stats Ribbon → Capabilities (8 panels) → Flow (3 windows) → Creators (Linktree mira.init) → Philosophy (3-up) → System (DSGrid 4-up) → Footer
   - Every section wrapped in `<Reveal>` (IO-based)
   - Italic-serif accents on emphasis words per `CONTENT.md`

5. **Phase 3.4 — Marketing route uplifts (4 sub-agents in parallel)**
   - `/capabilities` — 16-tile grid (per D1), full OS-window panel chrome, click-through to live feature page
   - `/flow` — three-window FlowStage at desktop, stacked at mobile
   - `/creators` — full LinktreeProfile with cover gradient + xl avatar + verified badge + stats row + tip-bar chips + lt-link rows + tabs + 5 feed items
   - `/system` — DSGrid (type/color/radii/motion) AND 18-Move-module table per D1

6. **Phase 3.5 — Routing fix for /today, /chats, /settings (P0)**
   - Investigate why `/[identifier]` catch-all wins. Check page existence, generateStaticParams, layout collisions.
   - Fix and verify each returns its own page, not landing.

7. **Phase 3.6 — App page consistency pass (1 sub-agent)**
   - Strip remaining per-page `max-w-*` wrappers
   - Apply consistent `<PageHeader/>` rhythm
   - Verify `backdrop-stars-quiet` on all
   - Fix `/paywall/mine` button overflow
   - Fix `/send` blocking modal

## Final file structure (target)

```
apps/web/src/
  app/
    layout.tsx                       # fonts + Providers + InstallPrompt only
    globals.css                      # @theme tokens, backdrop, reveal, page-base
    page.tsx                         # /  (landing — full rewrite)
    capabilities/page.tsx            # /capabilities
    flow/page.tsx                    # /flow
    creators/page.tsx                # /creators
    system/page.tsx                  # /system
    today/page.tsx                   # /today (3-col grid, sticky sidebar)
    onboard/page.tsx                 # /onboard
    [identifier]/                    # public profile catch-all
    chats/, chat/[id]/               # /chats + /chat/[id]
    create/, send/, send/bulk/, gift/, gift/new/, paywall/new, paywall/mine,
      paywall/[id]/pay, predict, settings, streams, subscriptions, squads,
      lucky, discover, ask, portfolio, agent/[address]
  components/
    landing/                         # NEW: split landing primitives
      Hero.tsx
      StatsRibbon.tsx
      CapabilitiesGrid.tsx
      FlowStage.tsx                  # 3-window grid
      WinChats.tsx, WinThread.tsx, WinSend.tsx
      CreatorProfile.tsx             # LinktreeProfile, mira.init mock
      Philosophy.tsx
      SystemGrid.tsx                 # DSGrid
    ui/                              # KEEP — already solid
      button.tsx, card.tsx, chip.tsx, eyebrow.tsx, field.tsx,
      empty-state.tsx, os-window.tsx, pill.tsx, reveal.tsx,
      section-head.tsx, stat.tsx, verified-badge.tsx, avatar.tsx,
      index.ts
    icons/                           # NEW: ASSETS.md verbatim SVGs
      OriMark.tsx, ArrowIcon.tsx, NetworkSVG.tsx, VerifiedBadge.tsx,
      SendArrowIcon.tsx, SearchIcon.tsx, MailIcon.tsx, MoreDots.tsx
    marketing-chrome.tsx             # MarketingTopbar + MarketingFooter (existing)
    app-shell.tsx                    # AppShell + Header (existing)
    header.tsx, bottom-nav.tsx       # existing
    landing-interactive.tsx          # existing — keep ScrollReveal, HeaderConnectPill
    page-header.tsx                  # existing
    activity-feed.tsx, weekly-stats.tsx
    reputation-panel.tsx, merchant-section.tsx
    agent-policy-section.tsx
    qr-modal.tsx, qr-display.tsx
    chat-composer.tsx, big-number-keypad.tsx, ...
  lib/                               # KEEP all
    contracts.ts (do not touch — cofounder owns)
    tx.ts, api.ts, api-chats.ts, api-presence.ts, api-profile.ts
    chain-config.ts, crypto.ts, cn.ts, ws.ts, realtime.ts, ...
  hooks/                             # KEEP
```

## Files to DELETE / replace

| File | Action | Why |
|---|---|---|
| `apps/web/src/app/page.tsx` (1226 lines) | rewrite | drifted from reference |
| Any inline `<header>` per-page | delete | shared chrome owns this |
| Per-page `max-w-md mx-auto w-full px-5 pt-8 pb-6` wrappers | delete | AppShell owns width |
| `next-env.d.ts` route path bumps | revert | dev-only auto-gen |

## Acceptance criteria per page

For every page:
- [ ] Live deploy returns HTTP 200
- [ ] `audit-final/<slug>-{desktop,tablet,mobile}.png` exists
- [ ] Side-by-side diff vs `source-shots/landing-{viewport}.png` (marketing) — visual delta < 5% in alignment, < 1px in font size, < 3% in lightness
- [ ] All `<Reveal>` blocks have `.in` class after IntersectionObserver fires
- [ ] All money / stat numbers use Geist Mono with `tabular-nums`
- [ ] Italic serif on the accent words listed in `CONTENT.md`
- [ ] `axe-core` 0 violations
- [ ] Lighthouse mobile ≥ 90 perf, ≥ 95 a11y
- [ ] Reduced-motion test: animations skip cleanly

For app pages additionally:
- [ ] No max-w-* wrapper at page root (AppShell owns it)
- [ ] Backdrop is `backdrop-stars-quiet`, not `backdrop-stars`
- [ ] BottomNav present on mobile, hidden on desktop
- [ ] Header desktop nav highlights active route

## LOC budget

- Components: ≤ 300 LOC each. Decompose if larger.
- Pages: ≤ 400 LOC. Compose from components.
- The new `page.tsx` for `/` will likely be ~250 LOC (mostly composition).
- `CreatorProfile.tsx` ≤ 250 LOC (tip-bar, lt-links, feed all subcomponents)

## Estimated component count delta

- Net new: ~12 components (`landing/Hero`, `landing/StatsRibbon`, `landing/CapabilitiesGrid`, `FlowStage`, `WinChats`, `WinThread`, `WinSend`, `CreatorProfile`, `Philosophy`, `SystemGrid`, `NetworkSVG`, `OriMark` + others into `icons/`)
- 0 deleted
- Existing primitives reused; ~40% of `ui/` already present.

## frontend-design skill citation

This plan honors the `frontend-design` skill's contract:

- Token-only spacing — every utility maps to a `@theme` value
- One typography rhythm — Geist + Instrument Serif italic accent + Geist Mono for data
- Single accent — indigo `#6c7bff`; no second accent introduced
- Hover whisper — borders brighten one step, no scale, no glow pulse
- Reveal-on-scroll subtle — 0.9s ease-out, 20px y-translate
- Backdrop is structural — not optional
- Restraint is the design move — every section that doesn't earn a card stays bare
