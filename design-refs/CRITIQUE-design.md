# CRITIQUE — Ori rebuild vs `Ori-landing.html`

Audit shots: `design-refs/audit-final/*-desktop.png`
Reference: `design-refs/source-shots/landing-desktop.png`

Ranked. No softening. P0 = blocks ship. P1 = ship today after fix. P2 = polish debt.

---

## P0 — BLOCKING

### P0-01 — Backdrop is flat black. The brand atmosphere is gone.
Reference shows two diffuse radial gradients (warm lower-right, cool upper-left) plus a sparse star-dot field across all sections. Every audit shot (`home`, `capabilities`, `flow`, `creators`, `system`) is uniform `#07070a` with zero radial wash and zero stars. Without that, "Ori" reads like a generic crypto landing template, not a designed surface. This is the single most damaging fidelity loss.
Fix: port the body `radial-gradient(...)` stack and the dot-noise mask layer from `Ori-landing.html` `:root`/`body`.

### P0-02 — Hero title scale and rhythm are wrong.
Reference: `clamp(42px, 7.2vw, 104px)`, line-height 0.98, three lines breaking at "Messages /  that *move* / money." with the device sitting beside line 2.
Audit `home-desktop.png`: title is visibly smaller (reads ~72–78px at 1440), four lines, kerning loose, and "money." sits on its own line creating a fourth empty band. The headline no longer dominates the fold.
Fix: confirm the clamp + `letter-spacing: -0.045em` + `max-width: 14ch` are applied; the audit suggests `max-width` is missing or font-weight defaults to 500 instead of 400.

### P0-03 — Italic-serif accent placement is wrong/missing in multiple sections.
Mandatory rule: serif italic only on emphasis words. Audit shows:
- Home hero "move" — present but the serif weight looks bolder than reference (likely `font-style: italic` applied to Geist instead of Instrument Serif swap).
- Capabilities title "Sixteen primitives. *One* Conversation." — "One" is rendered upright sans, not italic-serif. Reference italicizes "One conversation."
- Flow title "Conversation to *settled*." — "settled" is sans italic in audit, must be Instrument Serif italic.
- Creators title "A profile, a tip jar, *and a stage*." — italic serif partially applied; "and a" appears upright.
- System title "The pieces that *make* the whole." — "make" looks like Geist italic, not Instrument Serif.
Fix: every `<span class="serif">` must compute to `font-family: var(--serif)` AND `font-style: italic`. Verify the Google Fonts link includes `Instrument+Serif:ital@1`.

### P0-04 — OS-window panel chrome missing on all `.cap-grid` and `.flow-stage` panels.
Reference: every panel has 3 traffic-light dots (red/amber/green ~10px circles) on the left, mono `/path/label` centered, and a mono right-aligned label. The chrome strip has a 1px bottom hairline.
Audit `capabilities-desktop.png`: panels have NO chrome bar. They are bare cards with body content only. This destroys the "OS surface" metaphor that the entire site is built around.
Audit `flow-desktop.png`: WinChats / WinThread / WinSend appear to have *partial* chrome (dots present) but the path label and right label are missing or barely visible. Inconsistent with home capabilities — must be unified.
Fix: render `.panel-chrome` for every `.panel` and `.window`. Reference markup is in `COMPONENTS.md`.

### P0-05 — Capabilities grid layout collapsed to flat 3-col.
Reference: top row is 1.4fr / 1fr (a wide hero panel + a square), then 3-col rows below with mixed spans. This creates the "primitives composing" rhythm.
Audit: every panel is identical width in a uniform 3-col grid, killing the visual hierarchy. The keypad panel and identity-network panel look the same size as a single-line "Daily caps" panel.
Fix: restore the explicit grid-template-columns + spans from `Ori-landing.html`.

### P0-06 — Stats ribbon numbers are not Geist Mono / not tabular.
Reference: `97 / 1 / 0 / e2e` rendered in Geist Mono 500, tabular-nums, letter-spacing -0.03em, with small `.sfx` units (ms / %).
Audit `home-desktop.png`: numbers `97`, `1`, `0`, `e2e` appear in Geist Sans, no `.sfx` units rendered, and the values look smaller than the reference ribbon. Tabular alignment failed.
Same defect in Creators stats row ($4,280 / 128 / 2.1k) — the dollar value looks proportional, not tabular.
Fix: apply `.mono` class with `font-feature-settings: "tnum"` and the `--mono` stack on every numeric.

### P0-07 — Flow section: phone mockup keypad missing.
Reference WinSend panel: giant `$16.20` mono number on top, 3×4 keypad grid (1–9, 0, ., backspace), Send CTA pill below.
Audit `flow-desktop.png`: I see the `$16.20` value but the keypad is partially rendered or extremely faint. The 3×4 keypad is the literal visual proof of "conversation to settled" — without it the section is gutted.
Fix: render `.keypad` with the 12 `.key` cells and the `.key.click` pointerdown scale animation.

