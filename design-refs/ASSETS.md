# Ori — Asset Inventory

Source of truth: `C:\Users\ritik\MINITIA\design-refs\source\Ori-landing.html` (1783 lines).
Secondary: `C:\Users\ritik\MINITIA\design-refs\source\Ori_-_standalone.html`.

---

## 1. Fonts

### Families & weights

| Family            | Weights                  | Style       | Used for                                       |
| ----------------- | ------------------------ | ----------- | ---------------------------------------------- |
| Geist             | 300, 400, 500, 600, 700  | normal      | Body, UI, headings (sans baseline)             |
| Geist Mono        | 400, 500                 | normal      | Eyebrows, paths, addresses, amounts, terminal  |
| Instrument Serif  | 400                      | italic only | Display drop-letters, accent words inside H1/H2 |

### Exact Google Fonts URL (verbatim from `<link>` line 9)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Preconnect order (must preserve)

1. `https://fonts.googleapis.com` (no crossorigin)
2. `https://fonts.gstatic.com` (with `crossorigin`)
3. The `css2` stylesheet `<link>` itself

In a Next.js / Vite app: keep the same two preconnects in `<head>` (or use `next/font` which handles preconnects internally).

### `font-feature-settings`

| Selector                  | Source line | Setting                                 |
| ------------------------- | ----------- | --------------------------------------- |
| `body`                    | 59          | `"ss01", "ss02", "cv11"`                |
| `.mono`                   | 108         | `"ss02", "zero"`                        |
| Tabular numerics (`.tnum`)| 115         | `font-variant-numeric: tabular-nums`    |
| Specific mono blocks      | 367, 420, 537, 806, 919 | `font-variant-numeric: tabular-nums` for amount displays |

> Note: spec-required mono `cv11` was not present in the source — source uses `ss02 + zero` for mono. Match the source. Ship as the body uses `ss01/ss02/cv11`, mono uses `ss02/zero` (with `tnum` opt-in via `.tnum`).

### Recommended global CSS bootstrapping in target app

```css
:root {
  --sans:  "Geist", ui-sans-serif, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --serif: "Instrument Serif", ui-serif, Georgia, serif;
  --mono:  "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
body {
  font-family: var(--sans);
  font-feature-settings: "ss01", "ss02", "cv11";
}
.mono  { font-family: var(--mono); font-feature-settings: "ss02", "zero"; }
.serif { font-family: var(--serif); font-style: italic; font-weight: 400; }
.tnum  { font-variant-numeric: tabular-nums; }
```

---

## 2. Inline SVG icons

Every `<svg>` literal lifted from `Ori-landing.html`. All use `currentColor` where possible so a single `color` prop styles them.

### 2.1 Brand mark (`OriMark`)

- Context: topbar brand link, footer brand link
- Source lines: 1074–1077, 1698
- Suggested component: `OriMark`
- Suggested destination: `src/components/icons/OriMark.tsx`

```html
<svg viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="1.25"/>
  <circle cx="12" cy="12" r="5" fill="currentColor"/>
</svg>
```

Props:
```ts
interface OriMarkProps { size?: number; className?: string; /* color via currentColor */ }
```

### 2.2 Nav CTA arrow / Send button arrow / Send-CTA arrow (`ArrowIcon`)

Same shape used 4× — line 1088 (nav cta), 1115 (hero primary), 1457 (thread input chevron up — see 2.7), 1489 (send-cta in win-send).

- Context: pill CTAs, "Open the app", "Launch", "Send · $16.20"
- Source lines: 1088, 1115, 1489
- Suggested component: `ArrowIcon` (right-pointing)
- Suggested destination: `src/components/icons/ArrowIcon.tsx`

```html
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Props:
```ts
interface ArrowIconProps { size?: number; className?: string; direction?: "right" | "up" | "down" | "left"; }
```
(implementation: rotate via CSS transform on direction)

### 2.3 Three-dot menu / "more" (`MoreDots`)

- Context: chat-header right action (typing indicator row in device)
- Source lines: 1130–1132
- Suggested component: `MoreDots`

```html
<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ink-3)">
  <circle cx="3" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/>
