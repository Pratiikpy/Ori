# Cross-page consistency

## Shared chrome
- `OriShell` (sidebar + topbar + mobile bottom nav) is the only chrome wrapping (ori) routes. Verified by `app/(ori)/layout.tsx` containing `<Providers><OriShell>{children}</OriShell></Providers>` and no per-page chrome inside the 5 inner pages.
- Brand mark: solid blue square with white "O" + heading "Ori" appears identical in `OriShell` (sidebar-brand-mark / sidebar-brand-name) and Landing (landing-brand-mark / landing-brand-name) — same Tailwind classes (`bg-[#0022FF] font-heading text-lg font-black text-white`).
- Topbar trust + agent-cap badges currently still mock — STUB chip explicitly carried in OriShell. Wired to `useTrustScore` is queued for follow-up.

## Component reuse
- `ActionCard` + `ActionDialog` from `components/action-dialog.tsx` is shared across Inbox (quick actions row), Money (every tab), Play (every tab), Profile (every tab). One type definition, no duplicated form code.
- Explore intentionally skips `ActionDialog` for the Squads tab and uses an in-file dialog so it can call `useAutoSign` directly without modifying `action-dialog.tsx`. Documented in `verify/Explore.md`.

## Mono numbers / handles
- Every page uses `font-mono` for addresses, balances, oracle prices, and message counts. Defined once in `globals.css` (`.font-mono { font-family: var(--font-mono), ui-monospace, monospace; }`).

## Mock-data import audit
Mock object imports forbidden in shipped pages (per LAW 2 / TRIAGE):
- `currentUser`, `threads`, `agentActions`, `authorizedAgents`, `oraclePrices`, `discover`, `leaderboards`, `achievements`, `quests`, `portfolio` — none should appear in (ori) page.tsx files.
- Verified: `grep -rn "from '@/data/ori-data'" apps/web/src/app/\\(ori\\)` returns ONLY `mcpTools` (Inbox, KEEP per triage), `media` + `moneyTabs` (Money, KEEP form-data), `playTabs` (Play, KEEP), `profileActions` (Profile, KEEP).
- Allowed static imports: `mcpTools`, `media`, `navItems`, `landingStats`, `moneyTabs`, `playTabs`, `profileActions` — all are catalogues / form-data, not runtime state.

## Commit-history note
The Inbox sub-agent and the Explore sub-agent ran in parallel and the Explore agent's commit (`65de490 wire(explore):...`) was rebased into the Inbox commit (`f106c73 wire(inbox):...`) due to a race in their respective `git pull --rebase` paths. The diff content is correct on `main` HEAD — Explore's full rewrite is present — but the commit message reads as Inbox-only. Future bisects on Explore changes should land on `f106c73`. No corrective rebase performed because the working tree is clean and a rewrite would require a force-push to main.
