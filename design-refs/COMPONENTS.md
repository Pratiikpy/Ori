# Ori Components Catalog

Source: `Ori-landing.html` (1783 lines). Token reference at the bottom.

---

## Brand

**Purpose**: Logo + wordmark used in topbar and footer.

**Source lines**: 1072–1080 (topbar), 1696–1701 (footer); CSS 139–145.

**HTML structure** (cleaned, ready to port):
```html
<a href="#top" class="brand">
  <span class="brand-mark">
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="1.25"/>
      <circle cx="12" cy="12" r="5" fill="currentColor"/>
    </svg>
  </span>
  <span class="brand-name"><span class="serif">O</span>ri</span>
</a>
```

**Key CSS rules**:
```css
.brand { display: flex; align-items: center; gap: 10px; letter-spacing: -0.02em; font-weight: 500; }
.brand-mark { width: 24px; height: 24px; position: relative; display: inline-block; }
.brand-mark svg { width: 100%; height: 100%; display: block; }
.brand-name { font-size: 17px; }
.brand-name .serif { font-size: 19px; }
```

**Tokens used**: `--serif` (via `.serif` class).

**Interactions / animations**: none on `.brand` itself.

**Variants**: same markup reused in topbar and footer. Footer instance gets inline `style="margin-bottom: 16px;"`.

**Notes**: The "O" of "Ori" is wrapped in `<span class="serif">` so it renders Instrument Serif italic while "ri" stays Geist. The mark SVG uses `currentColor` so it inherits ink color.

---

## Topbar

**Purpose**: Sticky header with brand + nav + CTA.

**Source lines**: 1070–1092; CSS 127–166.

**HTML structure**:
```html
<header class="topbar">
  <div class="shell topbar-inner">
    <!-- Brand component here -->
    <nav class="nav">
      <a href="#capabilities" class="nav-link">Capabilities</a>
      <a href="#flow" class="nav-link">Flow</a>
      <a href="#profile" class="nav-link">Creators</a>
      <a href="#system" class="nav-link">System</a>
      <!-- NavCTA component here -->
    </nav>
  </div>
</header>
```

**Key CSS rules**:
```css
.topbar {
  position: sticky; top: 0;
  z-index: 50;
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  background: linear-gradient(180deg, rgba(7,7,10,0.86) 0%, rgba(7,7,10,0.6) 100%);
  border-bottom: 1px solid var(--line);
}
.topbar-inner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 0;
}
.nav {
  display: flex; gap: 28px; align-items: center;
  font-size: 13.5px; color: var(--ink-2);
}
.nav a { transition: color 0.2s var(--ease); }
.nav a:hover { color: var(--ink); }

@media (max-width: 720px) {
  .nav .nav-link { display: none; }
}
```

**Tokens used**: `--line`, `--ink`, `--ink-2`, `--ease`. Uses raw `rgba(7,7,10,...)` for gradient (matches `--bg`).

**Interactions / animations**: backdrop-filter blur + saturate on scroll-behind content. Nav link color transitions on hover.

**Variants**: At ≤720px, all `.nav-link` anchors hide — only Brand and `.nav-cta` remain.

**Notes**: `.shell` provides centered `max-width: 1320px` with horizontal padding `clamp(16px, 3vw, 32px)`. Nav anchors share `.nav-link` class for the responsive hide.

---

## NavCTA

**Purpose**: Pill-shaped "Launch" button in topbar with arrow that nudges right on hover.

**Source lines**: 1086–1089; CSS 153–162.

**HTML structure**:
```html
<a href="#flow" class="nav-cta">
  Launch
  <svg class="arrow ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</a>
```

**Key CSS rules**:
```css
.nav-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 999px;
  border: 1px solid var(--line-3);
  font-size: 13px; color: var(--ink);
  transition: all 0.2s var(--ease);
}
.nav-cta:hover { background: var(--surface-2); border-color: var(--line-3); }
.nav-cta .arrow { transition: transform 0.25s var(--ease); }
.nav-cta:hover .arrow { transform: translateX(2px); }
.ic { width: 16px; height: 16px; flex-shrink: 0; }
```

**Tokens used**: `--line-3`, `--ink`, `--surface-2`, `--ease`.

**Interactions / animations**: Hover swaps to `--surface-2` background; arrow nudges +2px right.

**Variants**: none.

**Notes**: Border color stays `--line-3` on hover (no visual border change), only background fills in. Arrow SVG re-used in HeroTitle CTA and WinSend CTA.

---

## HeroTag

**Purpose**: "Now on Initia · v0.1" status pill above the hero title with pulsing green dot.

**Source lines**: 1100–1103; CSS 174–192.

**HTML structure**:
```html
<span class="hero-tag">
  <span class="dot"></span>
  <span class="mono">Now on Initia · v0.1</span>
</span>
```

**Key CSS rules**:
```css
.hero-tag {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 6px 14px 6px 8px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 999px;
  font-size: 12px; color: var(--ink-2);
  margin-bottom: 40px;
}
.hero-tag .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 0 4px rgba(107, 208, 163, 0.15);
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(107, 208, 163, 0.15); }
  50% { box-shadow: 0 0 0 8px rgba(107, 208, 163, 0.06); }
}
```

**Tokens used**: `--surface`, `--line-2`, `--ink-2`, `--ok`. `rgba(107,208,163,...)` is `--ok` literal.

**Interactions / animations**: `pulse` keyframe — dot's box-shadow halo grows from 4px (15% alpha) to 8px (6% alpha), 2.4s ease-in-out infinite.

**Variants**: none here, but the `.dot` pulse pattern recurs in footer (`<span style="color:var(--ok)">●</span>`) without animation.

**Notes**: Asymmetric padding (`6px 14px 6px 8px`) — left is tighter so the dot sits closer to the edge. The text uses inline `<span class="mono">`.

---

## HeroTitle

**Purpose**: Massive serif/sans hybrid headline with optional muted segment.

**Source lines**: 1104–1106; CSS 194–217.

**HTML structure**:
```html
<h1 class="hero-title">
  Messages that <span class="serif">move</span> money.
</h1>
<p class="hero-sub">
  Ori is a chat app where your friends, your funds, and your AI agents
  share one surface. One name everywhere. Settlement in a hundred milliseconds.
  Nothing to confirm.
</p>
<div class="hero-actions">
  <a href="#flow" class="btn btn-primary">
    Open the app
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </a>
  <a href="#capabilities" class="btn btn-ghost">See it work</a>
</div>
```

**Key CSS rules**:
```css
h1.hero-title {
  font-size: clamp(42px, 7.2vw, 104px);
  line-height: 0.98;
  letter-spacing: -0.045em;
  font-weight: 400;
  margin: 0 0 32px;
  max-width: 14ch;
  color: var(--ink);
}
h1.hero-title .serif {
  font-style: italic;
  color: var(--ink);
  letter-spacing: -0.03em;
}
h1.hero-title .muted { color: var(--ink-3); }

.hero-sub {
  font-size: clamp(16px, 1.35vw, 19px);
  line-height: 1.55;
  color: var(--ink-2);
  max-width: 52ch;
  margin-bottom: 44px;
  font-weight: 400;
}

.hero-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 20px;
  border-radius: 999px;
  font-size: 14px; font-weight: 500;
  transition: all 0.22s var(--ease);
  border: 1px solid transparent;
  cursor: pointer;
  letter-spacing: -0.005em;
}
.btn-primary { background: var(--ink); color: var(--bg); }
.btn-primary:hover { background: #fff; transform: translateY(-1px); }
.btn-ghost { color: var(--ink-2); border-color: var(--line-2); }
.btn-ghost:hover { color: var(--ink); border-color: var(--line-3); background: var(--surface); }
.btn svg { width: 14px; height: 14px; }
```

**Tokens used**: `--ink`, `--ink-2`, `--ink-3`, `--bg`, `--line-2`, `--line-3`, `--surface`, `--ease`.

**Interactions / animations**: `.btn-primary` hover lifts 1px and brightens to `#fff`. `.btn-ghost` hover swaps text color and border.

**Variants**: `.btn-primary` (filled white), `.btn-ghost` (outlined). Title supports `.serif` italic span and `.muted` ink-3 span (muted not used in hero, but available).

**Notes**: Hero title has `max-width: 14ch` to force a ~3-line break at the design size. Sub is capped at `52ch`. Actions wrap on small screens via `flex-wrap`.

---

## Device

**Purpose**: iPhone-style chrome with notch holding the hero chat preview. Has parallax tilt on pointer move.

**Source lines**: 1121–1155; CSS 254–285.

**HTML structure**:
```html
<div class="device-wrap reveal">
  <div class="device">
    <div class="device-screen">
      <!-- ChatHeader -->
      <!-- chat-body with messages and PayCard -->
      <!-- ChatInput -->
    </div>
  </div>
</div>
```

