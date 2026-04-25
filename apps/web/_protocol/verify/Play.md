# Play — verify

Page: `apps/web/src/app/(ori)/play/page.tsx`
Reference: `ui-ref-orii/frontend/src/pages/Play.jsx`
Triage: see `_protocol/TRIAGE.md` § Play (all rows WIRE except `predict-price` STUB).

## Row coverage

| Row | Backend | Status | Source |
|---|---|---|---|
| Intro card copy | static | KEEP | unchanged |
| Slinky live oracle (top 3) | `useOraclePrices(['BTC/USD','ETH/USD','SOL/USD'])` + `formatOraclePrice` | WIRE | `hooks/use-oracle.ts`, `lib/api-oracle.ts` |
| Wagers tab — 9 actions | `wager_escrow.move` helpers | WIRE | `lib/contracts.ts` |
| Prediction markets — 5 actions | `prediction_pool.move` helpers | WIRE | `lib/contracts.ts` |
| Prediction markets — `predict-price` (AI predict) | none — MCP tool only | STUB (toast "Coming soon — AI predict via MCP") | n/a |
| Lucky pools — 3 actions | `lucky_pool.move` helpers | WIRE | `lib/contracts.ts` |
| Recent-action toast row | local state | KEEP | unchanged |

## action.id → msg-helper map

### Wagers (`wager_escrow.move`)

| action.id | helper | sender | notes |
|---|---|---|---|
| `propose-wager` | `msgProposeWager` | `initiaAddress` | accepter ← "Opponent or market"; claim ← "Terms"; amount ← "Stake" |
| `propose-pvp-wager` | `msgProposePvpWager` | `initiaAddress` | same parse + category="general" + 24 h deadline |
| `accept-wager` | `msgAcceptWager` | `initiaAddress` | wagerId parsed from "Opponent or market" |
| `resolve-wager` | `msgResolveWager` | `initiaAddress` (arbiter) | wagerId ← "Opponent or market"; winner ← "Terms" |
| `concede-wager` | `msgConcedeWager` | `initiaAddress` (loser) | wagerId ← "Opponent or market" |
| `cancel-pending-wager` | `msgCancelPendingWager` | `initiaAddress` (proposer) | wagerId ← "Opponent or market" |
| `refund-expired-wager` | `msgRefundExpiredWager` | `initiaAddress` (caller) | wagerId ← "Opponent or market" |
| `propose-oracle-resolved-wager` | `msgProposeOracleWager` | `initiaAddress` | accepter ← "Opponent or market"; oraclePair ← "Terms" (default `BTC/USD`); amount ← "Stake" |
| `resolve-from-oracle` | `msgResolveFromOracle` | `initiaAddress` (caller) | wagerId ← "Opponent or market" |

### Prediction markets (`prediction_pool.move`)

| action.id | helper | sender | notes |
|---|---|---|---|
| `create-market` | `msgCreatePredictionMarket` | `initiaAddress` | oraclePair ← "Resolution source" (default `BTC/USD`); deadlineSeconds ← "Deadline" if numeric, else now+24 h |
| `stake-yes` | `msgStakePrediction({ sideYes: true })` | `initiaAddress` | marketId ← "Market ID"; amount ← "Amount" |
| `stake-no` | `msgStakePrediction({ sideYes: false })` | `initiaAddress` | marketId ← "Market ID"; amount ← "Amount" |
| `resolve-market` | `msgResolvePrediction` | `initiaAddress` | marketId ← "Market ID"; "Outcome" field unused (oracle resolves on-chain) |
| `claim-winnings` | `msgClaimPredictionWinnings` | `initiaAddress` | marketId ← "Market ID"; "Claim address" unused |
| `predict-price` | **STUB** | n/a | toast `"Coming soon — AI predict via MCP"` |

### Lucky pools (`lucky_pool.move`)

| action.id | helper | sender | notes |
|---|---|---|---|
| `create-lucky-pool` | `msgCreateLuckyPool` | `initiaAddress` | entryFee ← "Entry fee"; maxParticipants ← "Participants" |
| `join-lucky-pool` | `msgJoinLuckyPool` | `initiaAddress` (participant) | poolId ← "Pool ID"; "Entry wallet" unused |
| `draw-winner` | `msgDrawLuckyPool` | `initiaAddress` (caller) | poolId ← "Pool ID"; "Randomness proof" unused |

## Field-parsing gaps

The reference `playTabs` action grid uses generic 3-field schemas
(`fields.wager = ["Opponent or market", "Terms", "Stake"]` for every wager
action). The msg helpers expect richer arg sets. For each gap, the page applies
a sane default and the gap is documented here so the form can be evolved later.

| Gap | Where | Default applied |
|---|---|---|
| Arbiter address | `propose-wager` | self (`initiaAddress`) |
| Category | `propose-pvp-wager`, `propose-oracle-resolved-wager` | `"general"` / `"oracle"` |
| Deadline | `propose-pvp-wager`, `propose-oracle-resolved-wager`, `create-market` | now + 24 h (unless `Deadline` field is numeric for `create-market`) |
| Wager ID is repurposed from "Opponent or market" | `accept-wager`, `resolve-wager`, `concede-wager`, `cancel-pending-wager`, `refund-expired-wager`, `resolve-from-oracle` | parsed numeric |
| Winner address ← "Terms" | `resolve-wager` | parsed verbatim |
| Oracle pair ← "Terms" | `propose-oracle-resolved-wager` | defaults to `BTC/USD` if blank |
| `targetPrice` / `comparator` | `propose-oracle-resolved-wager`, `create-market` | `0n` / `true` (placeholder; UI lacks input) |
| `oraclePair` ← "Resolution source" | `create-market` | defaults to `BTC/USD` |
| "Question" field | `create-market` | unused — Move module has no claim-string slot |
| "Outcome" field | `resolve-market` | unused — module reads oracle |
| "Claim address" | `claim-winnings` | unused — sender claims own winnings |
| "Draw time" | `create-lucky-pool` | unused — module has no scheduled-draw arg |
| "Entry wallet" | `join-lucky-pool` | unused — sender is the joiner |
| "Randomness proof" | `draw-winner` | unused — module supplies its own randomness |

## Verification gate

- [x] All WIRE rows have hook / msg-helper references (table above).
- [x] `predict-price` action shows `Coming soon` toast on submit.
- [x] No mock import of `oraclePrices` (only `playTabs` from `data/ori-data`).
- [x] `tsc --noEmit` clean for the file. (Remaining diagnostics in run output are stale `.next/types/validator.ts` references for every `(ori)/*` route group — pre-existing, not introduced by this change.)
- [x] Submission goes through `useAutoSign()` + `sendTx` (consistent with `app/(legacy)/squads/page.tsx`).

## Oracle card UX note

`/v1/oracle/price` returns price + decimals + block metadata but **no delta**.
The reference UI showed a static "+x.x%" string. The wired card replaces that
with a constant green "Slinky live" chip — the colour is preserved, the
percentage is dropped because the proxy doesn't expose it.

States:
- loading → animated skeleton bar
- error / no data → em-dash
- ok → `formatOraclePrice(p)` + "Slinky live" chip
