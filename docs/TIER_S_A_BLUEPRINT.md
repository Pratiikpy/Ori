# Tier S + A Implementation Blueprint

> Generated 2026-04-18 for the final push before Initia hackathon submission.
> Source: code-architect agent analysis of the Ori codebase + Connect oracle live data.
> Target budget: ~6.5h Tier-S work + ~12h buffer for deploy/video/QA before submission.

---

## 1. Executive Summary — Sequence & Critical Path

**Do first (parallel, zero chain dependency):** S1 (positioning text) + S2 (nav + Ask stub). 65 min total.

**Critical path:** S3a (`prediction_pool.move`) is the blocker. Tests must pass then deploy (~15 min) before S3c (MCP tool) and S3d (frontend page) can proceed.

**Parallel track while S3 deploys:** S6 (`ori.discover_x402`) + S5 backend (weekly-stats endpoint). Both touch separate files.

**After on-chain deploy:** S3c + S3d + S4 + S5 frontend — can be done in any order, different files.

**End:** S7 is embedded in S1 (one README section). Tier-A items are post-submission.

---

## 2. Live Oracle Facts (verified 2026-04-18)

- Oracle module: `0x1::oracle` (initia_std)
- Query: `oracle::get_price(pair: String): (u256 price, u64 timestamp, u64 decimals)`
- API: `GET https://rest.testnet.initia.xyz/connect/oracle/v2/get_price?currency_pair=BTC/USD`
- Pair format: **short symbol** — `BTC/USD`, not `BITCOIN/USD` (doc example misleading)
- Decimals vary per pair: INIT=10, BTC=5, ETH=6 — frontend must scale dynamically
- Pairs available (66+): AAVE, ADA, ATOM, AVAX, BCH, BNB, BONK, BTC, COMP, DOGE, DOT, ETC, ETH, FET, FIL, INIT, INJ, LDO, LINK, LTC, MANA, MATIC, MKR, NEAR, OP, PEPE, PYTH, SEI, SHIB, SNX, SOL, STRK, SUI, TIA, TRX, UNI, USDT, WLD, XLM, XRP — all vs USD
- Rollup inherits feeds from initiation-2 via OPinit (enabled during `weave init`)

---

## 3. S1 — Positioning Rewrite (45 min)

### Files to edit

- `README.md`
- `.initia/submission.json`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/layout.tsx`

### README.md

**New H1:** `# Ori — the agent wallet for Initia.`

**Opening paragraph (replaces "iMessage meets Venmo"):**
> Ori is the agent wallet for Initia. Your `.init` is both your identity and your agent's identity. Let Claude spend your INIT — on tips, paywalls, predictions, and gifts — while you watch. Three agent protocols: MCP (stdio), A2A (JSON-RPC 2.0), x402 (HTTP 402). 16 Move modules on a MiniMove rollup settling to Initia L1 via OPinit. Zero wallet popups.

**Keyword "agent wallet"** must appear 5+ times. Natural placements:
- H1
- Opening paragraph
- Architecture section header
- Hackathon submission table
- What's New table
- Tokenomics section ("No speculation — agent wallet, not a meme coin")

**Remove all instances of "consumer super-app".** Replace with: "agent wallet" / "agent-native wallet" / "AI wallet for Initia" — pick whichever reads best in context.

**Insert S7 Roadmap section** (see §9) as a new `## Roadmap: Proactive Agents` after the existing "Agent-native" section.

### submission.json

```json
"tagline": "Let Claude spend your INIT.",
"pitch_140": "Ori is the agent wallet for Initia. Let Claude spend your INIT. 11 MCP tools + A2A + x402 on 16 Move modules. 100ms settle. .init identity.",
"pitch_500": "Ori is the agent wallet for Initia — the first wallet where an AI agent can find a paywalled post, buy it on-chain, and summarize it in one Claude prompt. 16 Move modules on a MiniMove rollup settling to Initia L1 via OPinit. 11 MCP tools + A2A JSON-RPC 2.0 + HTTP x402 paywall gate. Oracle-resolved predictions via Connect across 66+ pairs (INIT/BTC/ETH/SOL/DOGE/...). Encrypted chat. No token launch. INIT only."
```

### apps/web/src/app/page.tsx (landing)