**Key CSS rules**:
```css
.device-wrap {
  position: relative;
  display: flex; justify-content: center;
  padding-top: 16px;
}
.device {
  width: 100%; max-width: 380px;
  aspect-ratio: 9 / 19.5;
  background: #0d0d12;
  border: 1px solid var(--line-2);
  border-radius: 44px;
  padding: 10px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.03) inset,
    0 80px 120px -40px rgba(108, 123, 255, 0.25),
    0 40px 80px -20px rgba(0,0,0,0.6);
  position: relative;
}
.device::before {
  content: "";
  position: absolute; top: 22px; left: 50%; transform: translateX(-50%);
  width: 90px; height: 24px; background: #000; border-radius: 999px;
  z-index: 10;
}
.device-screen {
  width: 100%; height: 100%;
  background: var(--bg-2);
  border-radius: 36px;
  overflow: hidden;
  position: relative;
  display: flex; flex-direction: column;
}
```

**Tokens used**: `--line-2`, `--bg-2`. Literal colors `#0d0d12`, `#000`, accent-tinted shadow `rgba(108,123,255,0.25)`.

**Interactions / animations**: Parallax tilt via JS (lines 1766–1780):
```js
wrap.addEventListener('mousemove', (e) => {
  const r = wrap.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  device.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg)`;
  device.style.transition = 'transform 0.15s ease-out';
});
wrap.addEventListener('mouseleave', () => {
  device.style.transform = '';
  device.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1)';
});
```
Only activates when `window.matchMedia('(hover: hover)').matches` (desktop only).

**Variants**: none.

**Notes**: `::before` pseudo creates the camera notch (90×24, fully rounded). Outer device radius 44px, inner screen radius 36px (8px difference matches the 10px padding minus border). Aspect ratio 9/19.5 mimics modern iPhones.

---

## ChatHeader

**Purpose**: Top of device chat — avatar, name+status, ellipsis icon. Positioned below the device notch.

**Source lines**: 1124–1133; CSS 288–319.

**HTML structure**:
```html
<div class="chat-header">
  <div class="avatar ring" style="background: linear-gradient(135deg, #ff9ec7, #ff6b9d);">M</div>
  <div class="chat-title">
    <div class="name">mira<span style="color:var(--ink-3)">.init</span></div>
    <div class="status">typing…</div>
  </div>
  <svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ink-3)">
    <circle cx="3" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/>
  </svg>
</div>
```

**Key CSS rules**:
```css
.chat-header {
  padding: 54px 18px 14px;
  display: flex; align-items: center; gap: 12px;
  border-bottom: 1px solid var(--line);
  background: rgba(11,11,16,0.9);
  backdrop-filter: blur(20px);
}
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 500; color: #fff;
  flex-shrink: 0;
  position: relative;
}
.avatar.lg { width: 40px; height: 40px; font-size: 15px; }
.avatar.xl { width: 56px; height: 56px; font-size: 20px; }
.avatar.ring::after {
  content: ""; position: absolute; inset: -3px;
  border-radius: 50%;
  border: 1.5px solid var(--accent);
  animation: ring-pulse 1.8s ease-in-out infinite;
}
@keyframes ring-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.04); }
}
.chat-title { flex: 1; min-width: 0; }
.chat-title .name { font-size: 14px; font-weight: 500; letter-spacing: -0.01em; }
.chat-title .status { font-size: 11px; color: var(--ink-3); font-family: var(--mono); }
```

**Tokens used**: `--line`, `--ink-3`, `--mono`, `--accent`. Background literal `rgba(11,11,16,0.9)` mirrors `--bg-2` at 90% alpha.

**Interactions / animations**: `ring-pulse` keyframe — accent-colored ring outside avatar pulses opacity 0.35→0.9 and scale 1→1.04 over 1.8s.

**Variants**: `.avatar` (32px default), `.avatar.lg` (40px), `.avatar.xl` (56px). `.avatar.ring` adds the pulsing accent ring.

**Notes**: Top padding 54px clears the device notch (notch is at top:22px, height 24px). Background uses backdrop-blur over the chat scroll. The `.init` suffix in the name uses inline `style="color:var(--ink-3)"`.

---

## MsgIn

**Purpose**: Inbound chat bubble (left-aligned, surface bg).

**Source lines**: 1135 (hero), 1439, 1449, 1450 (thread); CSS 327–339.

**HTML structure**:
```html
<div class="msg in">dinner at nobu, $64.80 split 4 ways?</div>
```

**Key CSS rules**:
```css
.msg {
  max-width: 78%;
  padding: 9px 13px;
  border-radius: 18px;
  font-size: 13px;
  line-height: 1.4;
}
.msg.in {
  align-self: flex-start;
  background: var(--surface-2);
  color: var(--ink);
  border-top-left-radius: 6px;
}
```

**Tokens used**: `--surface-2`, `--ink`.

**Interactions / animations**: none directly (parent `.chat-body` is `flex-direction: column; gap: 10px`).

**Variants**: pair to `.msg.out`. Both share `.msg` base.

**Notes**: Asymmetric corner — top-left is tighter (6px) so the bubble appears anchored to the speaker's side.

---

## MsgOut

**Purpose**: Outbound chat bubble (right-aligned, accent bg).

**Source lines**: 1136, 1440, 1451; CSS 340–346.

**HTML structure**:
```html
<div class="msg out">sending now</div>
```

**Key CSS rules**:
```css
.msg.out {
  align-self: flex-end;
  background: var(--accent);
  color: var(--accent-ink);
  border-top-right-radius: 6px;
  font-weight: 500;
}
```

**Tokens used**: `--accent`, `--accent-ink`.

**Interactions / animations**: none.

**Variants**: pair to `.msg.in`.

**Notes**: Top-right corner tightened (6px) to mirror MsgIn's top-left treatment. Slightly bolder weight (500) than inbound (default 400).

---

## PayCard

**Purpose**: Payment confirmation card embedded in chat — label, amount, landed status with checkmark.

**Source lines**: 1137–1144 (hero), 1441–1448 (thread); CSS 348–377.

**HTML structure**:
```html
<div class="pay-card">
  <div class="label">Sent · mira.init</div>
  <div class="amt tnum">$16.20</div>
  <div class="meta">
    <span class="check">
      <svg viewBox="0 0 16 16" fill="none" stroke="#07070a" stroke-width="2.5">
        <path d="M4 8l2.5 2.5L12 5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
    <span>Landed · 97ms · 0x4a…b3c2</span>
  </div>
</div>
```

**Key CSS rules**:
```css
.pay-card {
  align-self: flex-start;
  width: 88%;
  padding: 14px;
  border: 1px solid var(--line-2);
  background: linear-gradient(180deg, var(--surface-2), var(--surface));
  border-radius: 16px;
  animation: card-in 0.55s var(--spring);
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.pay-card .label { font-size: 10px; color: var(--ink-3); font-family: var(--mono); letter-spacing: 0.1em; text-transform: uppercase; }
.pay-card .amt {
  font-family: var(--mono);
  font-size: 26px; font-weight: 500; letter-spacing: -0.02em;
  color: var(--ink); margin: 4px 0 6px;
  font-variant-numeric: tabular-nums;
}
.pay-card .meta {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; color: var(--ink-3); font-family: var(--mono);
}
.pay-card .meta .check {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--ok); display: inline-flex; align-items: center; justify-content: center;
}
.pay-card .meta .check svg { width: 9px; height: 9px; }
```

**Tokens used**: `--line-2`, `--surface-2`, `--surface`, `--ink-3`, `--mono`, `--ink`, `--ok`, `--spring`.

**Interactions / animations**: `card-in` mount animation — 0.55s spring ease, fades in from 8px down + 0.96 scale.

**Variants**: Hero copy says "Sent · mira.init", thread copy says "Sent · to mira.init". Hero meta includes hash suffix `· 0x4a…b3c2`; thread omits it.

**Notes**: Always left-aligned (`align-self: flex-start`). Subtle gradient runs surface-2 → surface (vertical). Check SVG stroke uses literal `#07070a` (matches `--bg`) so it reads on the green ok dot.

---

## ChatInput

**Purpose**: Input row at the bottom of the device — pill placeholder + circular send button.

**Source lines**: 1147–1152; CSS 379–400.

**HTML structure**:
```html
<div class="chat-input">
  <div class="pill">Message…</div>
  <div class="send-btn">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M8 12V4M4 8l4-4 4 4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
</div>
```

**Key CSS rules**:
```css
.chat-input {
  padding: 10px 12px 28px;
  display: flex; gap: 8px;
  border-top: 1px solid var(--line);
}
.chat-input .pill {
  flex: 1; padding: 10px 14px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-3);
}
.chat-input .send-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--line-2);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.chat-input .send-btn svg { width: 14px; height: 14px; color: var(--ink-2); }
```

**Tokens used**: `--line`, `--surface-2`, `--ink-3`, `--line-2`, `--ink-2`.

**Interactions / animations**: none defined.

**Variants**: none.

**Notes**: Bottom padding 28px gives room for the iPhone home indicator. Send icon is an up arrow (M8 12V4 + chevron up), distinct from the right arrow used in NavCTA.

---

## StatsRibbon

**Purpose**: 4-up stat row below hero — number + caption.

**Source lines**: 1158–1175; CSS 402–427.

