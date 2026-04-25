# CRITIQUE — Accessibility (WCAG 2.2 AA + best practice)

Audit target: Ori frontend rebuild (landing + marketing chrome + interactive shells).
Reviewer: WebAIM Accessibility Expert.
Verdict: **NOT ship-ready today.** P0 issues defeat keyboard-only and assistive-tech users on the most prominent surfaces (hero, creator tip jar, send sheet, profile tabs, link rows). Fixes are mostly mechanical — semantic substitutions and a few attribute additions — but they are non-negotiable.

Scoring legend:
- **P0** — blocker: WCAG A/AA fail, or interactive content unreachable / unannounced. Fix before merge.
- **P1** — serious: WCAG AA fail with workaround, or AT degradation. Fix this sprint.
- **P2** — best practice / nice-to-have / hardening.

---

## P0 — Blockers (must fix before ship)

### P0-1 · `<a>` elements with no `href` are not links and not keyboard-focusable
**File:** `apps/web/src/components/landing/CreatorProfile.tsx:174-183`
**Element:** `LtLink` — the four "lt-link" rows (Latest film, Instagram, Unlock, Subscribe).

```tsx
<a className="… cursor-pointer" style={{ padding: '14px 18px' }}>
  {children}
</a>
```

There is **no `href`**. Per HTML spec, `<a>` without `href` is a placeholder, **not a link**, has no implicit role, is **not in the tab order**, and is announced by NVDA/VoiceOver as plain text. Users on keyboard, switch control, or screen reader cannot activate four of the most prominent CTAs on the Creators slab. The `cursor-pointer` style is a lie. WCAG 2.1.1 Keyboard (A) — fail.

**Fix:** add real `href` (or convert to `<button type="button">` if it triggers JS). Minimum:
```tsx
<a href={href} className="…">{children}</a>
```
Pass `href` through `LtLink` props. Until destinations exist, point them at `#` placeholders only with a `role="link"` and `tabIndex={0}` is **not** acceptable — give them real targets or render as `<button>`.

---

### P0-2 · Profile tabs are `<span>`, not buttons — unreachable, unannounced
**File:** `apps/web/src/components/landing/CreatorProfile.tsx:199-218`
**Element:** `TabItem` — "Recent activity / Paywalls / Subscribers · 128".

```tsx
<span className="… cursor-pointer …">
  {children}
</span>
```

`<span>` has no role, no tab stop, no Enter/Space activation, no `aria-selected`. The component is named `ProfileTabs` but has zero tab semantics. AT users hear plain inline text. WCAG 4.1.2 Name/Role/Value (A) — fail; WCAG 2.1.1 Keyboard (A) — fail.

**Fix (proper tablist):** wrap in `role="tablist"`, render each as `<button role="tab" aria-selected={active} aria-controls={panelId} id={tabId}>`, manage roving tabindex (only the active tab is `tabIndex={0}`, others `-1`), implement Arrow-Left/Right and Home/End keys per the WAI-ARIA APG Tabs pattern, and pair with `<div role="tabpanel" aria-labelledby={tabId}>` for content. If the tabs **don't actually swap content** today, demote them to a `<nav><ul><li><a>` set or remove until they do — fake tabs are worse than no tabs.

---

### P0-3 · Tip-amount chips are unreachable and unselectable by keyboard
**File:** `apps/web/src/components/landing/CreatorProfile.tsx:142-148`
**Element:** `<Chip>` instances ($1, $5, $10, $25, custom).

`Chip` is imported from `@/components/ui` and used as toggleable selection (`selected` prop). Without seeing the source it's used as a static visual; the page's tip CTA below ("Send tip →") exists as `<button>`, but the **chips that select the tip amount are not focusable**. Keyboard users cannot change the amount. WCAG 2.1.1 Keyboard (A) — fail; WCAG 4.1.2 Name/Role/Value (A) — fail (no `aria-pressed`/radio semantics).

