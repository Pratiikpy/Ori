# Explore — verify

Row-by-row trace of `apps/web/src/app/(ori)/explore/page.tsx` against `_protocol/TRIAGE.md` → Explore.

## Discover grid

| Feature | Decision | Hook | Status | Evidence (in page.tsx) |
|---|---|---|---|---|
| Discover: recent | WIRE | `useDiscoverRecent(8)` | wired | `const recent = useDiscoverRecent(8)` → mapped through `discoverSources` → `entryLabel(entry)` |
| Discover: top creators | WIRE | `useDiscoverTopCreators(8)` | wired | `const topCreators = useDiscoverTopCreators(8)` → same path |
| Discover: rising | WIRE | `useDiscoverRising(8)` | wired | `const rising = useDiscoverRising(8)` → same path |

Item label rule: `entry.initName ? \`${entry.initName}.init\` : \`${entry.address.slice(0, 10)}...\``. Empty state copy: `"No entries yet."`. Loading state: `"Loading…"`.

## Leaderboards tab

| Feature | Decision | Hook | Status | Evidence |
|---|---|---|---|---|
| Top creators | WIRE | `useTopCreators(10)` | wired | `lbCreators.data` → `<ol data-testid="leaderboard-creators">` |
| Top tippers | WIRE | `useTopTippers(10)` | wired | `lbTippers.data` → `<ol data-testid="leaderboard-tippers">` |
| Per-profile creator-tippers | WIRE (gated by connection) | `useProfileTopTippers(initiaAddress, 10)` | wired with disconnect copy | `!initiaAddress` branch shows `"Connect wallet to see your supporters"` (testid `leaderboard-creator-tippers-empty`); otherwise renders rows |

Connected address comes from `useInterwovenKit()` → `initiaAddress`.

## Oracle prices tab

| Feature | Decision | Hook | Status | Evidence |
|---|---|---|---|---|
| Oracle grid (5 pairs) | WIRE | `useOraclePrices(['BTC/USD','ETH/USD','SOL/USD','BNB/USD','ATOM/USD'])` | wired, live via `refetchInterval: 5_000` inside the hook | `ORACLE_PAIRS` × `ORACLE_IDS` map; `formatOraclePrice(data)` for the price; loading skeleton + error dash |

Replacement:
- Removed `useEffect` setInterval `tick`/`setTick`.
- Removed `livePrices` sin-drift mapping.
- Removed `oraclePrices` import from `@/data/ori-data`.
- Sub-label changed: `"live mock"` → `"Slinky live"`.

## Activity tab

| Feature | Decision | Implementation |
|---|---|---|
| Public activity feed | STUB | 4 reference rows kept verbatim as `title` attribute; visible text muted to `"Coming soon — public activity feed"`; `Coming soon` chip rendered in tab header (`data-testid="activity-coming-soon-chip"`). No drift, no animation. |

## Squads tab

ActionDialog (in `components/action-dialog.tsx`) is a toast-only simulator and the task constrains us from editing it. Therefore squad cards open a small in-file dialog that drives `useAutoSign` + `sendTx`. Documented per task: chose the **wrap-cards-with-custom-dialog** path. ActionDialog mount is preserved at the bottom of the page per the constraint.

| Action | Decision | Helper | Gas | Evidence |
|---|---|---|---|---|
| Create squad | WIRE | `msgCreateSquad({ leader, name })` | 500_000 | switch case `'create-squad'` → `sendTx(kit, { chainId: ORI_CHAIN_ID, messages: [msg], autoSign, fee })` |
| Join squad | WIRE | `msgJoinSquad({ member, squadId })` | 400_000 | case `'join-squad'`; rejects non-numeric IDs |
| Leave squad | WIRE | `msgLeaveSquad({ member, squadId })` | 400_000 | case `'leave-squad'` |
| Disband squad | WIRE | `msgDisbandSquad({ leader, squadId })` | 500_000 | case `'disband-squad'` |
| Transfer leadership | WIRE | `msgTransferSquadLeader({ leader, squadId, newLeader })` | 500_000 | case `'transfer-leadership'` |

Auto-sign source: `useAutoSign()` from `@/hooks/use-auto-sign` (reads chain-bound auto-sign for `ORI_CHAIN_ID`). Fee: `buildAutoSignFee(gas)` when auto-sign is on; otherwise leaves `fee` undefined and lets `sendTx` prompt. Errors → `friendlyError(err)` → `toast.error`.

Grep targets requested by the gate:
- `useAutoSign` — present (`const { isEnabled: autoSign } = useAutoSign()`).
- `sendTx(` — present (single call inside `submitSquadAction`).
- `msgCreateSquad`, `msgJoinSquad`, `msgLeaveSquad`, `msgDisbandSquad`, `msgTransferSquadLeader` — all imported from `@/lib/contracts` and reached by switch cases.

## Removed / dropped

| Item | Reason |
|---|---|
| `discover`, `leaderboards`, `oraclePrices` from `@/data/ori-data` | Replaced by real backend hooks; mock data no longer imported on this page. |
| `useEffect`/`setInterval`/`tick` drift | React Query `refetchInterval` in `useOraclePrices` provides live updates. |
| `livePrices` sin-based mapping | Same — no client-side simulation needed. |

## Type check

`./node_modules/.bin/tsc --noEmit` is clean for `src/app/(ori)/explore/page.tsx`. Pre-existing errors (Next.js `.next/types/validator.ts` referencing the old `/app/explore/page` path, `lib/crypto.ts`, `lib/keystore.ts`, `components/ui/input-otp.tsx`) are unrelated to this edit and were present before.