</svg>
```

Note: source draws as 1px stroked circles, not filled — they read as small open dots. If a filled version is desired, set `fill="currentColor" stroke="none"`.

### 2.4 OK check (inside payment-card "Landed" pill) (`CheckIcon`)

- Context: pay-card success badge, also reused by chat thread pay-card
- Source lines: 1141, 1445
- Suggested component: `CheckIcon`

```html
<svg viewBox="0 0 16 16" fill="none" stroke="#07070a" stroke-width="2.5">
  <path d="M4 8l2.5 2.5L12 5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Stroke color is hard-coded `#07070a` (background ink) because it sits inside a green chip — pass stroke as a prop in the React port.

```ts
interface CheckIconProps { size?: number; className?: string; strokeColor?: string; strokeWidth?: number; }
```

### 2.5 Send / Up-chevron arrow (chat composer) (`SendArrowIcon`)

- Context: chat-input send button (device hero), thread input box trailing icon
- Source lines: 1150, 1457
- Suggested component: `SendArrowIcon`

```html
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M8 12V4M4 8l4-4 4 4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

### 2.6 Search (`SearchIcon`)

- Context: chats-list search input (Flow, "Search names…")
- Source line: 1369
- Suggested component: `SearchIcon`

```html
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <circle cx="7" cy="7" r="4.5"/>
  <path d="M14 14l-3.5-3.5" stroke-linecap="round"/>
</svg>
```

### 2.7 Envelope / Mail (`MailIcon`)

- Context: thread head action button (left of pinned/group icon)
- Source line: 1434
- Suggested component: `MailIcon`

```html
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M2 5l6 4 6-4M2 5v6h12V5" stroke-linejoin="round"/>
</svg>
```

### 2.8 Group / Multi-person (`GroupIcon`)

- Context: thread head right action (split / share-with-many)
- Source line: 1435
- Suggested component: `GroupIcon`

```html
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <circle cx="8" cy="4" r="2"/>
  <circle cx="4" cy="12" r="2"/>
  <circle cx="12" cy="12" r="2"/>
  <path d="M8 6v2M6.2 11l-.4-1M9.8 11l.4-1"/>
</svg>
```

### 2.9 Verified badge (`VerifiedBadge`)

- Context: profile name on creator page (next to "mira")
- Source lines: 1523–1526
- Dimensions: 22 × 22
- Suggested component: `VerifiedBadge`
- Suggested destination: `src/components/icons/VerifiedBadge.tsx`

```html
<svg width="22" height="22" viewBox="0 0 22 22" fill="none" style="flex-shrink:0;">
  <path d="M11 1.5L13.4 3.6L16.5 3.2L17.8 6.1L20.5 7.5L19.8 10.5L21 13.3L18.7 15.4L18.4 18.5L15.4 19L13.3 21L10.5 19.9L7.5 20.5L6 17.8L3.2 16.5L3.6 13.4L1.5 11L3.6 8.6L3.2 5.5L6 4.2L7.5 1.5L10.5 2.1Z" fill="var(--accent)"/>
  <path d="M7.5 11L10 13.5L14.5 8.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
```

Props:
```ts
interface VerifiedBadgeProps { size?: number; className?: string; fillColor?: string; checkColor?: string; }
```

### 2.10 Close / "X"

- Context: win-send recipient row close button
- Source line: 1474
- Note: source uses literal U+00D7 `×` text glyph, NOT an SVG. Render as a styled span. If swapping to an icon, suggest `CloseIcon` with two crossed paths in `viewBox="0 0 16 16"` — but the brand reads cleaner with the multiplication-sign character at `font-size: 14px; color: var(--ink-3);`.

Optional swap-in markup if SVG is desired:
```html
<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round"/>
</svg>
```

### 2.11 Add (`+`) / Dollar — chat composer leading icon

Source uses literal `$` glyph in a circle (`.dollar` class, line 1454) — not an SVG. Render as styled span: `font-family: var(--mono); font-size: 14px;` inside a 34 × 34 round border button. No icon component required.

### 2.12 GitHub link (footer)

- Source line: 1722 — text link only, NO icon SVG present in source.
- Recommendation: add a `GithubIcon` 16 × 16 stroke-1.5 mark in target rebuild (Lucide `Github` or this minimal):

```html
<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
  <path d="M8 .2a8 8 0 0 0-2.5 15.6c.4.1.5-.2.5-.4v-1.4c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.5 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3-1.8 3.7-3.6 3.9.3.2.6.7.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 .2z"/>