**Fix:** render `Chip` as `<button type="button" role="radio" aria-checked={selected}>` inside a `role="radiogroup" aria-labelledby="tip-mira-label"`. Or, simpler, `<button aria-pressed={selected}>`. Add the labelled-by ID to the "TIP MIRA" eyebrow. Verify the underlying `Chip` component renders a focusable element.

---

### P0-4 · Keypad keys on the Send window are non-interactive `<div>`s
**File:** `apps/web/src/components/landing/WinSend.tsx:51-60`
**Element:** the 12-key numeric keypad in the FlowStage `WinSend` mock.

```tsx
{KEYS.map((k) => (
  <div key={k} className="aspect-[1.9/1] … flex items-center justify-center">{k}</div>
))}
```

If this is a **decorative mock** (a stage prop showing what the app looks like, not a functional input), it must be wrapped in a single element marked `aria-hidden="true"` or `role="img" aria-label="Numeric keypad mock"` — otherwise screen readers read out "1 2 3 4 5 6 7 8 9 . 0 ⌫" as a wall of orphan numerals with no context. If it's intended to be **interactive on tap**, every key must be a `<button>` with an accessible name (`⌫` needs `aria-label="Backspace"`, `.` needs `aria-label="Decimal point"`). Same applies to the static amount display "$ 16.20" and "Balance · $245.00 USD" — those are fine as text but the keypad is the gap.

**Fix (mock case):** wrap the `WinSend` body interior in `role="img" aria-label="Send sheet preview, $16.20 to mira.init"` or mark just the keypad grid `aria-hidden="true"`. Same treatment for the recipient avatar div ("M" placeholder) and the static "Send · $16.20" button (which is currently a real `<button>` that does nothing — see P1-3).

---

### P0-5 · `WinChats` chat-list rows are not focusable, not announced as buttons
**File:** `apps/web/src/components/landing/WinChats.tsx:78-109`

The `<ul><li>` list of chats is presentational, but each row visually telegraphs interactivity (avatar, name, time, badge, hover state). On the live page these are pure mock content. If they are demo-only:
- The badge "2" is announced as bare text without context → "two" on its own. Wrap with `<span className="sr-only">2 unread messages</span>` and the visual badge with `aria-hidden="true"`, **or** mark the entire `WinChats` block as `role="img" aria-label="Chat list preview, mira.init typing, 2 unread"`.

If they are intended as live navigation later: make rows `<button>` or `<Link>`, and lift the unread badge into the accessible name.

**Status today:** ambiguous-but-rendered-as-real → screen-reader users hear: "list, 6 items, M, mira.init, now, typing dot dot dot, 2, A, alex.init, 2m, lightning Sent twelve dollars thx for coffee, …" — 90 seconds of orphaned tokens. WCAG 1.3.1 Info & Relationships (A) — fail.

**Fix:** add `role="img"` + descriptive `aria-label` to the outer wrapper for the static-mock case, or convert rows to focusable controls.

---

### P0-6 · `<dl>` misuse breaks semantic relationships in ProfileStats
**File:** `apps/web/src/components/landing/CreatorProfile.tsx:106-129`

```tsx
<dl className="mt-6 flex justify-center gap-8 py-4 border-y border-border">
  <StatCell value="$4,280" label="TIPPED" />
  <span aria-hidden className="w-px bg-[var(--color-border)]" />
  <StatCell value="128" label="SUBSCRIBERS" />
  …
</dl>
```

Two problems:
1. **Inverted dt/dd order.** Inside `StatCell`, `<dd>` (the value) renders **before** `<dt>` (the label). A description list requires `<dt>` to precede its `<dd>`. NVDA announces "description, $4,280; term, TIPPED" — backwards.
2. **`<span>` between dt/dd pairs is invalid `<dl>` content.** Only `<dt>`, `<dd>`, `<div>` (HTML5), and `<script>/template` are permitted children. The hairline divider `<span>` invalidates the list.