- H1 (`text-5xl`): `The agent wallet for Initia.`
- Subtitle: `Let Claude spend your INIT. Tips, predictions, paywalls, gifts — all payable by any MCP-speaking AI. Your .init is your identity and your agent's identity. 100ms settle. Zero popups.`
- Feature trio labels: `Agent wallet` / `0-popup pay` / `Predict anything`
- Footer prefix: `Agent wallet for Initia · ` before existing text

### apps/web/src/app/layout.tsx

- `metadata.title`: `Ori — Agent Wallet for Initia`
- `metadata.description`: `The agent wallet for Initia. Let Claude spend your INIT.`
- `openGraph.title`: `Ori — Agent Wallet for Initia`

### Testing

`pnpm --filter @ori/web build` must pass. Visually QA the landing page.

### Rollback

`git revert`. Pure text. Zero risk.

---

## 4. S2 — Navigation Reorder (20 min)

### Files to edit

- `apps/web/src/components/bottom-nav.tsx` (modify)
- `apps/web/src/app/today/page.tsx` (create stub)
- `apps/web/src/app/ask/page.tsx` (create, full impl — zero chain deps)
- `apps/web/src/app/predict/page.tsx` (create stub; filled in S3d)

### bottom-nav.tsx changes

- Change `grid-cols-4` to `grid-cols-5`
- Replace `items[]` with:

```ts
import { Activity, Bot, TrendingUp, PlusCircle, MessageCircle } from 'lucide-react'

const items = [
  { href: '/today', label: 'Today', icon: Activity,
    match: (p: string) => p.startsWith('/today') },
  { href: '/ask', label: 'Ask Claude', icon: Bot,
    match: (p: string) => p.startsWith('/ask') },
  { href: '/predict', label: 'Predict', icon: TrendingUp,
    match: (p: string) => p.startsWith('/predict') },
  { href: '/send', label: 'Create', icon: PlusCircle,
    match: (p: string) => p.startsWith('/send') || p.startsWith('/gift') || p.startsWith('/paywall/new') },
  { href: '/chats', label: 'Friends', icon: MessageCircle,
    match: (p: string) => p.startsWith('/chat') || p.startsWith('/discover') },
]
```

Remove unused imports: `Compass`, `Send`, `UserIcon`.

### ask/page.tsx (full, static)

Two sections:
1. "Connect Claude to Ori" — code block showing `.mcp.json.sample` config with copy-to-clipboard button
2. "Try these prompts" — 5 tap-to-copy prompt cards (rounded border, `bg-muted/30`). Suggested prompts:
   - "Check my INIT balance and show me the top 3 creators on Ori."
   - "Find a paywalled post about oracles, buy it, tip the author 0.2 INIT."
   - "Open a 60-second prediction that BTC will rise. Stake 0.5 INIT."
   - "Send 0.1 INIT to alice.init with memo 'thanks'."
   - "Check if https://example.com/api supports x402 payment."

Closing paragraph about the agent-wallet narrative.

### today/page.tsx + predict/page.tsx stubs

Both render `<AppShell title="..."><div className="px-5 py-10 text-muted-foreground">Loading...</div></AppShell>`. Replaced in S4 and S3d respectively.

### Note on Profile tab

Profile access preserved via header avatar link — no regression.

---

## 5. S3 — Multi-Token 60-Second Predict (3–4 h)

### 5A. prediction_pool.move

**File:** `packages/contracts/sources/prediction_pool.move`
**Module:** `ori::prediction_pool`

#### Error codes

```move
const E_NOT_INITIALIZED: u64 = 1;
const E_MARKET_NOT_FOUND: u64 = 2;
const E_MARKET_ALREADY_RESOLVED: u64 = 3;
const E_DEADLINE_NOT_PASSED: u64 = 4;
const E_ZERO_STAKE: u64 = 5;
const E_INVALID_PAIR: u64 = 6;
const E_DEADLINE_TOO_SHORT: u64 = 7;
const E_ALREADY_CLAIMED: u64 = 8;
const E_NOT_RESOLVED: u64 = 9;
const E_NO_STAKE: u64 = 10;
```

#### Constants

```move
const MIN_DEADLINE_SECONDS: u64 = 30;
const PLATFORM_FEE_BPS: u64 = 100; // 1%
const BPS_DENOMINATOR: u64 = 10_000;
const MAX_PAIR_LEN: u64 = 64;
```

