# CHANGELOG — Ori frontend rebuild (v3 GOD MODE)

Per §06 / §20.

## 2026-04-25

### phase-0+1+2 (commit `ed?…`)
- Move references to `design-refs/source/` (Ori-landing.html, Ori_-_standalone.html)
- Render reference at 1440/820/375 → `source-shots/` (6 PNGs)
- Capture deployed app same viewports → `audit-current/` (63 PNGs)
- 7 parallel sub-agents wrote: TOKENS.md, COMPONENTS.md, AUDIT-CURRENT.md (206 defects), GAPS.md (142 gaps, 41 P0), IA.md, CONTENT.md, ASSETS.md
- DECISIONS.md: 19 decisions, including 16-on-/capabilities + 18-on-/system
- BUILD-PLAN.md: 6 sub-phases, target file structure, LOC budgets

### phase-3 (commit `43d3df1`)
- Built 18 landing primitives: Hero, StatsRibbon, CapabilitiesGrid, FlowStage,
  WinChats, WinThread, WinSend, CreatorProfile, Philosophy, SystemGrid +
  7 icons (OriMark, ArrowIcon, NetworkSVG, SendArrowIcon, SearchIcon,
  MailIcon, MoreDots) + index
- Rewrote landing `/` from 1226 lines → 156 (composition only)
- Rewrote 4 marketing pages: `/capabilities`, `/flow`, `/creators`, `/system`
- All from-reference, italic-serif accents per CONTENT.md, OS-window
  chrome verified, backdrop-stars active
- 41 routes built clean

### phase-4 (commit pending)
- Wrote `audit-final.mjs`, captured 63 PNGs of post-rebuild deploy → `audit-final/`
- Wrote `verify.mjs`, ran axe-core: 2 violations × 5 routes (meta-viewport critical, color-contrast serious)
- Wrote `perf.mjs`, ran Lighthouse mobile: Perf 35–45, A11y 86–91, LCP 11–17s
- Fixed: `viewport` meta no longer locks scale; `--ink-3` bumped 0.38 → 0.50 for AA
- Wrote VERIFY.md (per-component pass/fail), A11Y.md (axe raw), PERF.md (LH raw), DEBT.md (P2 ownership)

### phase-5 (next)
- Verify all keyframes still running after AA fix
- Verify reduced-motion still honored
- Print stylesheet
- Re-run Lighthouse to confirm A11y bump

### phase-6 (next)
- 5 critic personas: Linear design, Stripe FE, Apple mobile, WebAIM a11y, Vercel perf
- Synthesize CRITIQUE.md
- Address P0/P1 → DEBT.md gets P2 with owner+date

## Artifact checklist

```
✓ design-refs/source/Ori-landing.html
✓ design-refs/source/Ori_-_standalone.html
✓ design-refs/source-shots/{landing,standalone}-{desktop,tablet,mobile}.png (6)
✓ design-refs/CAPABILITIES.md
✓ design-refs/INVENTORY.md
✓ design-refs/TOKENS.md
✓ design-refs/COMPONENTS.md
✓ design-refs/AUDIT-CURRENT.md + audit-current/*.png (63)
✓ design-refs/GAPS.md
✓ design-refs/IA.md
✓ design-refs/CONTENT.md
✓ design-refs/ASSETS.md
✓ design-refs/DECISIONS.md
✓ design-refs/BUILD-PLAN.md
✓ design-refs/audit-final/{slug}-{viewport}.png (63)
✓ design-refs/VERIFY.md
✓ design-refs/A11Y.md
✓ design-refs/PERF.md
✓ design-refs/DEBT.md
✓ design-refs/CHANGELOG.md
✗ design-refs/CRITIQUE.md (Phase 6 next)
✗ design-refs/BLOCKERS.md (none yet)
```