### P0-08 — Creators profile: no avatar ring-pulse, no verified badge, no tip-bar chips.
Reference: 104px avatar with animated indigo `ring-pulse`, a small verified-tick SVG badge, then below the bio a tip-bar of `$1`, `$5` (accent), `$10`, `$25`, `Custom` chips and a Send tip button.
Audit `creators-desktop.png`: avatar present but no ring, no verified badge. The `$1 / $5 / $10 / $25 / Custom` chip row is absent — only the Linktree-style row links remain. This is the *primary creator interaction* and it's missing.
Fix: port `.tip-bar` markup + `.chip` styles + the `ring-pulse` keyframe.

---

## P1 — HIGH (fix today)

### P1-01 — Topbar lacks blurred saturate-1.4 backdrop.
Audit topbar reads as a solid bar with a hairline. Reference uses `backdrop-filter: blur(20px) saturate(1.4)` with a 86%→60% gradient, producing a frosted/translucent feel as content scrolls under.
Fix: apply the exact `.topbar` rules from `TOKENS.md`/`COMPONENTS.md`.

### P1-02 — Hero CTAs hover state too aggressive.
The brief says "no aggressive hover transforms." Reference btn-primary lifts only 1px (`translateY(-1px)`) and changes to pure white. Audit hover (visible faintly in screenshots — primary button looks pre-lifted) appears to be a permanent raised state with shadow. Restraint failure.
Fix: ensure `.btn-primary` baseline is `background: var(--ink); color: var(--bg);` and translate only on `:hover`.

### P1-03 — Pay-card in hero device is static / not entering with `card-in`.
Reference animates the `.pay-card` with the spring `card-in` keyframe (y:8 → 0, scale:0.96 → 1). Audit screenshot is static (single frame) but the card position and shadow show it's not using the IntersectionObserver `.reveal` gate either — it's probably rendered without the entry animation hookup.
Fix: keep the `@keyframes card-in` and the IO `.reveal` add-class wiring.

### P1-04 — Hero device shadow stack is wrong.
Reference: `0 80px 120px -40px rgba(108,123,255,0.25)` (indigo glow) + `0 40px 80px -20px rgba(0,0,0,0.6)` + 1px inset.
Audit: device looks like it has a black shadow only — no indigo cast, so the device feels disconnected from the warm/cool gradient backdrop. (Compounded by P0-01.)
Fix: apply the exact box-shadow stack from `TOKENS.md`.

### P1-05 — Section-head eyebrow numerals (`01 · Capabilities`, etc.) missing or wrong.
Reference: every section starts with a mono `01 · Capabilities` eyebrow above the section-title, in `--ink-3`. Audit shots show no eyebrows on Capabilities, Flow, Creators, or System. The numbered structure is invisible.
Fix: render `.eyebrow` for each `.section-head` with `01 · / 02 · / 03 · / 04 · / 05 ·`.

### P1-06 — Capabilities mock content shrunk to placeholders.
Reference: keypad panel shows `$42` with blinking cursor + 3×4 keypad. Identity panel shows an SVG network graph. Stream panel shows progress bar with `fill-up` animation. Daily-caps shows toggle switches.
Audit `capabilities-desktop.png`: every panel just shows headline + paragraph + a generic mono blob. The visual proofs are gone. This is "tell me your features in text" instead of "show me the product."
Fix: re-port the per-panel `.viz` mocks from the source HTML.

### P1-07 — Creators feed list items lack the avatar gradient + amount alignment.
Reference: each `.feed` row has a small gradient avatar circle (per-user color), text on the left, mono amount right-aligned, time stamp in `--ink-3`.
Audit: rows render but mono amounts don't right-align cleanly; some rows wrap inconsistently. Avatar gradients look monochromatic.
Fix: confirm `.feed-item` grid template `auto 1fr auto` and per-avatar `linear-gradient` styles.

### P1-08 — System page color/radii/motion swatches show as text, not swatches.
Reference System section: 4 cards with actual visual swatches (color chips, radius corner samples, type spec rows, easings demo).
Audit `system-desktop.png`: I see large monospace text blocks (file-tree style listings of token names) but the visual swatches are weak/absent — the color row in particular reads as a text legend rather than 6 actual color chips.
Fix: render `.swatch` divs with the actual `background: var(--bg)` etc., not labels.

### P1-09 — Footer "all systems green" pulsing dot missing.
Reference: bottom strip has a green `●` glyph with the same pulse halo as hero-tag, plus the `Built on bridged INIT. No token launch.` line.
Audit footer (visible in `capabilities-desktop.png` bottom strip): I see the column links and the "Launch the app" CTA, but the bottom status line is either truncated or not styled — no visible pulsing dot.
Fix: port the footer bottom strip with the second `.dot` instance.