#### Struct layout

```move
struct MarketStore has key {
    next_id: u64,
    markets: Table<u64, Market>,
    user_stakes: Table<address, UserStakes>,
    vault_extend_ref: ExtendRef,
    vault_addr: address,
    treasury: address,
    admin: address,
    total_markets: u64,
    total_volume: u64,
}

struct Market has store, copy, drop {
    id: u64,
    creator: address,
    question: String,
    oracle_pair: String,
    target_price: u256,
    comparator: bool,          // true = ">=" wins YES
    resolve_deadline: u64,
    total_yes: u64,
    total_no: u64,
    denom: String,
    resolved: bool,
    outcome_yes: bool,
    resolved_price: u256,
    created_at: u64,
    fee_sent: bool,            // treasury fee sent exactly once (losing pool case)
}

struct UserStakes has store {
    by_market: Table<u64, SidedStake>,
}

struct SidedStake has store, copy, drop {
    yes: u64,
    no: u64,
}
```

#### Entry functions

**`create_market`:** validate `deadline_seconds >= MIN_DEADLINE_SECONDS`, validate pair len, compute `resolve_deadline = ts + deadline_seconds`, insert into table, emit `MarketCreated`. No coin transfer.

**`stake`:** validate `amount > 0`, market exists, `!resolved`, `ts < resolve_deadline`. `coin::transfer(user, vault_addr, metadata, amount)`. Increment `market.total_yes/no += amount`. Upsert `user_stakes[user][market_id]`. Emit `StakePlaced`.

**`resolve`:** permissionless after deadline. Reads `oracle::get_price(market.oracle_pair)` → `(price, _, _)`. Compute `outcome_yes = if comparator { price >= target } else { price < target }`. Set flags. Emit `MarketResolved`. Does NOT distribute.

**`claim_winnings`:**
- Validate market resolved.
- `winning_stake = if outcome_yes { sided.yes } else { sided.no }`
- Assert `winning_stake > 0` (aborts `E_NO_STAKE` if loser or no stake)
- Zero out the winning stake field (idempotency guard — second call sees 0, aborts)
- Compute payout:

```
losing_pool = if outcome_yes { total_no } else { total_yes }
winning_pool = if outcome_yes { total_yes } else { total_no }

if losing_pool == 0:
  fee = winning_stake * 100 / 10_000
  payout = winning_stake - fee
  treasury receives fee per-claim (no fee_sent flag needed)
else:
  fee_total = losing_pool * 100 / 10_000
  net_losers = losing_pool - fee_total
  user_share = (winning_stake * net_losers) / winning_pool
  payout = winning_stake + user_share
  if !market.fee_sent: transfer fee_total to treasury, set fee_sent = true
```

- Transfer `payout` to user via vault signer
- Emit `WinningsClaimed`

#### View functions

```move
get_market(id: u64): Market
get_user_stake(user: address, market_id: u64): (u64, u64)
calculate_potential_payout(market_id, side: bool, stake_amount: u64): u64
get_active_markets(limit: u64): vector<Market>  // cap at 20
total_markets(): u64
total_volume(): u64
vault_address(): address
```

#### 5 test outlines

Use a `#[test_only] fun resolve_with_price(caller, market_id, mock_price: u256)` that bypasses the real oracle call and sets outcome directly.

1. **happy_path_yes_wins**: alice stakes YES 1000, bob stakes NO 500. Resolve with price above target → YES wins. Alice claims. Fee=5, net_losers=495, alice_share=495, payout=1495. Assert balances.
2. **happy_path_no_wins**: same setup, resolve below target → NO wins. Bob claims 1490. Alice cannot claim (E_NO_STAKE).
3. **nobody_on_losing_side**: alice stakes YES 1000, nobody on NO. YES wins. Payout = 990 (fee 10). Treasury = 10.
4. **multi_staker_proportionality**: alice YES 2000, bob YES 1000, carol NO 1500. YES wins. Fee=15 (sent once on first claim). alice payout=2990, bob payout=1495, treasury=15 total.
5. **claim_twice_aborts**: after alice claims in test 1, second call aborts with `0x1000a` (error::invalid_argument(E_NO_STAKE)).