**HTML structure**:
```html
<div class="stats reveal" style="margin-top: 80px;">
  <div class="stat">
    <div class="k tnum">97<span class="sfx">ms</span></div>
    <div class="v">median settlement</div>
  </div>
  <div class="stat">
    <div class="k tnum">1<span class="sfx">%</span></div>
    <div class="v">creator tip fee</div>
  </div>
  <div class="stat">
    <div class="k tnum">0</div>
    <div class="v">wallet popups</div>
  </div>
  <div class="stat">
    <div class="k">e2e</div>
    <div class="v">encryption by default</div>
  </div>
</div>
```

**Key CSS rules**:
```css
.stats {
  padding: 32px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
}
@media (max-width: 720px) {
  .stats { grid-template-columns: repeat(2, 1fr); gap: 24px; }
}
.stat .k {
  font-family: var(--mono);
  font-size: 28px;
  letter-spacing: -0.03em;
  font-weight: 500;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.stat .k .sfx { color: var(--ink-3); font-size: 20px; margin-left: 2px; }
.stat .v {
  font-size: 12px; color: var(--ink-3);
  margin-top: 4px;
  letter-spacing: 0.01em;
}
.tnum { font-variant-numeric: tabular-nums; }
```

**Tokens used**: `--line`, `--mono`, `--ink`, `--ink-3`.

**Interactions / animations**: gets `.reveal` for fade-up on scroll.

**Variants**: `.k` may contain a `.sfx` span (smaller, ink-3) for unit suffixes (ms, %); the "e2e" stat omits `.tnum` because it's not a number.

**Notes**: Inline `margin-top: 80px` separates ribbon from hero device. Collapses to 2-col below 720px.

---

## SectionHead

**Purpose**: Section opener — eyebrow number, large title, optional sub-paragraph.

**Source lines**: 1180–1188 (Capabilities), 1350–1358 (Flow), 1505–1513 (Creators), 1611–1616 (Philosophy), 1639–1647 (System); CSS 429–452, 110–114.

**HTML structure**:
```html
<div class="section-head reveal">
  <div>
    <div class="eyebrow" style="margin-bottom: 16px;">01 · Capabilities</div>
    <h2 class="section-title">Payments, messages, and agents <span class="serif">on the same surface</span>.</h2>
  </div>
  <p class="section-sub">
    Six primitives. No feature menu. Everything Ori does, it does from a single conversation.
  </p>
</div>
```

**Key CSS rules**:
```css
section.slab { padding: clamp(72px, 12vw, 140px) 0; }

.section-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 24px; margin-bottom: 56px;
  flex-wrap: wrap;
}
.section-title {
  font-size: clamp(28px, 4vw, 48px);
  letter-spacing: -0.035em;
  line-height: 1.05;
  font-weight: 400;
  max-width: 22ch;
  margin: 0;
}
.section-title .serif { font-style: italic; }
.section-title .muted { color: var(--ink-3); }
.section-sub {
  font-size: 15px;
  color: var(--ink-2);
  max-width: 42ch;
  line-height: 1.55;
}
.eyebrow {
  font-size: 11px; font-weight: 500; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-3);
  font-family: var(--mono);
}
```

**Tokens used**: `--ink-3`, `--ink-2`, `--mono`.

**Interactions / animations**: `.reveal` fade-up on scroll.

**Variants**: Title supports `.serif` italic span and `.muted` (ink-3) span — Philosophy uses `<span class="muted">The restraint</span> is the product.`. Sub is optional (Philosophy omits it).

**Notes**: Eyebrow numbering is content-driven (01–05). Inline `margin-bottom: 16px` on every eyebrow because it has no rule of its own here. The Flow section's section-head sits inside `.shell` with inline `padding-top: 80px`.

---

## Panel (OS-window primitive)

**Purpose**: Reusable card with chrome (dots + path label + right-side label) used for capability tiles.

**Source lines**: panel-big at 1192–1215, 1218–1274; small panels in row at 1278–1342; CSS 469–512.

**HTML structure**:
```html
<div class="panel panel-big reveal">
  <div class="panel-chrome">
    <div class="left">
      <div class="dots"><span></span><span></span><span></span></div>
      <span class="path">/send</span>
    </div>
    <div class="right">kp.send</div>
  </div>
  <div class="panel-body">
    <div>
      <h3 class="h"><span class="serif">Pay</span> without leaving the chat.</h3>
      <p class="p">Tap $, type a number, send…</p>
    </div>
    <div class="viz">
      <!-- Inner visual: Keypad / NetworkSVG / GiftPreview / Terminal / StreamProgress -->
    </div>
  </div>
</div>
```

**Key CSS rules**:
```css
.cap-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
}
.cap-grid .row {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;
  grid-column: 1 / -1;
}
@media (max-width: 960px) {
  .cap-grid { grid-template-columns: 1fr; }
  .cap-grid .row { grid-template-columns: 1fr; }
}

.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-4);
  overflow: hidden;
  position: relative;
  transition: border-color 0.3s var(--ease), background 0.3s var(--ease), transform 0.4s var(--ease);
}
.panel:hover { border-color: var(--line-2); background: var(--surface-2); }

.panel-chrome {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.02em;
}
.panel-chrome .left { display: flex; align-items: center; gap: 8px; }
.panel-chrome .dots { display: flex; gap: 5px; }
.panel-chrome .dots span {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--line-3);
}
.panel-chrome .path { color: var(--ink-4); }
.panel-chrome .right { color: var(--ink-4); font-size: 10px; }

.panel-body { padding: 28px; }
.panel-body .h {
  font-size: 22px; letter-spacing: -0.02em; line-height: 1.15; margin: 0 0 10px;
  font-weight: 400;
  color: var(--ink);
}
.panel-body .h .serif { font-style: italic; }
.panel-body .p {
  font-size: 13.5px;
  color: var(--ink-2);
  line-height: 1.55;
  max-width: 46ch;
}

.panel-big { grid-column: span 1; min-height: 420px; display: flex; flex-direction: column; }
.panel-big .panel-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }

.viz {
  margin-top: 24px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
  min-height: 180px;
  display: flex; align-items: center; justify-content: center;
}
```

**Tokens used**: `--surface`, `--line`, `--r-4`, `--ease`, `--line-2`, `--surface-2`, `--mono`, `--ink-3`, `--ink-4`, `--line-3`, `--ink`, `--ink-2`.

**Interactions / animations**: hover transitions border + background. `.reveal` on each instance.

**Variants**: `.panel` (default in 3-up row) vs `.panel.panel-big` (taller, with content distribution top/bottom). Two panel-bigs share row 1, three plain panels share row 2 (in a `.cap-grid .row` wrapper).

**Notes**: Chrome dots are uniform `--line-3` color (no traffic-light red/yellow/green here — those are reserved for the Window component). Right-side label is a tiny code-style identifier (e.g. `kp.send`, `id.graph`, `gft.create`, `mcp.ori`, `flow.live`). Title `.h` accepts inline `.serif` span. Body p capped at 46ch.

---

## Keypad

**Purpose**: 3×4 numeric keypad shown inside `.viz` and in WinSend.

**Source lines**: 1206–1212 (panel viz), 1480–1485 (WinSend); CSS 523–562.

**HTML structure**:
```html
<div class="keypad">
  <div class="amt-row tnum"><span class="cur">$</span>42<span class="cursor"></span></div>
  <div class="key">1</div><div class="key">2</div><div class="key">3</div>
  <div class="key">4</div><div class="key">5</div><div class="key">6</div>
  <div class="key">7</div><div class="key">8</div><div class="key">9</div>
  <div class="key">.</div><div class="key">0</div><div class="key">⌫</div>
</div>
```

**Key CSS rules**:
```css
.keypad {
  width: 100%; max-width: 280px;
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.keypad .amt-row {
  grid-column: 1 / -1;
  font-family: var(--mono);
  font-size: 44px;
  font-weight: 500;
  letter-spacing: -0.03em;
  text-align: center;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  padding: 8px 0 16px;
  line-height: 1;
}
.keypad .amt-row .cur { color: var(--ink-3); font-size: 28px; margin-right: 4px; }
.keypad .amt-row .cursor {
  display: inline-block; width: 2px; height: 38px;
  background: var(--accent); margin-left: 2px;
  vertical-align: middle;
  animation: blink 1.1s step-end infinite;
}
@keyframes blink { 50% { opacity: 0; } }
.keypad .key {
  aspect-ratio: 1.6 / 1;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--mono);
  font-size: 16px;
  color: var(--ink);
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  transition: all 0.15s var(--ease);
  cursor: pointer;
}
.keypad .key:hover { background: var(--surface-3); }
.keypad .key:active { transform: scale(0.96); }
```

**Tokens used**: `--mono`, `--ink`, `--ink-3`, `--accent`, `--surface-2`, `--line`, `--ease`, `--surface-3`.

**Interactions / animations**: `blink` cursor 1.1s step-end infinite. Per-key click bounce via JS (lines 1756–1763):
```js
document.querySelectorAll('.keypad .key').forEach(k => {
  k.addEventListener('click', () => {
    k.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
      { duration: 180, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
    );
  });
});
```
Plus CSS `:hover` (lighter bg) and `:active` (scale 0.96).

**Variants**: With `.amt-row` (capability viz) vs without (WinSend uses keypad only — amount lives in `.amt-box` separately, and WinSend keypad gets inline `style="padding: 0 16px;"`).