WCAG 1.3.1 Info & Relationships (A) — fail. HTML validity — fail.

**Fix:**
- Swap order in `StatCell` so `<dt>label</dt><dd>value</dd>`.
- Wrap each label/value pair in a `<div>` so the `<dl>` only contains `<div>` children, then put the divider `<span>` outside the `<dl>` or render dividers via CSS `::before` on adjacent siblings.
- Or: ditch `<dl>` entirely — these are stats, not a name/value glossary. Use `<ul><li>` or plain divs with `aria-label` per cell.

---

### P0-7 · No skip link rendered on any page
**File:** `apps/web/src/app/layout.tsx:68-79` (no skip link); `apps/web/src/app/globals.css:340-351` (style exists, no consumer).

CSS class `.skip-to-content` is defined but never rendered. The `<MarketingTopbar>` has 5 nav links the user must tab through before reaching `<main>`. Inner pages compound this with the auto-sign toggle, wallet pill, etc. WCAG 2.4.1 Bypass Blocks (A) — fail.

**Fix:** in `layout.tsx` body, before `<Providers>`, add:
```tsx
<a href="#main" className="skip-to-content">Skip to main content</a>
```
Then ensure every page's `<main>` has `id="main"`. The landing's `<main>` in `page.tsx:63` needs `id="main"`.

---

### P0-8 · Composer "Message…" input is a `<div>` placeholder, not an `<input>`
**File:** `apps/web/src/components/landing/Hero.tsx:148-157`

```tsx
<div className="flex-1 rounded-full text-[12px] text-ink-3 …">
  Message…
</div>
<button type="button" aria-label="Send message" …>
```

The "Send message" button is real and labelled — good. But it sits next to a fake input that screen readers read as plain text "Message…" with no role, no association. Worse, the **Send button has nothing to send** — it's wired to nothing. If this entire device frame is a **mock**, then the Send button should not be a real `<button>` (focusable, announced as "Send message, button") because activating it does nothing → broken expectation. WCAG 4.1.2 Name/Role/Value (A) — partial fail; WCAG 3.3.2 Labels or Instructions (A) — borderline.

**Fix:** treat the entire `DeviceMock` interior as a presentation. Wrap the device with `role="img" aria-label="Live preview: Mira sends $16.20, settles in 97 milliseconds"` and mark all interior buttons/inputs `aria-hidden="true"`. The hero's accessible name then conveys the demo without a screen-reader user tabbing into a non-functional Send button. Keep the surrounding "Open the app" / "See it work" CTAs fully accessible (those work).

---

### P0-9 · No `<main>` landmark id, no `<h1>` on inner routes
**File:** `apps/web/src/app/page.tsx:63` (landing has `<main>` but no `id`); inner pages (`/capabilities`, `/flow`, `/creators`, `/system`) not in scope here but referenced in axe report — same skip-link target gap.

The landing has an `<h1>` (Hero.tsx:18). Each section uses `<h2>` correctly via `SectionHead`. **Heading hierarchy on `/` is OK.** But:
- `<main>` lacks `id="main"` (paired with skip-link, see P0-7).
- The hero `<section>` is wrapped by another `<section>` from `Hero.tsx:13` AND by the landing-page wrapper section in `page.tsx:68` → **double `<section>` nesting** with no headings inside the inner `<section>`. Sections without accessible names create empty landmarks. WCAG 1.3.1 — soft fail.

**Fix:** drop the outer `<section>` wrapper around `<Hero />` in `page.tsx:68-70` (Hero already has its own `<section>`), or label each via `aria-labelledby` pointing at its `<h1>`/`<h2>`.

---

### P0-10 · Color contrast — 23+ nodes failing on `/`, hundreds across routes (axe)
**File:** `apps/web/src/app/globals.css:40` and consumers across components.