### P1-10 — Capabilities grid copy variant: 16 vs 8 primitives.
Reference landing page shows 8 capability panels. Audit `capabilities-desktop.png` shows ~16 panels titled "Sixteen primitives. One Conversation." — this is content from the *standalone* file, not the landing.
Per `INVENTORY.md` line 121: "we anchor on `Ori-landing.html` for visual fidelity." The page has been built off the wrong source.
Fix: confirm with PM which version ships. If landing → reduce to 8 with the mixed grid (P0-05). If standalone → accept 16 but still apply mixed sizing and chrome.

### P1-11 — Flow section is missing the chats list (WinChats panel).
Reference flow-stage = 3 columns: WinChats (search + 6 chat rows) + WinThread (the conversation) + WinSend (keypad).
Audit `flow-desktop.png`: only WinThread + a partial WinSend visible. The leftmost WinChats panel with `⌘K` kbd, search row, 6 chat-item rows is absent.
Fix: render the full 3-window flow-stage.

### P1-12 — Hero device parallax disabled or too aggressive.
Reference uses `mousemove` with damped values gated by `matchMedia('(hover: hover)')` — a subtle 1–2deg tilt. Cannot verify from a still, but the device in the audit shot is dead-center and rigidly axis-aligned, suggesting the tilt is missing.
Fix: confirm the parallax script is wired and respects reduced-motion.

### P1-13 — `.reveal` IntersectionObserver not visibly applied.
The audit screenshots look fine because they're static, but if the `.reveal` opacity-0 → 1 + y:20 → 0 pattern isn't wired, the page has no entry choreography. Combined with the missing `card-in`, the page feels static.
Fix: wire the IO with threshold 0.15 + `rootMargin: -10% 0%`.

### P1-14 — Mono numbers in pay-card and `$16.20` lack tabular-nums.
The pay-card `$16.20` and Flow `$16.20` need `font-variant-numeric: tabular-nums` so digits don't shift. Visible jitter risk on dynamic values.
Fix: add `tabular-nums` to `.mono` class definition and verify it's applied.

---

## P2 — POLISH (debt; can ship)

### P2-01 — Brand mark italic "O" looks visually identical to "ri".
Reference: the `O` is wrapped in `<span class="serif">` so it renders Instrument Serif (slightly larger 19px vs 17px). Audit topbar: the `O` looks the same family/weight as `ri`. Compounded by P0-03 if Instrument Serif isn't loading.

### P2-02 — Nav link hover transition feels instant.
Reference: 0.2s `var(--ease)` cubic. Audit (inferred from styles): may be using default 150ms. Subjectively fine but inconsistent with token.

### P2-03 — Hero-tag pulse halo too tight.
Reference uses 4px → 8px box-shadow halo at 15% → 6% alpha. The audit halo looks like a flat ring with no breathing. Compounded by missing animation wiring.

### P2-04 — `hero-sub` line length too wide.
Reference caps at `52ch`. Audit hero-sub appears to extend ~70ch, making the supporting paragraph compete with the headline.

### P2-05 — Capabilities panel `.h` headlines are 22px but appear smaller in audit.
Slight under-scaling of the `.h` class. Cosmetic; rhythm holds.

### P2-06 — Creators tip "Send tip" button outline visible but icon missing.
Reference includes a small send-arrow SVG inside the button. Audit shows text only.

### P2-07 — Footer 4-column grid: column gutters look uneven.
The Brand block + 3 link columns; the rightmost column appears to overflow into footer-bottom in `capabilities-desktop.png`. Likely a grid-gap regression.

### P2-08 — `.lt-link` row hover state probably missing.
Linktree-style rows in Creators should have a `--surface-2` hover. Cannot verify in still; flag for QA.

### P2-09 — Type stack fallback risk.
If `Instrument Serif` ital@1 fails to load, fallback is `ui-serif, Georgia` — Georgia italic looks substantially different and would compound P0-03. Add `font-display: swap` validation.

### P2-10 — Color tokens: `--accent` `#6c7bff` is barely visible on `$5` chip in any audit shot because the tip-bar is missing. Defer until P0-08 lands.

### P2-11 — Stats ribbon top + bottom 1px dividers look like single line in audit, not the ref's two distinct hairlines with 32px breathing room.

### P2-12 — System section "Boring choices, quietly assembled." lower headline appears to use Geist italic, not serif italic — same family of bug as P0-03 but cosmetic placement.

### P2-13 — Capabilities body paragraphs (`.p`) are at full ink, not `--ink-2` muted. Reduces hierarchy between headline and body inside each panel.

### P2-14 — Footer bottom strip text "© Ori — all quiet" italic-serif on "all quiet" is missing.

---

## Summary

This is a structural rebuild that captured the *information* of the reference but lost almost all of the *atmosphere*: no backdrop gradients, no OS-window chrome, no italic-serif emphasis (except hero), no tip-bar, no keypad, no animated entries, no mono numerals. It will read to a designer's eye as a content-complete wireframe with brand styling 50% applied.

P0 issues block ship. The flat backdrop alone (P0-01) takes the page from "designed" to "default dark template" — that's the headline failure.

Counts: P0 = 8 / P1 = 14 / P2 = 14