#### Deploy sequence

```bash
cd packages/contracts
minitiad move test --language-version=2.1 --named-addresses ori=0x05dd0c60873d4d93658d5144fd0615bcfa43a53a
# tests green
minitiad move deploy --build --language-version=2.1 \
  --named-addresses ori=0x05dd0c60873d4d93658d5144fd0615bcfa43a53a \
  --from gas-station --keyring-backend test \
  --chain-id ori-1 --yes

# after deploy
# 1. Add "prediction_pool" to .initia/submission.json modules[]
# 2. bash scripts/update-graph.sh
```

**Rollback:** Module is isolated — if bugged, disable the Predict tab in nav and skip. Other modules unaffected.

---

### 5B. ori.predict MCP tool

**File:** `apps/mcp-server/src/index.ts`

```ts
{
  name: 'ori.predict',
  description: 'Open a parimutuel prediction market on a token price. Creates a pool that anyone can join. You stake immediately on your predicted direction. Returns market ID.',
  inputSchema: {
    type: 'object',
    properties: {
      pair: { type: 'string', description: 'Token symbol only, e.g. "BTC", "INIT", "ETH". /USD appended automatically.' },
      duration_seconds: { type: 'number', description: 'Seconds until resolution. Min 30.' },
      direction: { type: 'string', enum: ['higher', 'lower'] },
      amount: { type: 'string', description: 'Stake in ORI, e.g. "0.5"' },
    },
    required: ['pair', 'duration_seconds', 'direction', 'amount'],
  },
}
```

Zod:
```ts
const PredictInput = z.object({
  pair: z.string().min(2).max(10),
  duration_seconds: z.number().int().min(30).max(86400),
  direction: z.enum(['higher', 'lower']),
  amount: z.string(),
})
```

Handler flow:
1. Fetch current oracle price from `${restUrl}/connect/oracle/v2/get_price?currency_pair=${pair}/USD` (use raw `price.price` as `BigInt` for target; `decimals` from response only for display)
2. Build `create_market` args with bcs encoding: `[string(pair/USD), u256(targetPrice), bool(direction==='higher'), u64(durationSeconds), string(denom)]`
3. `broadcastMoveCall('prediction_pool', 'create_market', args, 600_000)`
4. Parse market ID from `MarketCreated` event in tx receipt
5. Stake: `broadcastMoveCall('prediction_pool', 'stake', [u64(marketId), bool(direction==='higher'), u64(toBaseUnits(amount))], 400_000)`
6. Return text with market ID + stake tx hashes

---

### 5C. Predict frontend page + oracle proxy

**Files:**
- `apps/web/src/app/predict/page.tsx` (replace stub)
- `apps/web/src/lib/contracts.ts` (add 4 msg helpers)
- `apps/web/src/lib/api.ts` (add `getOraclePrice`)
- `apps/api/src/routes/oracle.ts` (new route file)
- `apps/api/src/server.ts` (register `oracleRoutes`)

**contracts.ts additions:** `msgCreatePredictionMarket`, `msgStakePrediction`, `msgResolvePrediction`, `msgClaimPredictionWinnings` — all follow existing `buildMsgExecute` pattern with `moduleName: 'prediction_pool'`.

**api.ts addition:** `getOraclePrice(pair: string)` calls the proxy.

**oracle.ts (new):** `GET /v1/oracle/price?pair=BTC%2FUSD` proxies to rollup REST; caches in Redis at `oracle:price:{pair}` with 2s TTL. Returns `{ pair, price: string, decimals: number, timestamp: string }`.

**predict/page.tsx state:** `selectedToken`, `duration` (60/300/3600/86400), `amount`, `livePrice`, `busy`.

**Layout:**
- Token picker: 5 chips (INIT/BTC/ETH/SOL/DOGE), horizontal scroll
- Live price display: large monospace; pulse dot if updated in last 3s; polls every 2s via `getOraclePrice`
- Duration selector: 4 buttons in `grid grid-cols-4` (60s / 5min / 1hr / 1day)
- Amount presets: 0.1 / 0.5 / 1 / 5 + text input
- Two giant buttons: **HIGHER** (green, `bg-success`) / **LOWER** (red, `bg-danger`)
- Active markets list: `oriRest.move.view(...'prediction_pool'...'get_active_markets', [], [bcs.u64('10')])` every 10s; cards show token symbol, direction, pool sizes, countdown
- Claim section: for each resolved market, check user stake via `get_user_stake`; show Claim button if user won