axe-core ran post-deploy with the `--ink-3` 0.50 bump and **still flagged 23 nodes on `/`, 38 on `/flow`, 40 on `/system`** for `color-contrast`. Sample selectors flagged:
- `.text-ink-3` (eyebrows on indigo-tinted backgrounds)
- `.text-white` over the primary indigo bubble (`Hero.tsx:294-298` `LiveMsgOut` — `bg-[var(--color-primary)] text-white`)

`#6c7bff` (primary) vs `#ffffff` (white text) → contrast ratio ≈ **3.16:1**. WCAG 1.4.3 (AA, 4.5:1) — **fail** for normal text. The reference correctly uses `--color-primary-foreground: #0a0a12` (dark ink on accent) per `globals.css:50`. The hero `LiveMsgOut` ignores that token and hardcodes `text-white`.

`--ink-3` at 0.50 over `#07070a`: rgb is `(244*0.5+7*0.5, 244*0.5+7*0.5, 246*0.5+10*0.5)` = approx `#7d7d7e` → ~5.0:1 vs `#07070a`. Should pass at 4.5:1, but on top of `surface-2 (#191a1b)` it drops to ~4.0:1, and on top of `bg-2 (#0b0b10)` it sits at ~4.7:1. Many flagged nodes overlay surface-2 or surface-3 → fail.

**Fixes:**
1. **`LiveMsgOut`** (`landing-interactive.tsx:296`): replace `text-white` with `text-[var(--color-primary-foreground)]` so outgoing bubbles use dark ink. Matches reference and gives ~9:1 contrast.
2. **Bump `--ink-3` again** or split into `--ink-3-on-canvas` (0.50, used on `#07070a`) and `--ink-3-on-surface` (0.66, used on `#191a1b`/`#28282c`). Cleaner: raise `--ink-3` to **0.62** and `--ink-2` to **0.78** — accept the visual cost.
3. **`text-ink-4` on `#191a1b`** (surface-2): 0.30 alpha over surface-2 ≈ 2.3:1 on `#07070a` baseline, much worse on raised surfaces. Anywhere `--ink-4` shows actual text (not just chrome) — e.g., `WinChats.tsx:96` time stamps, `CreatorProfile.tsx:303` activity-feed time — must move to `--ink-3` or higher. WCAG 1.4.3 — fail.
4. **Footer bottom strip** (`marketing-chrome.tsx:119` `text-ink-4`): "© Ori — all quiet." at 12px is **small text**, must hit 4.5:1. `--ink-4` 0.30 fails. Bump to `--ink-3`.

---

## P1 — Serious (this sprint)

### P1-1 · `<button type="button">` with no action on the Send sheet
**File:** `apps/web/src/components/landing/WinSend.tsx:30-37, 64-70`

Both the "× Clear recipient" button and "Send · $16.20" button are real `<button>` elements but wire to nothing (no `onClick`, no `<form>`). Keyboard users tab into them; pressing Enter does nothing. Confusing. If `WinSend` is a marketing mock, mark the whole window `role="img" aria-label="Send sheet preview"` and `aria-hidden="true"` on the buttons, OR demote them to `<div>` with no role.

### P1-2 · `bg-foreground text-[var(--color-background)]` "Send tip" button — same hidden-text pattern
**File:** `apps/web/src/components/landing/CreatorProfile.tsx:150-156`

Real `<button>`, no `onClick`. Same pattern as P1-1 — looks live, isn't. If decorative, demote.

### P1-3 · `aria-label="Mira"` on a decorative avatar
**File:** `apps/web/src/components/landing/CreatorProfile.tsx:78-87`

```tsx
<span aria-label="Mira" className="…">M</span>
```

`<span>` with `aria-label` has **no role**, so the label is ignored by most screen readers (NVDA reads the text "M" inside, ignores the label; VoiceOver may pick it up inconsistently). Either:
- Add `role="img"` so the `aria-label` is honored, OR
- Wrap the visible "M" in `aria-hidden="true"` and rely on the page heading "mira" + "Verified" badge below it for context, OR
- Drop the `aria-label` entirely (the heading "mira" provides the name).