**Notes**: 12 keys total (1–9, then `.`, `0`, `⌫`). `amt-row` spans full width via `grid-column: 1 / -1`. The blinking cursor is a 2px×38px accent bar.

---

## NetworkSVG

**Purpose**: Static SVG illustration — central "you.init" node connected to 6 satellite identity nodes.

**Source lines**: 1232–1271; CSS 564–571.

**HTML structure**:
```html
<div class="network">
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
    <!-- center node -->
    <g>
      <circle cx="160" cy="120" r="24" fill="#6c7bff"/>
      <text x="160" y="125" text-anchor="middle" fill="#0a0a12" font-family="Geist Mono" font-size="10" font-weight="600">you.init</text>
    </g>
    <!-- satellite nodes -->
    <g fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)">
      <circle cx="60" cy="60" r="14"/>
      <circle cx="270" cy="50" r="14"/>
      <circle cx="260" cy="180" r="14"/>
      <circle cx="50" cy="180" r="14"/>
      <circle cx="160" cy="30" r="10"/>
      <circle cx="160" cy="210" r="10"/>
    </g>
    <!-- satellite labels -->
    <g fill="rgba(244,244,246,0.7)" font-family="Geist Mono" font-size="8.5" text-anchor="middle">
      <text x="60" y="63">mira</text>
      <text x="270" y="53">alex</text>
      <text x="260" y="183">jamie</text>
      <text x="50" y="183">sam</text>
    </g>
  </svg>
</div>
```

**Key CSS rules**:
```css
.network {
  width: 100%; aspect-ratio: 1 / 0.75;
  max-width: 320px;
  position: relative;
}
.network svg { width: 100%; height: 100%; overflow: visible; }
.network .node circle { transition: all 0.3s var(--ease); }
```

