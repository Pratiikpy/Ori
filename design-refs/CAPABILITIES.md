# CAPABILITIES — toolbelt inventory for the rebuild

Per §07. This is what's available and how it's used.

## Skills (Claude Code)

The single most authoritative skill for this rebuild is **`frontend-design`**
(`/mnt/skills/frontend-design/SKILL.md`). It encodes layout discipline,
typography rhythm, alignment, restraint conventions, and design-token
hygiene. **MUST be loaded before any code is written in Phase 3.**

Adjacent skills consulted as needed:

| Skill | Use |
|---|---|
| frontend-design | Layout, typography, alignment, restraint patterns |
| init | Repo bootstrap reference (existing) |
| review / code-review / pr-review-toolkit | Final pre-merge passes |
| security-review | Pre-deploy paranoia |

## Sub-agent types (Task tool)

| Type | Best fit |
|---|---|
| `Explore` | Wide / fast codebase searches in Phase 1 (current state audit) |
| `Plan` | Architecture and IA sketches |
| `general-purpose` | Token extraction, content extraction, multi-step research |
| `feature-dev:code-architect` | Per-page implementation blueprints |
| `feature-dev:code-explorer` | Read existing AppShell / page files for context |
| `feature-dev:code-reviewer` | Per-PR quality bar pass |
| `pr-review-toolkit:code-reviewer` | Independent fidelity review |
| `pr-review-toolkit:silent-failure-hunter` | Catch swallowed runtime errors during verify |
| `pr-review-toolkit:type-design-analyzer` | Component-prop ergonomics |
| `gemini-research-expert` | External research only — not used here |

## Tooling on this machine

- **Node**: v22.17.1
- **pnpm**: 9.15.0 (workspace root)
- **Playwright**: 1.59.1 — installed at `design-refs/_tools/`, chromium binary at `~/AppData/Local/ms-playwright/`
- **Browsers**: chromium-1217 (verified), no firefox/webkit installed locally
- **Lighthouse**: install via `lighthouse@12` if needed; not yet present
- **axe-core**: install via `@axe-core/playwright` if needed; not yet present
- **Git / GitHub**: HTTPS to `https://github.com/Pratiikpy/Ori.git`, push works as Ritik200238

## MCP servers / plugins connected

- `claude.ai Ahrefs` — SEO data, not relevant here
- `claude.ai Google Drive` — not relevant
- No Figma / browser-screenshot MCP available; Playwright is the screenshot path.

## Constraints

- **OS**: Windows 11 / Git Bash. Some POSIX commands behave subtly differently.
- **Path**: `C:\Users\ritik\MINITIA` — clean, no special chars.
- **No `playwright` in `apps/web/node_modules/`**: pnpm workspace `workspace:*` protocol blocks `npm install` from the root. Tooling lives in `design-refs/_tools/` (regular npm, isolated `node_modules`).
- **Reduced-motion**: developer's machine; assume off.

## Authoritative skill — `frontend-design`

I load and cite this in BUILD-PLAN.md before Phase 3. The skill captures:

- One typography family per surface (Geist for sans, Instrument Serif for italic accent, Geist Mono for data)
- Token-only spacing, no arbitrary `text-[15px]`
- Hover whisper, not shout
- IntersectionObserver-based reveal-on-scroll
- Backdrop ambience as structural, not decorative
- Single accent color, used sparingly

These aren't bullet points to skim — they're the operating contract.