</svg>
```

### 2.13 Eyebrow / chevron / pulse — none more

Source has no other inline SVGs beyond those listed (Brand mark × 2, ArrowIcon × 3, MoreDots, CheckIcon × 2, SendArrowIcon × 2, SearchIcon, MailIcon, GroupIcon, VerifiedBadge, NetworkSVG — see §6).

### Suggested icons module index

```
src/components/icons/
  OriMark.tsx
  ArrowIcon.tsx
  SendArrowIcon.tsx
  SearchIcon.tsx
  MailIcon.tsx
  GroupIcon.tsx
  MoreDots.tsx
  CheckIcon.tsx
  VerifiedBadge.tsx
  NetworkSVG.tsx
  GithubIcon.tsx        // new — not in source
  CloseIcon.tsx         // new — source uses × glyph
  index.ts              // barrel
```

---

## 3. Avatar gradients

All gradients are `linear-gradient(135deg, …)`. Mapping is by first-letter / display character.

| Display char | Display name      | Gradient (literal CSS expression)                                  | Mood       | Source lines |
| ------------ | ----------------- | ------------------------------------------------------------------ | ---------- | ------------ |
| M            | mira (.init)      | `linear-gradient(135deg, #ff9ec7, #ff6b9d)`                        | pink       | 1125, 1376, 1428, 1469, 1519 |
| A            | alex (.init)      | `linear-gradient(135deg, #78cfc1, #3aa693)`                        | teal       | 1384, 1575   |
| J            | jamie (.init)     | `linear-gradient(135deg, #ffb561, #ff8f3a)`                        | orange     | 1391, 1587   |
| S            | sam (.init)       | `linear-gradient(135deg, #a89bff, #7b6bff)`                        | indigo     | 1398, 1581   |
| L            | lina (.init)      | `linear-gradient(135deg, #8adfff, #4ab0e0)`                        | cyan       | 1412, 1593   |
| ·            | studio (group of 3) | `linear-gradient(135deg, #e4e4e8, #9b9ba0)`                       | grey       | 1405         |
| ·            | agent.claude      | `linear-gradient(135deg, #9ee8c5, #4dc493)`                        | mint-green | 1599         |

### Derived palette — six brand-friendly avatar gradients

```ts
export const avatarGradients = {
  pink:   "linear-gradient(135deg, #ff9ec7, #ff6b9d)",
  teal:   "linear-gradient(135deg, #78cfc1, #3aa693)",
  orange: "linear-gradient(135deg, #ffb561, #ff8f3a)",
  indigo: "linear-gradient(135deg, #a89bff, #7b6bff)",
  cyan:   "linear-gradient(135deg, #8adfff, #4ab0e0)",
  mint:   "linear-gradient(135deg, #9ee8c5, #4dc493)",
  grey:   "linear-gradient(135deg, #e4e4e8, #9b9ba0)", // for groups / system
} as const;
```

### Deterministic name → gradient hash

```ts
const palette = ["pink","teal","orange","indigo","cyan","mint"] as const;

export function gradientFor(name: string): string {
  if (!name || name === "·" || name.startsWith("studio")) return avatarGradients.grey;
  if (name.startsWith("agent.")) return avatarGradients.mint;
  let h = 0;
  for (const ch of name.toLowerCase()) {
    h = (h * 31 + ch.charCodeAt(0)) | 0;
  }
  const key = palette[Math.abs(h) % palette.length];
  return avatarGradients[key];
}
```

This preserves the canonical mapping for known names (mira → pink, etc.) by character sum (mira → 'm' bucket lands on pink, alex → teal, jamie → orange, sam → indigo, lina → cyan) — verify with unit test before shipping; if not, hard-code overrides for the demo-roster six names and let the hash handle the long tail.

Suggested overrides table for canonical names:

```ts
const canonical: Record<string, keyof typeof avatarGradients> = {
  mira: "pink", alex: "teal", jamie: "orange",
  sam:  "indigo", lina: "cyan",
};
```

---

## 4. Cover gradient (creator profile)

Indigo → transparent profile cover band. Source line 838–845 (`.profile-cover`).

```css
height: 140px;
background:
  radial-gradient(ellipse 600px 200px at 30% 100%, rgba(108,123,255,0.35), transparent 60%),
  radial-gradient(ellipse 400px 300px at 80% 0%, rgba(154,165,255,0.2), transparent 60%),
  var(--bg-2);
border-bottom: 1px solid var(--line);
```

`var(--bg-2)` = `#0b0b10`.

Destination: `src/components/profile/ProfileCover.tsx` — render as a 140px-tall div with this exact `background` style.

---

## 5. Backdrop layers

Two pseudo-element layers fixed at the body root (lines 73–100). Both `pointer-events: none; z-index: 0;`.

### `body::before` — ambient indigo pools

```css
background:
  radial-gradient(ellipse 1200px 600px at 50% -10%, rgba(108, 123, 255, 0.14), transparent 60%),
  radial-gradient(ellipse 900px 700px at 90% 40%, rgba(108, 123, 255, 0.06), transparent 60%),
  radial-gradient(ellipse 700px 500px at 10% 80%, rgba(255, 255, 255, 0.03), transparent 60%);
```

### `body::after` — star-dot field

```css
background-image:
  radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 0.5px, transparent 1px),
  radial-gradient(circle at 75% 15%, rgba(255,255,255,0.4) 0.5px, transparent 1px),
  radial-gradient(circle at 45% 70%, rgba(255,255,255,0.35) 0.5px, transparent 1px),
  radial-gradient(circle at 85% 85%, rgba(255,255,255,0.5) 0.5px, transparent 1px),
  radial-gradient(circle at 10% 55%, rgba(255,255,255,0.3) 0.5px, transparent 1px),
  radial-gradient(circle at 60% 40%, rgba(255,255,255,0.35) 0.5px, transparent 1px);
background-size: 1400px 900px;
opacity: 0.7;
```

Destination: ship as a Tailwind `before:` / `after:` rule in the global stylesheet, OR a `<Backdrop />` component that lays two absolutely-positioned divs below content (`z-index: 0`) and wraps the page.

---

## 6. Network SVG (capability tile)

The identity-graph visualization — center node + 6 satellites + radial-gradient `id="nodeglow"`. Source lines 1233–1271.

```html
<svg viewBox="0 0 320 240">
  <defs>
    <radialGradient id="nodeglow">
      <stop offset="0%" stop-color="#6c7bff" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#6c7bff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- lines -->
  <g stroke="rgba(255,255,255,0.1)" stroke-width="0.8" fill="none">
    <line x1="160" y1="120" x2="60" y2="60"/>
    <line x1="160" y1="120" x2="270" y2="50"/>
    <line x1="160" y1="120" x2="260" y2="180"/>
    <line x1="160" y1="120" x2="50" y2="180"/>
    <line x1="160" y1="120" x2="160" y2="30"/>
    <line x1="160" y1="120" x2="160" y2="210"/>
  </g>
  <!-- glow on center -->
  <circle cx="160" cy="120" r="50" fill="url(#nodeglow)"/>
  <!-- nodes -->
  <g>
    <circle cx="160" cy="120" r="24" fill="#6c7bff"/>
    <text x="160" y="125" text-anchor="middle" fill="#0a0a12" font-family="Geist Mono" font-size="10" font-weight="600">you.init</text>
  </g>
  <g fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)">
    <circle cx="60" cy="60" r="14"/>
    <circle cx="270" cy="50" r="14"/>
    <circle cx="260" cy="180" r="14"/>
    <circle cx="50" cy="180" r="14"/>
    <circle cx="160" cy="30" r="10"/>
    <circle cx="160" cy="210" r="10"/>
  </g>
  <g fill="rgba(244,244,246,0.7)" font-family="Geist Mono" font-size="8.5" text-anchor="middle">
    <text x="60" y="63">mira</text>
    <text x="270" y="53">alex</text>
    <text x="260" y="183">jamie</text>
    <text x="50" y="183">sam</text>
  </g>
</svg>
```

### Spec note for React port

- The spec says "radial gradient `id=\"pulse\"`" — source uses `id="nodeglow"`. Either rename the gradient to `pulse` to match spec, or update the spec. Recommend keeping `nodeglow` (descriptive) and noting in PR.
- Source has only 4 labeled satellites (mira, alex, jamie, sam) and 2 unlabeled smaller satellites at top/bottom. Spec said "6 satellites" — accurate.
- Wrap in `<NetworkSVG />` and accept `nodes` prop for future-proofing:

```ts
interface NetworkSVGProps {
  nodes?: Array<{ name: string; x: number; y: number; r?: number }>;
  centerLabel?: string;       // default "you.init"
  className?: string;
}
```

Destination: `src/components/icons/NetworkSVG.tsx`.

---

## 7. Verified badge SVG

Already inlined in §2.9. Dimensions: **22 × 22** (`width="22" height="22" viewBox="0 0 22 22"`). Two paths:

1. 16-point gear/star outline filled with `var(--accent)` (`#6c7bff`).
2. White check on top, stroke-width 2, round caps + joins, no fill.

Destination: `src/components/icons/VerifiedBadge.tsx`.

---

## 8. Brand mark SVG

Already inlined in §2.1. Dimensions: **24 × 24** (`viewBox="0 0 24 24"`). Concentric circles:

- Outer: `r=11`, `stroke-width=1.25`, `currentColor` stroke, no fill — the orbit ring.
- Inner: `r=5`, `currentColor` fill — the dot.

Destination: `src/components/icons/OriMark.tsx`. Default size 24, scale via `width/height` props.

---

## 9. Raster images

**None.** Verified via `Grep` for `<img`, `background-image:.*url(`, `<picture`, `<source` — zero matches in `Ori-landing.html`.

The reference site is fully vector / CSS-rendered. The only "images" are:

- Avatar circles (CSS gradient + letter glyph, no PNG)
- Device mock (CSS-shaped phone frame, no PNG)
- Network tile (inline SVG)
- Stars (CSS radial gradients)

Confirmation: **rebuild can ship with zero raster assets in `public/images/`.** Only required PNG/ICO is the favicon family.

### Recommended favicon set (new — not in source)

| File                            | Size      | Purpose                |
| ------------------------------- | --------- | ---------------------- |
| `public/favicon.ico`            | 32×32     | Legacy browser tab     |
| `public/favicon-16.png`         | 16×16     | Modern tab             |
| `public/favicon-32.png`         | 32×32     | Modern tab             |
| `public/apple-touch-icon.png`   | 180×180   | iOS home screen        |
| `public/icon-192.png`           | 192×192   | PWA / Android          |
| `public/icon-512.png`           | 512×512   | PWA / Android          |
| `public/og-image.png`           | 1200×630  | OpenGraph share        |

Generate all of them from `OriMark` (24×24 viewBox) on a `#07070a` square; export at the seven sizes via a small `scripts/generate-favicons.ts`. Brand mark in **white** (`fill: #f4f4f6`) for tab visibility on light/dark agnostic backgrounds.

---

## 10. Suggested file layout in target app

```
public/
  favicon.ico                       # generated from OriMark
  favicon-16.png                    # 16×16, mark in --ink on --bg
  favicon-32.png                    # 32×32
  apple-touch-icon.png              # 180×180
  icon-192.png                      # PWA
  icon-512.png                      # PWA
  og-image.png                      # 1200×630, "Messages that move money."
  robots.txt
  manifest.webmanifest

src/
  app/                              # or pages/, depending on framework
    layout.tsx                      # mounts <Backdrop />, font preconnects, font CSS variables
    globals.css                     # CSS vars from §1, body::before/::after from §5
  components/
    icons/
      OriMark.tsx                   # §2.1 — brand, 24×24
      ArrowIcon.tsx                 # §2.2 — right chevron, 16×16, rotatable
      SendArrowIcon.tsx             # §2.5 — up chevron, 16×16
      SearchIcon.tsx                # §2.6 — magnifier, 16×16
      MailIcon.tsx                  # §2.7 — envelope, 16×16
      GroupIcon.tsx                 # §2.8 — three-dot person cluster, 16×16
      MoreDots.tsx                  # §2.3 — horizontal dots, 16×16
      CheckIcon.tsx                 # §2.4 — checkmark for green pill, 16×16
      VerifiedBadge.tsx             # §2.9 — accent star + check, 22×22
      NetworkSVG.tsx                # §6   — identity graph, 320×240
      GithubIcon.tsx                # NEW   — footer link, 16×16
      CloseIcon.tsx                 # OPTIONAL — replace × glyph, 16×16
      index.ts                      # barrel export
    ui/
      Avatar.tsx                    # §3 — gradientFor(name) + letter, sizes sm/md/lg/xl, ring variant
      Backdrop.tsx                  # §5 — body::before/::after equivalent (or just CSS in globals.css)
      Button.tsx                    # btn, btn-primary, btn-ghost — shared CTA pill
      Eyebrow.tsx                   # mono uppercase 11px, ink-3
      ProfileCover.tsx              # §4 — 140px indigo→transparent band
    layout/
      TopBar.tsx                    # sticky blurred top bar with brand + nav + CTA
      Footer.tsx                    # 4-col grid + foot-bottom row
    sections/
      HeroSection.tsx               # tag + h1 + sub + CTAs + Device + StatsRibbon
      Device.tsx                    # phone frame with notch + ChatHeader + ChatBody + ChatInput
      StatsRibbon.tsx               # 4-up grid with mono numerals
      CapabilitiesSection.tsx       # 2 big panels + 3-up row, OS-window chrome
      Panel.tsx                     # generic OS-window panel with .panel-chrome top
      KeypadViz.tsx                 # 3×4 mono keypad + amount row
      GiftViz.tsx                   # gift-preview gradient card
      AgentTermViz.tsx              # mono terminal with prompt/dim/ok lines
      StreamViz.tsx                 # stream-bar + per-second / elapsed / total
      FlowSection.tsx               # 3 OS-window mocks side-by-side
      ChatsListWindow.tsx           # win-chats + 6 chat-items + search row
      ThreadWindow.tsx              # win-thread with msg in/out + pay-card
      SendWindow.tsx                # win-send with amt-big + keypad + send-cta
      CreatorProfileSection.tsx     # ProfileCover + avatar xl + verified + tip-bar + lt-links + feed
      PhilosophySection.tsx         # 3-cell border-shared grid
      DesignSystemSection.tsx       # type / color / radii / motion ds-cards
  styles/
    tokens.css                      # color/space/radii/motion CSS vars (mirror :root in source)
  lib/
    avatar.ts                       # gradientFor(name) + canonical overrides (§3)
```

### One-line "what to ship" per asset

- **Fonts (§1)** — Add the verbatim `<link>` triple to `<head>`; declare `--sans/--serif/--mono` and feature settings in `tokens.css`.
- **OriMark (§2.1, §8)** — 24×24 component, two concentric circles, currentColor.
- **ArrowIcon (§2.2)** — 16×16 right-chevron component with optional `direction` prop (rotates).
- **MoreDots (§2.3)** — 16×16 component, three small open circles in a row.
- **CheckIcon (§2.4)** — 16×16 component for inside green dot, accepts `strokeColor` prop.
- **SendArrowIcon (§2.5)** — 16×16 component, up-chevron for chat composers.
- **SearchIcon (§2.6)** — 16×16 magnifier for search inputs.
- **MailIcon (§2.7)** — 16×16 envelope for thread head action.
- **GroupIcon (§2.8)** — 16×16 person-cluster for thread head action.
- **VerifiedBadge (§2.9, §7)** — 22×22 starburst+check for creator name, accent + white.
- **NetworkSVG (§6)** — 320×240 identity-graph component with `nodeglow` radial gradient + 6 satellites.
- **GithubIcon (§2.12)** — 16×16, NEW (not in source) — for footer "GitHub" link.
- **Avatar gradients (§3)** — 7 named gradients in a constants module + `gradientFor(name)` helper.
- **ProfileCover (§4)** — 140px tall div with the literal indigo radial-gradient stack.
- **Backdrop (§5)** — Two CSS pseudo-elements on body, fixed, `z-index: 0`, exact gradient strings.
- **Favicons (§10)** — Generate seven raster files from OriMark on `#07070a` background.
