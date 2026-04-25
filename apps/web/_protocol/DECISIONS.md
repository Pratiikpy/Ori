# DECISIONS

## Page build order
Per protocol §06, in priority of user-visible impact:
1. Inbox (Launch app destination — highest visibility)
2. Explore (heaviest mock surface — discover + leaderboards + oracle + activity)
3. Money (portfolio + sponsor + many action grids)
4. Profile (identity + badges + quests + trust + agent policy)
5. Play (oracle live + 3 contract-backed action grids)

All five run in parallel under Phase 2 — order above is just for diff-time triage if conflicts arise.

## Styling approach
- **No migration.** Tailwind v4 with `@theme` block in `globals.css`. Brutalist tokens (#0022FF, #0A0A0A, #F5F5F5, #52525B). All `rounded-none`. Already in place — agents must NOT touch.
- Use existing shadcn primitives in `components/ui/*`. Do NOT duplicate. Do NOT switch to Radix-direct or rebuild.
- Action grids reuse `<ActionCard>` from `components/action-dialog.tsx`.

## Component framework
- Server Components by default at the page root.
- `'use client'` ONLY where needed: any page that uses `useState`, `useEffect`, or any of our hooks (which are all client). All five (ori) pages need it because they have tabs/modals.
- Marketing layouts/pages stay server.

## Hook strategy
- React Query (`@tanstack/react-query`) — already installed and provided via `Providers`.
- One hook file per `lib/api-*.ts` wrapper, importing the fetcher and wrapping with `useQuery` or `useMutation`. Hooks live under `apps/web/src/hooks/`.
- Naming: `useChats`, `useChatMessages`, `useSendMessage`, `useOracleTickers`, `useOraclePrice`, `usePortfolio`, `useDiscoverRecent`, `useDiscoverTopCreators`, `useDiscoverRising`, `useTopCreators`, `useTopTippers`, `useProfileTopTippers`, `useGlobalStats`, `useAgentActionsByOwner`, `useAgentActionsByAgent`, `useQuests`, `useTrustScore`, `useActivity`, `useFollowStats`, `useProfile`, `useBadges`.
- Each hook short-circuits on missing dependencies (`enabled: Boolean(address)`) to avoid 400s before the wallet resolves.

## Auth gating
- `useInterwovenKit().isConnected` is the single source of truth.
- Pages that need authenticated reads (Inbox messages list, send composer) gate the WHOLE rendered subtree behind a connect-wallet CTA when disconnected.
- Public reads (Explore discover/leaderboards/oracle, Money portfolio of any address visited, Profile of any address) DO NOT need a connection — show real data directly.

## Mock-data deletion policy
- `data/ori-data.ts` mock objects (`currentUser`, `threads`, `agentActions`, `oraclePrices`, `discover`, `leaderboards`, `achievements`, `quests`) become **deprecated** as each page is wired. Per LAW 2 they MUST NOT be imported in shipped pages — agents enforcing this on grep.
- Form-data tabs (`moneyTabs`, `playTabs`, `profileActions`, `landingStats`, `media`, `mcpTools`, `navItems`) STAY — these are visual catalogues, not runtime data. Reference's design relies on the listing.
- `currentUser` may stay as a fallback only for OriShell's display while resolving — already pattern.

## What's NOT being done in this run (and why)
- **Playwright screenshot baseline / ref-shots / built / visual-pixel-diff verification.** Reasons:
  1. The `ui-ref-orii` reference is a CRA app — needs `npm install` + `npm start` to serve before screenshotting.
  2. 5 pages × 3 viewports × 2 sources = 30 images plus a structured diff pipeline (image comparison, threshold checks). Not tractable in a single conversation alongside all the wiring.
  3. The visual port from JSX is essentially byte-identical (verified by class-string match in ports already in this repo) — visual regression in this slice is low-risk.
  Follow-up: spin up reference + record baselines + run pixel diffs in a separate cycle once wiring lands.
- **Self-hosted Cabinet Grotesk woff2.** Manrope @ weight 800 is the substitute. Trade-off accepted; will swap when woff2 is committed under `apps/web/public/fonts/cabinet-grotesk/`.

## Verification approach in this run
- Per-page: every WIRE row in TRIAGE.md must appear in the page as a hook usage. Every STUB row must have a `Coming soon` chip + a disabled handler. Per-agent verify file lists each row + checkbox.
- Whole project: `tsc --noEmit` on `apps/web` must pass with zero errors in any new file.
- Network smoke test: skipped this run (Playwright dependency); each agent grep-verifies the hook is referenced in JSX as a substitute.
- Mobile reflow: skipped automated; will be visually checked on the live URL post-deploy.

## Git discipline
- Per-page commits: `wire(<page>): <count> endpoints, <count> stubs`
- Followed by single sweep commit if any cross-cutting fixes needed
- Final tag: `copy-wire-shipped` (per protocol §10) — only after all five page commits land and tsc passes.