**Tokens used**: hard-coded literals matching `--accent` (#6c7bff), `--accent-ink` (#0a0a12). CSS `--ease`.

**Interactions / animations**: `.network .node circle` selector exists with transition but no `.node` class is applied in the markup — looks like a defined-but-unused hook.

**Variants**: none.

**Notes**: 4 named satellites (mira/alex/jamie/sam) + 2 anonymous top/bottom satellites. Center node has glow + filled accent disc + "you.init" text. Lines start `(160,120)` (center) and emit to each satellite. Use `viewBox` for crisp scaling, not fixed pixels.

---

## GiftPreview

**Purpose**: Tilted gift-card visual with accent gradient — pin label, big amount, note line.

**Source lines**: 1287–1291; CSS 573–602.

**HTML structure**:
```html
<div class="gift-preview">
  <span class="pin">For you</span>
  <span class="amt tnum">$50</span>
  <span class="note">happy birthday, m</span>
</div>
```

**Key CSS rules**:
```css
.gift-preview {
  width: 100%; max-width: 280px;
  aspect-ratio: 1.6 / 1;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent), #9aa5ff);
  color: var(--accent-ink);
  padding: 18px;
  display: flex; flex-direction: column; justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.gift-preview::before {
  content: ""; position: absolute; inset: 0;
  background-image: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3), transparent 40%);
}
.gift-preview .amt {
  font-family: var(--mono); font-size: 40px; font-weight: 500;
  letter-spacing: -0.02em; line-height: 1;
  position: relative;
}
.gift-preview .note { font-size: 13px; position: relative; }
.gift-preview .pin {
  position: absolute; top: 14px; right: 14px;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(0,0,0,0.2);
  color: rgba(10,10,18,0.8);
  font-family: var(--mono); font-size: 10px;
  letter-spacing: 0.1em; text-transform: uppercase;
}
```

**Tokens used**: `--accent`, `--accent-ink`, `--mono`. Literal `#9aa5ff` ≈ `--accent-2`.

**Interactions / animations**: none, but `::before` adds a static specular highlight at top-right.

**Variants**: none.

**Notes**: 1.6:1 aspect ratio. Pin uses `rgba(10,10,18,0.8)` text on `rgba(0,0,0,0.2)` background (essentially `--accent-ink` at 80%). Inner content needs `position: relative` to sit above the `::before` highlight.

---

## Terminal

**Purpose**: Mock CLI output for the agent panel — prompt lines, dim hints, ok-colored success line, blinking cursor.

**Source lines**: 1305–1311; CSS 604–624.

**HTML structure**:
```html
<div class="term">
  <div class="line"><span class="prompt">›</span> tip alice.init 5 USD <span class="dim">— "for the stream"</span></div>
  <div class="line dim">resolving .init → 0xc2…8d</div>
  <div class="line dim">signing with grant · 24h</div>
  <div class="line ok">✓ landed · 94ms · 0xa1…f7</div>
  <div class="line">done<span class="cursor-t"></span></div>
</div>
```

**Key CSS rules**:
```css
.term {
  width: 100%;
  font-family: var(--mono);
  font-size: 12px;
  background: #050507;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  color: var(--ink-2);
  min-height: 160px;
}
.term .line { margin-bottom: 5px; line-height: 1.55; }
.term .prompt { color: var(--accent); }
.term .dim { color: var(--ink-4); }
.term .ok { color: var(--ok); }
.term .cursor-t {
  display: inline-block; width: 7px; height: 12px;
  background: var(--ink); margin-left: 2px; vertical-align: text-bottom;
  animation: blink 1.1s step-end infinite;
}
```

**Tokens used**: `--mono`, `--line`, `--ink-2`, `--accent`, `--ink-4`, `--ok`, `--ink`. Background `#050507` darker than `--bg` for terminal feel.

**Interactions / animations**: `blink` keyframe (shared with Keypad cursor). Cursor is a small filled rect.

**Variants**: line modifiers — `.dim` (ink-4), `.ok` (green), default (ink-2).

**Notes**: Prompt char is `›` (U+203A), not a `>`. Dim em-dash quote-suffix on the first line is a separate `.dim` span.

---

## StreamProgress

**Purpose**: Per-second flow visualization — three label/value rows and a filling bar.

**Source lines**: 1325–1339; CSS 626–648.

**HTML structure**:
```html
<div class="stream">
  <div class="stream-row">
    <span>per second</span>
    <span class="val tnum">$0.0139</span>
  </div>
  <div class="stream-row">
    <span>elapsed</span>
    <span class="val tnum">00:48:12</span>
  </div>
  <div class="stream-bar"></div>
  <div class="stream-row" style="margin-top:10px;">
    <span>streamed</span>
    <span class="val tnum">$40.19</span>
  </div>
</div>
```

**Key CSS rules**:
```css
.stream {
  width: 100%; max-width: 280px;
}
.stream-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
.stream-row .val { color: var(--ink); font-size: 13px; }
.stream-bar {
  width: 100%; height: 4px;
  background: var(--surface-3); border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.stream-bar::after {
  content: "";
  position: absolute; inset: 0;
  width: 68%; background: var(--accent);
  border-radius: 2px;
  animation: fill-up 4s var(--ease) infinite alternate;
}
@keyframes fill-up {
  from { width: 10%; }
  to { width: 68%; }
}
```

**Tokens used**: `--mono`, `--ink-3`, `--ink`, `--surface-3`, `--accent`, `--ease`.

**Interactions / animations**: `fill-up` keyframe — bar's `::after` animates width 10%→68%, 4s ease, infinite alternate (so it ebbs back).

**Variants**: none, but the third row gets inline `margin-top:10px` to visually separate "streamed" from the bar.

**Notes**: Bar is 4px tall, 2px radius. The 68% target matches the static `width: 68%` declared on `::after`, but the keyframe overrides during animation.

---

## Window (OS-style chrome)

**Purpose**: Base "macOS window" wrapper used for the three Flow surfaces. Provides title bar with traffic-light dots and a centered title.

**Source lines**: 1362, 1422, 1463 (instances); CSS 666–693.

**HTML structure**:
```html
<div class="window">
  <div class="window-bar">
    <div class="traffic"><span></span><span></span><span></span></div>
    <div class="window-title">Ori · Chats</div>
  </div>
  <!-- window-specific body -->
</div>
```

**Key CSS rules**:
```css
.flow-section {
  background: linear-gradient(180deg, transparent, rgba(108, 123, 255, 0.04));
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.flow-stage {
  position: relative;
  padding: 64px 0;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}
.window {
  background: var(--bg-2);
  border: 1px solid var(--line-2);
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.02) inset,
    0 40px 80px -20px rgba(0,0,0,0.6),
    0 20px 40px -10px rgba(0,0,0,0.4);
  transition: transform 0.5s var(--ease), opacity 0.5s var(--ease);
}
.window-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.traffic { display: flex; gap: 6px; }
.traffic span { width: 11px; height: 11px; border-radius: 50%; background: var(--line-3); }
.window-title {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  flex: 1;
  text-align: center;
  padding-right: 40px;
}

@media (max-width: 960px) {
  .flow-stage { flex-direction: column; gap: 16px; padding: 48px 0; }
  .win-chats, .win-thread, .win-send { width: 100%; max-width: 400px; }
}
```

**Tokens used**: `--line`, `--bg-2`, `--line-2`, `--ease`, `--surface`, `--line-3`, `--mono`, `--ink-3`.

**Interactions / animations**: Transition on transform/opacity (used with `.reveal`). The first window has inline `style="transform: translateY(0);"`.

**Variants**: combined with `.win-chats`, `.win-thread`, or `.win-send` to set fixed dimensions and inner layout.

**Notes**: Traffic dots all use the same `--line-3` (no red/yellow/green colors). `.window-title` has `padding-right: 40px` and `flex: 1; text-align: center` so the title appears centered between traffic dots and the right edge — a classic macOS look. `.flow-section` has its own border-top/bottom and a faint indigo wash gradient bottom.

---

## WinChats

**Purpose**: Left-hand chats list window — search field + scrollable list of chat-items.

**Source lines**: 1362–1419; CSS 696–743.

**HTML structure**:
```html
<div class="window win-chats reveal" style="transform: translateY(0);">
  <div class="window-bar">
    <div class="traffic"><span></span><span></span><span></span></div>
    <div class="window-title">Ori · Chats</div>
  </div>
  <div class="search">
    <div class="input">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="7" cy="7" r="4.5"/>
        <path d="M14 14l-3.5-3.5" stroke-linecap="round"/>
      </svg>
      <span>Search names…</span>
      <span class="kbd">⌘K</span>
    </div>
  </div>
  <div class="list">
    <div class="chat-item active">
      <div class="avatar" style="background: linear-gradient(135deg, #ff9ec7, #ff6b9d);">M</div>
      <div class="meta">
        <div class="row1"><div class="name">mira.init</div><div class="time">now</div></div>
        <div class="preview">typing…</div>
      </div>
      <div class="badge">2</div>
    </div>
    <div class="chat-item">
      <div class="avatar" style="background: linear-gradient(135deg, #78cfc1, #3aa693);">A</div>
      <div class="meta">
        <div class="row1"><div class="name">alex.init</div><div class="time">2m</div></div>
        <div class="preview"><span class="flash">⚡</span> Sent $12 · "thx for coffee"</div>
      </div>
    </div>
    <!-- additional chat-items: jamie, sam, studio (3), lina -->
  </div>
</div>
```

**Key CSS rules**:
```css
.win-chats { width: 340px; height: 440px; display: flex; flex-direction: column; }
.win-chats .list { flex: 1; overflow-y: auto; }
.chat-item {
  display: flex; gap: 12px; padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  align-items: center;
  cursor: pointer;
  transition: background 0.15s var(--ease);
}
.chat-item:hover { background: var(--surface); }
.chat-item.active { background: var(--surface-2); }
.chat-item .meta { flex: 1; min-width: 0; }
.chat-item .row1 { display: flex; justify-content: space-between; align-items: baseline; }
.chat-item .name { font-size: 13.5px; font-weight: 500; letter-spacing: -0.005em; }
.chat-item .time { font-family: var(--mono); font-size: 10px; color: var(--ink-4); }
.chat-item .preview {
  font-size: 12px; color: var(--ink-3);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-top: 2px;
}
.chat-item .preview .flash { color: var(--accent-2); font-family: var(--mono); }
.chat-item .badge {
  min-width: 18px; height: 18px; padding: 0 6px;
  background: var(--accent); color: var(--accent-ink);
  border-radius: 999px;
  font-size: 10px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}

.win-chats .search {
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
}
.win-chats .search .input {
  width: 100%;
  padding: 7px 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px; color: var(--ink-3);
  display: flex; align-items: center; gap: 8px;
}
.win-chats .search svg { width: 12px; height: 12px; color: var(--ink-4); }
.win-chats .search .kbd {
  margin-left: auto;
  font-family: var(--mono); font-size: 10px; color: var(--ink-4);
  padding: 2px 6px; border: 1px solid var(--line-2); border-radius: 4px;
}
```

**Tokens used**: `--line`, `--ease`, `--surface`, `--surface-2`, `--mono`, `--ink-4`, `--ink-3`, `--accent-2`, `--accent`, `--accent-ink`, `--line-2`.

**Interactions / animations**: chat-item hover background change. Mobile collapses to full width.

**Variants**: `.chat-item.active` (selected — surface-2 bg). Items may include `.badge` (unread count) or omit it. Preview may include a `.flash` accent-2 lightning span.

**Notes**: 6 chat-items in the demo: mira (active, badge 2, "typing…"), alex (flash + sent line), jamie ("split for dinner tomorrow?"), sam ("stream.ended · $42.70 total"), studio (3) ("rent for march · 4 paid"), lina ("Gift claimed · $25"). Each avatar uses a unique gradient supplied inline. List is scrollable but content fits in 440px height.

---

## WinThread

**Purpose**: Middle conversation window — header with avatar + actions, scrollable body of messages, input row with `$` button.

**Source lines**: 1422–1460; CSS 745–783.

**HTML structure**:
```html
<div class="window win-thread reveal">
  <div class="window-bar">
    <div class="traffic"><span></span><span></span><span></span></div>
    <div class="window-title">mira.init</div>
  </div>
  <div class="head">
    <div class="avatar ring" style="background: linear-gradient(135deg, #ff9ec7, #ff6b9d);">M</div>
    <div class="info">
      <div class="n">mira.init</div>
      <div class="s">⚡ active · e2e encrypted</div>
    </div>
    <div class="actions">
      <span class="icon">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 5l6 4 6-4M2 5v6h12V5" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="icon">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/>
          <path d="M8 6v2M6.2 11l-.4-1M9.8 11l.4-1"/>
        </svg>
      </span>
    </div>
  </div>
  <div class="body">
    <div class="msg in">dinner at nobu, $64.80 split 4 ways?</div>
    <div class="msg out">sending now</div>
    <div class="pay-card">
      <div class="label">Sent · to mira.init</div>
      <div class="amt tnum">$16.20</div>
      <div class="meta">
        <span class="check">…</span>
        <span>Landed · 97ms</span>
      </div>
    </div>
    <div class="msg in">🫡 thanks</div>
    <div class="msg in">want me to charge j and a too?</div>
    <div class="msg out">yes pls</div>
  </div>
  <div class="input">
    <div class="dollar">$</div>
    <div class="box">
      <span>Message mira…</span>
      <svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ink-3)">
        <path d="M8 12V4M4 8l4-4 4 4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </div>
</div>
```

**Key CSS rules**:
```css
.win-thread { width: 380px; height: 520px; display: flex; flex-direction: column; }
.win-thread .head {
  padding: 14px; border-bottom: 1px solid var(--line);
  display: flex; gap: 10px; align-items: center;
}
.win-thread .head .info { flex: 1; }
.win-thread .head .info .n { font-size: 13.5px; font-weight: 500; }
.win-thread .head .info .s { font-size: 11px; color: var(--ink-3); font-family: var(--mono); }
.win-thread .head .actions { display: flex; gap: 8px; color: var(--ink-3); }
.win-thread .head .actions .icon {
  width: 28px; height: 28px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line);
}
.win-thread .head .actions svg { width: 12px; height: 12px; }
.win-thread .body {
  flex: 1;
  padding: 16px 14px;
  display: flex; flex-direction: column; gap: 10px;
  overflow-y: auto;
}
.win-thread .input {
  padding: 10px 12px;
  border-top: 1px solid var(--line);
  display: flex; gap: 8px;
}
.win-thread .input .box {
  flex: 1; padding: 9px 14px;
  background: var(--surface-2); border: 1px solid var(--line);
  border-radius: 999px; font-size: 12.5px; color: var(--ink-3);
  display: flex; align-items: center; justify-content: space-between;
}
.win-thread .input .dollar {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--surface-2); border: 1px solid var(--line-2);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 14px; color: var(--ink);
}
```

**Tokens used**: `--line`, `--ink-3`, `--mono`, `--surface-2`, `--line-2`, `--ink`.

**Interactions / animations**: body is scrollable. Reuses `.avatar.ring` pulse and `.pay-card` `card-in`.

**Variants**: none; slightly different from device chat — input has a leading `$` button and a tighter "box" shape.

**Notes**: Bigger than WinChats (520px tall vs 440px). Action icons: an envelope and a share/3-dot graph. Reuses `.msg.in`, `.msg.out`, `.pay-card` from device. The dollar leading button lets the user jump straight into payment mode.

---

## WinSend

**Purpose**: Right-hand send window — recipient row, big amount display, embedded keypad, full-width send CTA.

**Source lines**: 1463–1492; CSS 785–824.

**HTML structure**:
```html
<div class="window win-send reveal">
  <div class="window-bar">
    <div class="traffic"><span></span><span></span><span></span></div>
    <div class="window-title">Send</div>
  </div>
  <div class="recipient">
    <div class="avatar" style="background: linear-gradient(135deg, #ff9ec7, #ff6b9d);">M</div>
    <div class="who">
      <div class="n">mira.init</div>
      <div class="s">0xc29d…8a4f</div>
    </div>
    <span class="x">×</span>
  </div>
  <div class="amt-box">
    <div class="amt-big tnum"><span class="cur">$</span>16.20</div>
    <div class="bal">Balance · $245.00 USD</div>
  </div>
  <div class="keypad" style="padding: 0 16px;">
    <div class="key">1</div><div class="key">2</div><div class="key">3</div>
    <div class="key">4</div><div class="key">5</div><div class="key">6</div>
    <div class="key">7</div><div class="key">8</div><div class="key">9</div>
    <div class="key">.</div><div class="key">0</div><div class="key">⌫</div>
  </div>
  <div class="send-foot">
    <button class="send-cta">
      Send · $16.20
      <svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</div>
```

**Key CSS rules**:
```css
.win-send { width: 340px; height: 440px; display: flex; flex-direction: column; }
.win-send .recipient {
  padding: 14px;
  display: flex; gap: 10px; align-items: center;
  border-bottom: 1px solid var(--line);
}
.win-send .recipient .who { flex: 1; }
.win-send .recipient .who .n { font-size: 13px; font-weight: 500; }
.win-send .recipient .who .s { font-family: var(--mono); font-size: 10.5px; color: var(--ink-4); }
.win-send .recipient .x {
  color: var(--ink-3); font-size: 14px;
}
.win-send .amt-box {
  padding: 36px 16px 22px;
  text-align: center;
}
.win-send .amt-big {
  font-family: var(--mono); font-size: 56px; font-weight: 500;
  letter-spacing: -0.03em; line-height: 1;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.win-send .amt-big .cur { color: var(--ink-3); font-size: 30px; margin-right: 4px; vertical-align: 18px; }
.win-send .bal {
  font-family: var(--mono); font-size: 11px;
  color: var(--ink-3); margin-top: 12px;
}
.win-send .send-foot {
  padding: 14px; margin-top: auto;
  border-top: 1px solid var(--line);
}
.win-send .send-cta {
  width: 100%; padding: 13px;
  background: var(--ink); color: var(--bg);
  border-radius: 999px;
  font-size: 14px; font-weight: 500;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
```

**Tokens used**: `--line`, `--mono`, `--ink-4`, `--ink-3`, `--ink`, `--bg`.

**Interactions / animations**: keypad keys still get the JS click bounce and CSS hover. `send-cta` has no defined hover.

**Variants**: shares Keypad without `.amt-row` (amount lives in `.amt-box`). Amount currency `$` glyph is `vertical-align: 18px` (a raised superscript-style positioning).

**Notes**: Same fixed 340×440 footprint as WinChats. `.send-foot` uses `margin-top: auto` to glue itself to the window bottom. Keypad embedded with inline `padding: 0 16px` (since `.keypad` itself doesn't define horizontal padding). Recipient row has a close `×` (raw text glyph, no SVG).

---

## LinktreeProfile

**Purpose**: Creator profile card — cover banner, large avatar with verification mark, stats row, tip-bar with chips, lt-link buttons, tabs, and activity feed.

**Source lines**: 1496–1607 (full block including scoped style block 1497–1503); CSS 830–921, 1497–1503.

**HTML structure**:
```html
<style>
  .linktree{max-width:560px;margin:0 auto;}
  .linktree .profile-body{padding:60px 28px 28px;}
  .lt-link{display:block;padding:14px 18px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);font-size:14px;text-align:center;transition:all 180ms ease;cursor:pointer;text-decoration:none;}
  .lt-link:hover{border-color:var(--ink-3);transform:translateY(-1px);background:var(--surface-2);}
  .linktree .feed-item{text-align:left;}
</style>

<div class="profile-wrap reveal linktree">
  <div class="profile-cover"></div>
  <div class="profile-body" style="text-align:center;">
    <div class="profile-head" style="flex-direction:column;align-items:center;gap:16px;margin-top:-52px;">
      <div class="avatar xl" style="background: linear-gradient(135deg, #ff9ec7, #ff6b9d); width:104px;height:104px;font-size:40px;border:3px solid var(--bg);box-shadow:0 12px 40px rgba(0,0,0,0.4);">M</div>
      <div class="profile-info" style="align-items:center;display:flex;flex-direction:column;gap:8px;">
        <div class="n" style="display:flex;align-items:center;gap:8px;justify-content:center;">
          <span class="serif">mira</span>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style="flex-shrink:0;">
            <path d="M11 1.5L13.4 3.6L16.5 3.2L17.8 6.1L20.5 7.5L19.8 10.5L21 13.3L18.7 15.4L18.4 18.5L15.4 19L13.3 21L10.5 19.9L7.5 20.5L6 17.8L3.2 16.5L3.6 13.4L1.5 11L3.6 8.6L3.2 5.5L6 4.2L7.5 1.5L10.5 2.1Z" fill="var(--accent)"/>
            <path d="M7.5 11L10 13.5L14.5 8.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
        <div class="h" style="font-size:13px;">videographer · lisbon</div>
        <div class="h mono" style="font-size:12px;opacity:0.6;">mira.init · 0xc29d…8a4f</div>
      </div>
    </div>
    <p class="profile-bio" style="text-align:center;max-width:440px;margin:20px auto 24px;">
      Short films, travel cuts, and the occasional slow-motion rain. Tips go straight to better gear and coffee for the team.
    </p>

    <div class="lt-stats" style="display:flex;gap:32px;justify-content:center;padding:16px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:24px;">
      <div><div class="tnum" style="font-size:20px;font-weight:600;">$4,280</div><div class="label" style="margin-top:2px;">TIPPED</div></div>
      <div style="width:1px;background:var(--line);"></div>
      <div><div class="tnum" style="font-size:20px;font-weight:600;">128</div><div class="label" style="margin-top:2px;">SUBSCRIBERS</div></div>
      <div style="width:1px;background:var(--line);"></div>
      <div><div class="tnum" style="font-size:20px;font-weight:600;">2.1k</div><div class="label" style="margin-top:2px;">FOLLOWERS</div></div>
    </div>

    <div class="tip-bar" style="flex-direction:column;gap:16px;">
      <div style="width:100%;text-align:center;">
        <div class="label" style="margin-bottom:12px;">TIP MIRA</div>
        <div class="amt-quick" style="justify-content:center;flex-wrap:wrap;">
          <span class="chip">$1</span>
          <span class="chip accent">$5</span>
          <span class="chip">$10</span>
          <span class="chip">$25</span>
          <span class="chip">custom</span>
        </div>
      </div>
      <button class="cta" style="width:100%;max-width:320px;">
        Send tip →
      </button>
    </div>

    <div class="lt-links" style="display:flex;flex-direction:column;gap:10px;margin-top:28px;">
      <a class="lt-link">🎬  Latest film · "Lisbon at 4am"</a>
      <a class="lt-link">📸  Instagram · @mira.films</a>
      <a class="lt-link">🔓  Unlock · behind-the-cut ($3)</a>
      <a class="lt-link">☕  Subscribe · monthly ($9)</a>
    </div>

    <div class="profile-tabs" style="justify-content:center;margin-top:32px;">
      <div class="tab active">Recent activity</div>
      <div class="tab">Paywalls</div>
      <div class="tab">Subscribers · 128</div>
    </div>

    <div class="feed">
      <div class="feed-item">
        <div class="avatar" style="background: linear-gradient(135deg, #78cfc1, #3aa693);">A</div>
        <div class="txt"><span class="strong">alex.init</span> tipped — <span class="serif">"the golden hour one was perfect"</span></div>
        <div class="amt tnum">$5</div>
        <div class="t">2m</div>
      </div>
      <!-- 4 more feed-items: sam, jamie, lina, agent.claude -->
    </div>
  </div>
</div>
```

**Key CSS rules**:
```css
.profile-wrap {
  max-width: 640px; margin: 0 auto;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-4);
  overflow: hidden;
}
.profile-cover {
  height: 140px;
  background:
    radial-gradient(ellipse 600px 200px at 30% 100%, rgba(108,123,255,0.35), transparent 60%),
    radial-gradient(ellipse 400px 300px at 80% 0%, rgba(154,165,255,0.2), transparent 60%),
    var(--bg-2);
  border-bottom: 1px solid var(--line);
}
.profile-body { padding: 0 28px 28px; margin-top: -28px; position: relative; }
.profile-head { display: flex; gap: 16px; align-items: flex-end; }
.profile-head .avatar {
  width: 72px; height: 72px; font-size: 26px;
  border: 3px solid var(--bg);
  box-shadow: 0 0 0 1px var(--line-2);
}
.profile-head .pill-row { display: flex; gap: 8px; margin-bottom: 6px; }
.profile-head .pill {
  padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--line-2);
  font-size: 11px; color: var(--ink-2);
  font-family: var(--mono);
}
.profile-info { padding-top: 16px; flex: 1; }
.profile-info .n { font-size: 22px; letter-spacing: -0.02em; font-weight: 400; }
.profile-info .n .serif { font-style: italic; }
.profile-info .h { font-family: var(--mono); font-size: 12px; color: var(--ink-3); margin-top: 2px; }
.profile-bio { margin-top: 18px; color: var(--ink-2); font-size: 14px; max-width: 52ch; }

.tip-bar {
  margin-top: 24px;
  padding: 18px;
  border: 1px solid var(--line-2);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(108,123,255,0.08), rgba(108,123,255,0.02));
  display: flex; align-items: center; gap: 16px;
}
.tip-bar .label { font-size: 12px; color: var(--ink-3); font-family: var(--mono); letter-spacing: 0.06em; }
.tip-bar .amt-quick {
  display: flex; gap: 6px; margin-top: 8px;
}
.tip-bar .amt-quick .chip {
  padding: 5px 10px; border-radius: 999px;
  background: var(--surface-2); border: 1px solid var(--line);
  font-family: var(--mono); font-size: 11px; color: var(--ink);
  cursor: pointer;
  transition: all 0.2s var(--ease);
}
.tip-bar .amt-quick .chip:hover { background: var(--surface-3); }
.tip-bar .amt-quick .chip.accent {
  background: var(--accent); color: var(--accent-ink); border-color: transparent;
}
.tip-bar .cta {
  margin-left: auto;
  padding: 10px 18px; border-radius: 999px;
  background: var(--ink); color: var(--bg);
  font-size: 13px; font-weight: 500;
}

.profile-tabs {
  display: flex; gap: 4px; margin-top: 24px;
  border-bottom: 1px solid var(--line);
}
.profile-tabs .tab {
  padding: 10px 2px 12px; margin-right: 20px;
  font-size: 13px; color: var(--ink-3);
  border-bottom: 1.5px solid transparent;
  cursor: pointer;
  transition: color 0.2s var(--ease);
}
.profile-tabs .tab.active { color: var(--ink); border-color: var(--ink); }
.profile-tabs .tab:hover { color: var(--ink); }

.feed { margin-top: 16px; }
.feed-item {
  display: flex; gap: 12px; align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.feed-item:last-child { border-bottom: 0; }
.feed-item .txt { flex: 1; font-size: 13px; color: var(--ink-2); }
.feed-item .txt .strong { color: var(--ink); }
.feed-item .amt { font-family: var(--mono); font-size: 13px; color: var(--ink); }
.feed-item .t { font-family: var(--mono); font-size: 10.5px; color: var(--ink-4); }

/* Scoped overrides for linktree variant */
.linktree { max-width: 560px; margin: 0 auto; }
.linktree .profile-body { padding: 60px 28px 28px; }
.lt-link {
  display: block; padding: 14px 18px;
  border: 1px solid var(--line); border-radius: 12px;
  background: var(--surface); color: var(--ink);
  font-size: 14px; text-align: center;
  transition: all 180ms ease;
  cursor: pointer; text-decoration: none;
}
.lt-link:hover { border-color: var(--ink-3); transform: translateY(-1px); background: var(--surface-2); }
.linktree .feed-item { text-align: left; }
```

**Tokens used**: `--surface`, `--line`, `--r-4`, `--bg-2`, `--bg`, `--line-2`, `--ink-2`, `--mono`, `--ink-3`, `--ink-4`, `--surface-2`, `--surface-3`, `--ink`, `--ease`, `--accent`, `--accent-ink`. Cover gradient uses `rgba(108,123,255,0.35)` (accent) and `rgba(154,165,255,0.2)` (≈accent-2).

**Interactions / animations**: tip-bar chips hover (surface-3). Active tab underline. lt-link hover lifts 1px and changes border. Tabs/feed/lt-link transitions all 180–200ms ease.

**Variants**: `.linktree` is the centered variant of `.profile-wrap` shown here (max-width 560 instead of 640, profile-body padding 60px top instead of 0). `.profile-head` is configured column-flex via inline styles for centering. `.chip.accent` is the highlighted preset (filled accent). Plain `.chip` is outlined surface-2.

**Notes**: The verification SVG is a custom 12-pointed star with an inset checkmark — not Twitter's classic blue check. Cover uses two layered ellipse radial gradients on top of `--bg-2`. Avatar gets oversized (104×104) with inline overrides on the standard `.avatar.xl` (56×56 base). The label class (`TIPPED`/`SUBSCRIBERS`/`FOLLOWERS`/`TIP MIRA`) inherits from `.tip-bar .label` and `.ds-card .lbl` style families — only `.tip-bar .label` is defined; the `.lt-stats` reuses it implicitly because it's nested inside `.profile-body` but actually `.label` rule scoped to `.tip-bar` won't apply to standalone `<div class="label">` outside it. The standalone `.label` markup in the stats row (`TIPPED`) gets no styling from the rule — it inherits body text styles only. (Worth noting for a port: this `.label` styling depends on the `.tip-bar` ancestor selector or you'll need a generic `.label` rule.)

---

## Philosophy3Col

**Purpose**: 3-column principle grid with hairline divider gutters.

**Source lines**: 1610–1635; CSS 922–950.

**HTML structure**:
```html
<section class="slab shell">
  <div class="section-head reveal">
    <div>
      <div class="eyebrow" style="margin-bottom: 16px;">04 · Philosophy</div>
      <h2 class="section-title"><span class="muted">The restraint</span> is the product.</h2>
    </div>
  </div>

  <div class="philos reveal">
    <div>
      <div class="n">/ 01</div>
      <div class="h"><span class="serif">Quiet</span> by default.</div>
      <div class="p">Crypto apps shout numbers. Messengers ignore money. Ori does neither. Every chrome element waits until it's needed.</div>
    </div>
    <div>
      <div class="n">/ 02</div>
      <div class="h"><span class="serif">Fast</span> enough to feel native.</div>
      <div class="p">100ms settlement is not a feature bullet — it's the only reason in-chat payments stop feeling bolted on. Without it, this UI would be a lie.</div>
    </div>
    <div>
      <div class="n">/ 03</div>
      <div class="h">Built to <span class="serif">hand off</span>.</div>
      <div class="p">Non-custodial. Open identity. Export your wallet any time. Agents speak a standard protocol. Nothing we do locks you in.</div>
    </div>
  </div>
</section>
```

**Key CSS rules**:
```css
.philos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: var(--r-4);
  overflow: hidden;
  background: var(--line);
}
@media (max-width: 720px) {
  .philos { grid-template-columns: 1fr; }
}
.philos > div {
  background: var(--bg);
  padding: 36px 28px;
}
.philos .n {
  font-family: var(--mono); font-size: 11px;
  color: var(--ink-4); letter-spacing: 0.1em;
  margin-bottom: 14px;
}
.philos .h {
  font-size: 20px; letter-spacing: -0.02em;
  line-height: 1.2; margin-bottom: 10px;
  font-weight: 400;
}
.philos .h .serif { font-style: italic; }
.philos .p { font-size: 13.5px; color: var(--ink-2); line-height: 1.55; }
```

**Tokens used**: `--line`, `--r-4`, `--bg`, `--mono`, `--ink-4`, `--ink-2`.

**Interactions / animations**: `.reveal` on the parent; no per-cell hover.

**Variants**: none. `.h` accepts `.serif` italic span.

**Notes**: The hairline gutter trick — parent has `background: var(--line)`, children have `background: var(--bg)` with `gap: 2px`, so the line shows through gutters. No internal vertical/horizontal rules to draw separately. Mobile collapses to single column. Section also uses `.section-head` with no sub paragraph and a `.muted` span in the title.

---

## DSGrid

**Purpose**: Design-system showcase — 4 cards (Type / Color / Radii / Motion).

**Source lines**: 1638–1689; CSS 952–1020.

**HTML structure**:
```html
<section class="slab shell" id="system">
  <div class="section-head reveal">
    <div>
      <div class="eyebrow" style="margin-bottom: 16px;">05 · System</div>
      <h2 class="section-title">The pieces that <span class="serif">make</span> the whole.</h2>
    </div>
    <p class="section-sub">
      Four primitives: type, color, radii, motion. Each one does one job, and does it the same way everywhere in the product.
    </p>
  </div>

  <div class="ds-grid reveal">
    <!-- Type -->
    <div class="ds-card type-sample">
      <div class="lbl">Type</div>
      <div class="size-xs">CAPTION · 11</div>
      <div class="size-sm">Body 13 — Geist regular</div>
      <div class="size-md">Subhead 18 — tight tracking</div>
      <div class="size-lg"><span class="serif">D</span>isplay 32</div>
    </div>

    <!-- Color -->
    <div class="ds-card">
      <div class="lbl">Color</div>
      <div class="swatches">
        <div class="swatch bg">bg</div>
        <div class="swatch surf">surf</div>
        <div class="swatch ink">ink</div>
        <div class="swatch acc">accent</div>
      </div>
    </div>

    <!-- Radii -->
    <div class="ds-card">
      <div class="lbl">Radii</div>
      <div class="radii">
        <div class="r"></div>
        <div class="r"></div>
        <div class="r"></div>
        <div class="r"></div>
      </div>
      <div class="size-xs" style="margin-top:16px;">4 · 10 · 16 · FULL</div>
    </div>

    <!-- Motion -->
    <div class="ds-card">
      <div class="lbl">Motion</div>
      <div class="motion-bar"></div>
      <div class="size-xs" style="margin-top:16px;">EASE · 0.2 0.7 0.2 1</div>
    </div>
  </div>
</section>
```

**Key CSS rules**:
```css
.ds-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 960px) { .ds-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .ds-grid { grid-template-columns: 1fr; } }

.ds-card {
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
}
.ds-card .lbl {
  font-family: var(--mono); font-size: 10.5px;
  color: var(--ink-4); letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.type-sample .size-xs { font-size: 11px; color: var(--ink-3); font-family: var(--mono); letter-spacing: 0.08em; text-transform: uppercase; }
.type-sample .size-sm { font-size: 13px; color: var(--ink-2); margin-top: 8px; }
.type-sample .size-md { font-size: 18px; color: var(--ink); margin-top: 8px; letter-spacing: -0.015em; }
.type-sample .size-lg { font-size: 32px; color: var(--ink); margin-top: 8px; letter-spacing: -0.03em; line-height: 1; }
.type-sample .serif { font-family: var(--serif); font-style: italic; color: var(--ink); }

.swatches { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.swatch {
  aspect-ratio: 2 / 1;
  border-radius: 8px;
  border: 1px solid var(--line);
  padding: 10px;
  display: flex; align-items: flex-end;
  font-family: var(--mono); font-size: 10px; color: var(--ink-2);
}
.swatch.bg { background: var(--bg); color: var(--ink-3); }
.swatch.surf { background: var(--surface-3); }
.swatch.ink { background: var(--ink); color: var(--bg); }
.swatch.acc { background: var(--accent); color: var(--accent-ink); }

.radii { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; align-items: end; }
.radii .r {
  aspect-ratio: 1 / 1;
  background: var(--surface-3);
  border: 1px solid var(--line-2);
  position: relative;
}
.radii .r:nth-child(1) { border-radius: 4px; }
.radii .r:nth-child(2) { border-radius: 10px; }
.radii .r:nth-child(3) { border-radius: 16px; }
.radii .r:nth-child(4) { border-radius: 999px; }

.motion-bar {
  height: 40px; position: relative;
  background: var(--surface-3); border-radius: 8px;
  overflow: hidden;
}
.motion-bar::after {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 30%;
  background: var(--accent); border-radius: 8px;
  animation: slide 2.4s var(--ease) infinite;
}
@keyframes slide {
  0% { transform: translateX(0%); width: 20%; }
  50% { transform: translateX(250%); width: 20%; }
  100% { transform: translateX(0%); width: 20%; }
}
```

**Tokens used**: `--surface`, `--line`, `--r-3`, `--mono`, `--ink-4`, `--ink-3`, `--ink-2`, `--ink`, `--serif`, `--bg`, `--surface-3`, `--accent`, `--accent-ink`, `--line-2`, `--ease`.

**Interactions / animations**: `slide` keyframe animates the motion-bar `::after` (translateX 0→250%, 2.4s ease, infinite — easing matches the showcased curve `(0.2, 0.7, 0.2, 1)`).

**Variants**: 4 fixed cards per the demo. Swatch variants `.bg`, `.surf`, `.ink`, `.acc`. Radii children use `:nth-child` for 4 different border-radius values.

**Notes**: Three responsive breakpoints (4 → 2 → 1 col). Type card uses 4 stacked sizes with 8px top margins between them. Motion bar effectively shows the easing curve in motion. The `.size-xs` class is defined under `.type-sample` but reused inside other ds-cards via a child selector miss — actually the style is `.type-sample .size-xs` so the standalone `.size-xs` in Radii/Motion cards inherits nothing. The visible "4 · 10 · 16 · FULL" and "EASE · 0.2 0.7 0.2 1" therefore render as default body text, not the styled mono caption. (Port hint: declare `.size-xs` as a top-level rule if you want it to apply outside `.type-sample`.)

---

## Footer

**Purpose**: Multi-column footer — brand+blurb, three link columns (Product/Developers/Legal), bottom bar with version + status indicator.

**Source lines**: 1691–1738; CSS 1022–1050, 1056–1061.

**HTML structure**:
```html
<footer class="foot shell">
  <div class="scrim-divider" style="margin-bottom: 56px;"></div>
  <div class="foot-grid">
    <div>
      <a href="#top" class="brand" style="margin-bottom: 16px;">
        <span class="brand-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="1.25"/>
            <circle cx="12" cy="12" r="5" fill="currentColor"/>
          </svg>
        </span>
        <span class="brand-name"><span class="serif">O</span>ri</span>
      </a>
      <p class="mono-n">
        Ori is a chat app where your friends, your funds, and your AI agents live on
        the same screen. Built on Initia.
      </p>
    </div>
    <div>
      <h4>Product</h4>
      <ul>
        <li><a href="#capabilities">Capabilities</a></li>
        <li><a href="#flow">Flow</a></li>
        <li><a href="#profile">Creators</a></li>
        <li><a href="#system">System</a></li>
      </ul>
    </div>
    <div>
      <h4>Developers</h4>
      <ul>
        <li><a href="#">Agent SDK</a></li>
        <li><a href="#">MCP server</a></li>
        <li><a href="#">Paywall API</a></li>
        <li><a href="#">GitHub</a></li>
      </ul>
    </div>
    <div>
      <h4>Legal</h4>
      <ul>
        <li><a href="#">Privacy</a></li>
        <li><a href="#">Terms</a></li>
        <li><a href="#">Keys</a></li>
      </ul>
    </div>
  </div>
  <div class="foot-bottom">
    <span>© 2026 Ori Labs — All quiet.</span>
    <span>v 0.1 · <span style="color:var(--ok)">●</span> all systems green</span>
  </div>
</footer>
```

**Key CSS rules**:
```css
footer.foot {
  border-top: 1px solid var(--line);
  padding: 56px 0 40px;
}
.foot-grid {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 32px; margin-bottom: 44px;
}
@media (max-width: 720px) { .foot-grid { grid-template-columns: 1fr 1fr; } }

.foot h4 {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-3);
  margin: 0 0 14px; font-weight: 500;
}
.foot ul { list-style: none; margin: 0; padding: 0; }
.foot li { padding: 4px 0; font-size: 13px; color: var(--ink-2); }
.foot li a:hover { color: var(--ink); }
.foot .mono-n {
  font-size: 13px; color: var(--ink-3); line-height: 1.6; max-width: 36ch;
}
.foot-bottom {
  padding-top: 24px;
  border-top: 1px solid var(--line);
  display: flex; justify-content: space-between; align-items: center;
  font-family: var(--mono); font-size: 11px; color: var(--ink-4);
  gap: 16px; flex-wrap: wrap;
}

.scrim-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--line-3), transparent);
  max-width: 600px;
  margin: 0 auto;
}
```

**Tokens used**: `--line`, `--mono`, `--ink-3`, `--ink-2`, `--ink`, `--ink-4`, `--line-3`, `--ok`.

**Interactions / animations**: hover lightens link color. The status dot uses inline `style="color:var(--ok)"` (no pulse here — unlike HeroTag).

**Variants**: 4-column desktop grid (2fr/1fr/1fr/1fr) collapses to 2-col below 720px. The brand here gets inline `margin-bottom: 16px`.

**Notes**: `.scrim-divider` is a centered 600px-wide hairline that fades in from both ends — used as a visual section break above the footer-grid. Bottom row uses `font-family: var(--mono)` for that "system console" feel. No hover state defined for the brand link in footer.

---

## Token Reference (for builders)

```css
:root {
  /* SURFACE */
  --bg:         #07070a;
  --bg-2:       #0b0b10;
  --surface:    rgba(255, 255, 255, 0.022);
  --surface-2:  rgba(255, 255, 255, 0.04);
  --surface-3:  rgba(255, 255, 255, 0.07);
  --line:       rgba(255, 255, 255, 0.06);
  --line-2:     rgba(255, 255, 255, 0.1);
  --line-3:     rgba(255, 255, 255, 0.16);

  /* INK */
  --ink:        #f4f4f6;
  --ink-2:      rgba(244, 244, 246, 0.62);
  --ink-3:      rgba(244, 244, 246, 0.38);
  --ink-4:      rgba(244, 244, 246, 0.22);

  /* ACCENT */
  --accent:     #6c7bff;
  --accent-2:   #8a95ff;
  --accent-ink: #0a0a12;

  /* SEMANTIC */
  --ok:         #6bd0a3;
  --warn:       #e8b472;

  /* TYPE */
  --sans:   "Geist", ui-sans-serif, ...;
  --serif:  "Instrument Serif", ui-serif, Georgia, serif;
  --mono:   "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;

  /* SPACE / RHYTHM */
  --r-1: 6px; --r-2: 10px; --r-3: 14px; --r-4: 20px; --r-5: 28px; --r-6: 40px;
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 72px; --s-9: 120px;

  /* MOTION */
  --ease:      cubic-bezier(0.2, 0.7, 0.2, 1);
  --ease-out:  cubic-bezier(0.16, 1, 0.3, 1);
  --spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Body has two layered fixed pseudo-backgrounds (`::before` indigo radial gradients, `::after` star-dot field at `background-size: 1400px 900px; opacity: 0.7`). All content sits inside `.shell` (max-width 1320px, padding clamp 16–32px).

`.reveal` on any element triggers a fade-up via IntersectionObserver (rootMargin `-80px` bottom, threshold 0.05) — adds `.in` once visible. Transitions are `opacity 0.9s ease-out, transform 0.9s ease-out`.

---

## NOT FOUND IN REFERENCE

None. Every component on the requested list is present in `Ori-landing.html` and catalogued above.