**`handlePredict` flow:**
1. Fetch current price (raw integer for target)
2. `sendTx(msgCreatePredictionMarket)` via `useInterwovenKit` + `buildAutoSignFee(600_000)`
3. Parse market ID from events (`extractMoveEventData(res.rawResponse, 'prediction_pool::MarketCreated')`)
4. `sendTx(msgStakePrediction)` with the market ID
5. Toast success

**Decimals safety:** raw oracle integer used for on-chain target; display-only scaling (`price / 10^decimals`) happens in React render. Never mix the two.

---

## 6. S4 — Today Tab / Activity Feed (1.5 h)

**File:** `apps/web/src/app/today/page.tsx` (replace stub)

Reuses existing `ActivityFeed` component and `getActivityFeed` endpoint — zero new API work here.

**Layout:**
1. `<WeeklyStats />` component (from S5) at top
2. Agent identity banner: card showing "Your agent: init1xxx..." from `NEXT_PUBLIC_MCP_SIGNER_ADDRESS`. If env not set, show "Configure your agent in Ask Claude." link to `/ask`.
3. `<ActivityFeed address={initiaAddress} agentAddress={agentAddress} />` — optional `agentAddress` prop, backward-compatible; when set, `ActivityRow` appends an "Agent" badge to entries where `fromAddr === agentAddress`.
4. Predictions section: separate `useEffect` queries markets user staked in. For resolved ones, show outcome + claim status.

**Auth guard:** same as `chats/page.tsx` — redirect on `!isConnected` or `!isAuthenticated`.

---

## 7. S5 — Weekly Summary + Tweet Button (1.5 h)

**Files:**
- `apps/api/src/routes/activity.ts` (add endpoint)
- `apps/web/src/lib/api.ts` (add `getWeeklyStats`)
- `apps/web/src/components/weekly-stats.tsx` (new)
- `apps/web/src/app/today/page.tsx` (import & render)

**New endpoint:** `GET /v1/profiles/:address/weekly-stats`

```ts
const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
const [paymentsOut, tipsGroup] = await Promise.all([
  prisma.paymentEvent.aggregate({
    where: { fromAddr: address, createdAt: { gte: since } },
    _sum: { amount: true }, _count: { id: true },
  }),
  prisma.tipEvent.groupBy({
    by: ['creatorAddr'],
    where: { tipperAddr: address, createdAt: { gte: since } },
    _sum: { grossAmount: true }, _count: { id: true },
    orderBy: { _sum: { grossAmount: 'desc' } }, take: 1,
  }),
])
```

Return `{ totalAgentSpend, agentTxCount, topCreatorTipped, tipsGiven7d, tipsGivenVolume7d, predictWins: 0, predictLosses: 0 }` — predict fields placeholder until event listener ships.

**weekly-stats.tsx:** horizontal scrolling pills: "X INIT sent" / "Y tips given" / "Top: name" / "W-L: 0-0"

**Tweet button:** opens `https://twitter.com/intent/tweet?text=...` URL-encoded template: `My @Ori_onInitia agent sent X INIT this week, tipped [topCreator], and opened [N] predictions. The agent wallet for @initia_xyz. ori.chat`

---

## 8. S6 — ori.discover_x402 (30 min)

**File:** `apps/mcp-server/src/index.ts`

```ts
{
  name: 'ori.discover_x402',
  description: 'Probe any HTTPS URL for x402 payment requirements. Returns whether the URL requires payment, and the X-Payment-* headers describing price, denom, recipient, and contract.',
  inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
}
```

**Handler:** HEAD request with `AbortSignal.timeout(8000)`. HTTPS only. Collect `x-payment-*` headers. Report 402 status + headers, or "no x402 gate detected" if status != 402.

---

## 9. S7 — Roadmap Section (15 min, bundled with S1)

Insert as new `## Roadmap: Proactive Agents` section in README after the "Agent-native" section:

> Ori is on-path to scheduled and ambient agent behavior. The next milestone is auto-executing agents that act without a human prompt: auto-tip creators when you engage with their content, auto-renew subscriptions before they lapse, auto-buy paywalled content that matches your interests, and deliver a weekly digest to your phone summarizing every on-chain action taken on your behalf.
>
> The primitives are already deployed. `subscription_vault` handles recurring authorization windows. `payment_stream` funds continuous drips. `paywall::purchase` is a single atomic call any MCP-speaking AI can execute. `achievement_sbt` provides an auditable on-chain record of agent activity milestones. Ori is already the agent wallet for Initia — proactive scheduling is the next layer.

---

## 10. Tier A (Post-Submission)

### A1 — Agent identity pages (~1.5 h)
`apps/web/src/app/agent/[address]/page.tsx` — reads all tx where `fromAddr === signer`. Backend: `GET /v1/agent/:signer/activity`. Link from profile ("View your agent's history"). Framing: `.init` is user AND agent identity; in v2 each user derives a sub-key via `child_key_from_seed(wallet_key, 'mcp')`.

### A2 — Weekly email (~2 h)
Resend SDK (simpler than SMTP). Add `email` field to User model (migration). `POST /v1/auth/subscribe-email`. `node-cron` Sunday 00:00 UTC. Reuses S5 query. Web push unsuitable for rich digest.

### A3 — Twitter thread (~30 min)
`docs/TWITTER_THREAD.md` — 12 tweets. Hook → day-by-day real usage → technical depth → vision → CTA. Draft AFTER demo video so screenshots are real.

---

## 11. Integration Points

- `prediction_pool.move` uses `initia_std::oracle` — same import as `wager_escrow.move` line 32. Zero coupling with other Ori modules. New isolated resource at `@ori`.
- MCP `ori.predict` uses same `broadcastMoveCall` + bcs pattern as all 11 existing tools.
- Oracle proxy route avoids CORS (Next.js cannot directly hit rollup REST).
- `ActivityFeed` gains one optional `agentAddress` prop — backward-compatible.
- `submission.json` modules[]: add `"prediction_pool"` after deploy.

---

## 12. Risk Assessment

### Irreversible (on-chain)
1. **Integer division rounding** in `(winning_stake * net_losers) / winning_pool`. u64 max is ~18×10^18 — no realistic overflow. Test cases must verify exact expected values.
2. **Fee double-payment bug** — `fee_sent: bool` guards. Test 4 asserts treasury = 15, not 30.
3. **Nested Table init** — must `table::new()` inner `UserStakes.by_market` on first stake per user. Tests must cover first-stake path.

### Reversible (frontend/API)
- Nav profile access: still available via header avatar link.
- Oracle proxy CORS: proxy route is the fix, already planned.
- Duration validation: UI allows 60s, contract requires ≥30 — safe.

### Highest risk
**Oracle decimals mismatch in UI.** Frontend must divide `price` by `10^decimals` for DISPLAY only. On-chain target uses RAW integer from oracle. Don't confuse the two code paths.

---

## 13. Deployment Sequence (minutes from start)

```
t=0    Write prediction_pool.move                              [S3a]
t=0    (parallel) Edit README/submission/page/layout           [S1+S7]
t=45   S1+S7 done, commit
t=45   (parallel) bottom-nav + stubs + ask/page                [S2]
t=60   S2 done, commit
t=60   minitiad move test                                      [S3a]
t=90   All 5 tests pass
t=90   minitiad move deploy                                    [S3b]
t=105  Deploy confirmed, update submission.json modules[]
t=105  (parallel) ori.predict + ori.discover_x402              [S3c+S6]
t=105  (parallel) oracle.ts proxy + weekly-stats endpoint      [S3d API+S5 API]
t=140  Commit MCP + API changes
t=140  contracts.ts helpers + api.ts functions
t=160  predict/page.tsx full impl                              [S3d frontend]
t=240  today/page.tsx + weekly-stats.tsx                       [S4+S5 frontend]
t=280  pnpm build (both apps)
t=300  Fix TypeScript errors
t=320  Manual smoke test: nav → predict → stake → view
t=340  bash scripts/update-graph.sh + commit
t=360  submission.json final sweep + tag release
```

Run `update-graph.sh` twice: after S3b deploy (contracts changed), and after t=340 (frontend/API done).