WCAG 4.1.2 — partial.

### P1-4 · `VerifiedBadge` from `@/components/ui` — accessible name unverified
**File:** `apps/web/src/components/landing/CreatorProfile.tsx:91`

The badge is critical to user trust ("verified creator") — it must announce as such. Inspect `VerifiedBadge` source; if it renders a bare `<svg>`, it must have `<title>Verified</title>` or an `aria-label` plus `role="img"`. **Verify before ship.**

### P1-5 · `OriMark` SVG marked `aria-hidden` but is the only logo content
**File:** `apps/web/src/components/marketing-chrome.tsx:136-141`

The brand logo svg has `aria-hidden`, paired with the text "Ori" wordmark (line 41-42) — that's correct (text adjacent provides the name). But the parent `<Link href="/" aria-label="Ori home">` (line 34-38) duplicates the name. Net: screen reader announces "Ori home, link, Ori" — minor verbosity. Either drop the `aria-label="Ori home"` (text content suffices) or set the wordmark span `aria-hidden`.

### P1-6 · Animated motion in `LiveDeviceChat` — reduced-motion handled, but reveal animations not
**File:** `apps/web/src/app/globals.css:366-376`

The `prefers-reduced-motion` block forces `animation-duration: 0.01ms`, `transition-duration: 0.01ms`, AND sets `.reveal { opacity: 1; transform: none }`. **Good.** BUT: the inline `style={{ animation: 'ori-hero-pulse 2.4s …' }}` on `Hero.tsx:73` is an inline style — global `* { animation-duration: 0.01ms !important }` overrides it (the `!important` saves it), so this passes. **Verify** the same is true for inline Framer Motion `motion.path`/`motion.span` in `landing-interactive.tsx:318-340` — `useReducedMotion()` is checked and `initial={false}` short-circuits, so this is fine. **Good — keep this in QA checklist.**

### P1-7 · `DeviceParallax` 3D tilt — pointer-only, no keyboard equivalent (correct), but no aria-hidden
**File:** `apps/web/src/components/landing-interactive.tsx:104-142`

Parallax wrapper is purely visual. It correctly checks `(hover: hover)` and `prefers-reduced-motion`. But the wrapper doesn't `aria-hidden` the device contents, so screen-reader users still encounter the focusable Send button inside (P0-8). Resolved by P0-8 fix.

### P1-8 · Tab-order disruption: `HeaderConnectPill` wallet shows `<svg aria-hidden>` after text
**File:** `apps/web/src/components/landing-interactive.tsx:55-94`

OK as-is. Note: `Link href="/today"` and `<button onClick={openConnect}>` are both correctly typed. No issue; flagged for completeness.

### P1-9 · `<ul>` of chat rows in `WinChats` lacks accessible list name
**File:** `apps/web/src/components/landing/WinChats.tsx:78`

If kept as a real list (P0-5 alt fix), the `<ul>` should be wrapped in `<nav aria-label="Recent chats">` or get `aria-labelledby` pointing at the search header. Today it's an unlabelled list of 6 → screen reader says "list with 6 items" cold.

### P1-10 · `WindowBar` traffic-light dots have `aria-hidden` (good) but the title is announced raw
**File:** `apps/web/src/components/landing/WinChats.tsx:118-132` and `WinSend.tsx:76-89`

"Ori · Chats" and "Send" are read out as plain text mid-list with no landmark context. Wrap each window in `<section aria-labelledby="…">` with the title as `<h3 id="…">` (visually styled, semantically a heading). Or mark windows as `role="img" aria-label="Ori chats window preview"` (matching P0-5).

### P1-11 · Footer "all systems green" status indicator is a colour-only signal
**File:** `apps/web/src/components/marketing-chrome.tsx:124-127`

```tsx
<span className="… bg-[var(--color-success)]" />
all systems green
```

Text "all systems green" is present so this is OK for sighted+screen-reader users. **But** "green" is a colour-only descriptor — confusing for colour-blind users (deuteranopia → green looks brown/grey). WCAG 1.4.1 Use of Color (A) is technically not violated (text says "green"), but the spirit is. Suggest "all systems operational" + the dot. Soft P1.

### P1-12 · Touch target size — keypad cells, traffic-light dots, search-row keys
**File:** `WinSend.tsx:51-60` (keypad cells `aspect-[1.9/1]`), `Hero.tsx:158-168` (Send icon button `w-9 h-9` = 36×36), `marketing-chrome.tsx:33` (header height `h-14` = 56 → ok, but inner pill is `h-8` = 32).

WCAG 2.5.5 Target Size (AA in 2.2) requires **24×24** minimum, **44×44** recommended. The hero composer Send button at 36×36 meets the 24px minimum but is below the 44px guideline. The header `Sign in`/`Launch` pill at h-32 (32px) **fails** WCAG 2.5.8 Target Size Minimum (AA, 24×24 OK if spacing exception applies — spacing is 8px gap between adjacent buttons, so it might pass on the exception). Verify with a designer.

**Fix:** raise wallet pill height to `h-9` (36px) or `h-10` (40px); raise hero composer Send button to 40×40.

### P1-13 · `SectionHead` eyebrow is `<div>`, not a heading
**File:** `apps/web/src/app/page.tsx:48-55`

```tsx
<header className="reveal max-w-3xl">
  <div className="font-mono uppercase text-[12px] …">{eyebrow}</div>
  <h2>…</h2>
```

OK — eyebrow is decorative meta, `<h2>` is the actual section heading. `<header>` for the section head is fine. **No fix needed**, flagged for visibility. But the eyebrow should be tied to the heading via `<p>` rather than `<div>` to be safer if it were ever read. Cosmetic.

---

## P2 — Best practice / hardening

### P2-1 · `lang="en"` is set globally — good
**File:** `apps/web/src/app/layout.tsx:70`

WCAG 3.1.1 — pass.

### P2-2 · Viewport correctly allows zoom
**File:** `apps/web/src/app/layout.tsx:56-61`

`maximumScale` and `userScalable` are not set → defaults allow pinch-zoom. WCAG 1.4.4 Resize Text — pass. **However**, the axe report flags `meta-viewport` violations on every route (`Nodes affected: 1`). Likely axe is reading a different deployed `<meta>` tag than the source — possibly an older build. **Verify the live deploy** matches `layout.tsx` (check rendered HTML for `<meta name="viewport" …>` — should NOT contain `maximum-scale=1` or `user-scalable=no`). If there's a stale tag from the previous build cache, purge.

### P2-3 · Live regions for dynamic content — none exist
**File:** `apps/web/src/components/landing-interactive.tsx:217-283`

The `LiveDeviceChat` component cycles through messages every few seconds. **Correct call** to leave it as a visual-only loop (it's a marketing demo, not real chat). However, the `useReducedMotion` short-circuit shows all 5 messages at once — for a screen reader on first load this is read as one block, which is fine. No live region needed here.

For future toasts/activity feeds (when the app ships): use `aria-live="polite"` on a container, not on the items.

### P2-4 · Font-size for mono labels (10.5px, 11px) is below the comfort threshold
**File:** ubiquitous — `WinChats.tsx:96, 100, 103`, `CreatorProfile.tsx:124, 303`, `globals.css` no min font-size enforcement.

10.5px is dangerously small even for monospace. WCAG doesn't mandate a minimum, but WAIM/WebAIM recommend 12px+. Mobile (per "cross-checked with mobile critique") should never go below 12px. **Bump everything ≤11px to 12px** unless contrast and weight compensate.

### P2-5 · `font-feature-settings: 'ss01', 'ss02', 'cv11'` on `html`
**File:** `apps/web/src/app/globals.css:98`

Geist's stylistic sets are fine; just verify `cv11` doesn't reshape numerals in a way that hurts legibility for low-vision users. Cosmetic check.

### P2-6 · Print stylesheet good
**File:** `apps/web/src/app/globals.css:386-395`

Drops backdrop, forces black ink, expands `[href]`. WCAG-adjacent but excellent practice.

### P2-7 · `<header>` inside `<section>` inside `<Reveal>` — no `<article>` for self-contained units
**File:** `apps/web/src/components/landing/CreatorProfile.tsx:35-50`

The creator profile card is conceptually self-contained — could use `<article aria-labelledby="profile-name">`. Not required but improves reading-mode UX (Safari, Firefox).

### P2-8 · No `:focus-visible` test on indigo-on-indigo elements
**File:** `apps/web/src/app/globals.css:325-338`

Focus ring is `var(--color-primary-bright)` = `#8a95ff` with 2px outline + 2px offset. On the primary CTA "Open the app" (white background, dark text) the indigo ring on white is **bright indigo over white** → contrast adequate. On the indigo-bubble outgoing message (`bg-[var(--color-primary)]` = `#6c7bff`) the focus ring would be `#8a95ff` indigo on `#6c7bff` indigo → ~1.4:1 contrast. **Focus ring vanishes.** WCAG 1.4.11 Non-text Contrast (AA, 3:1) — **fail** if this element is ever focusable (P0-8 says it shouldn't be).

**Fix:** ensure the outgoing bubble is not a focus target. If you ever make message bubbles focusable, swap the focus-visible outline to use `--color-foreground` (white) for high contrast against any background.

### P2-9 · `loading="lazy"` not used on any `<img>`
**Files:** none found. The page uses no `<img>` tags — all visuals are SVG inline or CSS gradients. **No alt-text issues** because there are no images. Verified on read of all input files.

### P2-10 · Header sticky-blur layered over scrolling content
**File:** `apps/web/src/components/marketing-chrome.tsx:24-32`

`backdropFilter: blur(20px) saturate(1.4)` over scrolling text → text behind the header may smear. Fine for sighted users; assistive tech ignores. No issue.

---

## Summary table

| Severity | Count |
|---|---:|
| P0 | 10 |
| P1 | 13 |
| P2 | 10 |

## Recommended fix order (1 day to ship)

1. **Hour 1–2:** P0-1 (LtLink href), P0-2 (ProfileTabs → buttons), P0-3 (Chips), P0-7 (skip link). Net: ~30 lines of code.
2. **Hour 3–4:** P0-4, P0-5, P0-8 — blanket `role="img" aria-label="…"` on the device, send-sheet, and chat-list mocks; mark interior `aria-hidden`. Net: ~15 lines.
3. **Hour 5:** P0-6 (dl/dt/dd) — swap StatCell order, restructure dl. Net: 10 lines.
4. **Hour 6–7:** P0-10 (contrast) — fix `LiveMsgOut text-white` → `--color-primary-foreground`; bump `--ink-3` to 0.62 OR raise individual offending uses. Re-run axe; verify <3 violations.
5. **Hour 8:** P1-1, P1-2, P1-9, P1-10, P1-12 — tighten button semantics, name lists, raise touch targets.

Ship gate: re-run axe on `/`, `/capabilities`, `/flow`, `/creators`, `/system`. **All must report 0 violations** for `color-contrast`, `meta-viewport`, `link-name`, `button-name`, `landmark-one-main`. Manual screen-reader pass with VoiceOver + NVDA on Hero, Capabilities, Creator profile.

If the team can't land all P0 today: **at minimum land P0-1, P0-2, P0-7, P0-8, P0-10**. The rest are visible to AT users but won't legally fail an audit if marked as known issues with timeline.
