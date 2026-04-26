<div align="center">

# Ori

### Messages that move money.

A chat wallet where your friends, your funds, and your AI agents share one surface.
Eighteen Move modules on the Initia MiniMove rollup. Built for humans and agents.

[![Initia](https://img.shields.io/badge/Initia-ori--1-5e6ad2)](https://docs.initia.xyz)
[![Move modules](https://img.shields.io/badge/Move-18%20modules-5e6ad2)](./packages/contracts/sources)
[![MCP tools](https://img.shields.io/badge/MCP-14%20tools-5e6ad2)](./apps/mcp-server)
[![A2A](https://img.shields.io/badge/A2A-JSON--RPC-5e6ad2)](./apps/api/src/routes/wellKnown.ts)
[![x402](https://img.shields.io/badge/x402-HTTP%20402-5e6ad2)](./packages/contracts/sources/paywall.move)
[![License](https://img.shields.io/badge/license-MIT-5e6ad2)](./LICENSE)

</div>

---

## Submission

| | |
|---|---|
| **Project name** | Ori |
| **Tagline** | Messages that move money. |
| **Primary track** | AI |
| **Secondary track** | Consumer |
| **Testnet chain** | `ori-1` (MiniMove) · settles to `initiation-2` via OPinit |
| **Contract address** | [`0x05dd0c60873d4d93658d5144fd0615bcfa43a53a`](https://scan.testnet.initia.xyz) |
| **Live demo** | https://ori-chi-rosy.vercel.app |
| **Submission manifest** | [`.initia/submission.json`](./.initia/submission.json) |

### TL;DR

Ori is a chat wallet. You can message a friend and pay them in the same window. An AI agent can do the same through a standard protocol, under a daily cap you set on-chain. Eighteen Move modules ship everything a consumer app needs: send, tip, gift, stream, predict, paywall, subscribe, wager, follow, squads. Fourteen of those actions are also MCP tools for Claude Desktop. Every tool is callable over A2A JSON-RPC, and the paywall speaks x402. **No token launch** — testnet uses the rollup's native denom, mainnet will use bridged INIT via Interwoven Bridge, same model as Base uses bridged ETH.

### Hackathon requirement checklist

| Requirement | Status | Evidence |
|---|:---:|---|
| Deployed on Initia rollup | ✅ | Live on `ori-1` MiniMove, contracts at `0x05dd...a53a` |
| Uses `@initia/interwovenkit-react` | ✅ | Every send / tip / predict / gift goes through `requestTxBlock` |
| At least one Initia-native feature | ✅ | **Auto-signing (session keys), Interwoven Bridge, OPinit settlement, Connect oracle** |
| `.initia/submission.json` present | ✅ | [`.initia/submission.json`](./.initia/submission.json) — every count verified by a test |
| README with overview + implementation + how-to-run | ✅ | Below, organized to the scoring dimensions |
| Open source | ✅ | MIT, this repo |

---

## Why Ori exists

| Before | With Ori |
|---|---|
| Crypto apps shout numbers. Balances, gas fees, confirmations — in your face. | Chat first. The wallet lives inside the conversation. |
| Messengers ignore money. You leave the chat, open a bank app, come back, paste a confirmation. | Tap an amount. The payment lands as a card both sides see at the same moment. |
| AI agents can reason but can't pay. | Agents get the same fourteen actions as users, with a daily cap enforced on-chain. |
| Creator tips, gifts, streams are all separate apps. | Eighteen Move modules, one thread, one name, one identity. |
| Most wallets launch a token as a cash grab. | No token launch. Bridged INIT only. |

---

## What's on chain

Contract address on `ori-1`: `0x05dd0c60873d4d93658d5144fd0615bcfa43a53a`
(`init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2` in bech32).

Every feature below is a real Move module under that address.

| Module | Purpose |
|---|---|
| `profile_registry` | Public profile bound to an `.init` name |
| `payment_router` | Send ORI to anyone by name; batch-send; chat-scoped payment cards |
| `tip_jar` | One-tap creator tips with a 1% platform fee |
| `gift_packet` | Link-based one-recipient gifts, claimable by first tap |
| `gift_group` | Link-based multi-slot gifts (one pot, N recipients, per-slot secrets) |
| `gift_box_catalog` | Curated gift themes (admin-curated) |
| `paywall` | Lock any URL behind a payment. Integrates with x402 HTTP 402 |
| `subscription_vault` | Recurring plans with period-by-period release |
| `payment_stream` | Continuous per-second streams |
| `wager_escrow` | Peer-to-peer wagers with oracle or arbiter settle |
| `prediction_pool` | Parimutuel prediction markets resolved by Connect oracle |
| `lucky_pool` | Raffle-style pools with admin draw |
| `achievement_sbt` | Non-transferable achievement badges (SBT) |
| `follow_graph` | Social follow / unfollow on-chain |
| `reputation` | Per-user activity counters |
| `squads` | Group profiles with shared XP |
| `merchant_registry` | On-chain merchant directory |
| `agent_policy` | **Daily spending caps + kill switch for AI agents** |

Every module is verified by real on-chain tests:
[`scripts/wsl-onchain-user-flows.sh`](./scripts/wsl-onchain-user-flows.sh) and
[`scripts/wsl-test-tier2-modules.sh`](./scripts/wsl-test-tier2-modules.sh).

---

## Economics — no token launch

- **Testnet** (`ori-1`): the rollup's own native denom (`umin`, displayed as ORI). This is the test currency.
- **Mainnet**: bridged INIT from `initiation-2` L1 via Interwoven Bridge. Same model as Base (bridged ETH from Ethereum) or Arbitrum (bridged ETH). No new token, no launch event, no tokenomics overhead.

Transparent on-chain fees: `tip_jar` takes 1%, `paywall` takes 1%, everything else is 0%.

---

## Why Initia

Ori depends on four Initia-native features. This isn't a product that happens to live on Initia — it's a product the design of Initia makes possible.

| Initia feature | How Ori uses it |
|---|---|
| **MiniMove VM** | Eighteen Move modules give us strict resource semantics for balances, per-user state, and on-chain agent policy. A payment is a move of a `Coin<T>` object, not a number in a table. |
| **Session keys (auto-signing)** | `InterwovenKit.enableAutoSign` grants 24h signing for `/initia.move.v1.MsgExecute`. That's what makes "zero wallet popups per send" possible. Without it, every tip would require a confirmation modal — the product is dead. |
| **Interwoven Bridge** | Onboard from any Initia-ecosystem chain in one hop. Deposit flow in `apps/web/src/components/bridge-button.tsx`. |
| **OPinit settlement** | `ori-1` settles to `initiation-2`. Users inherit L1's finality without paying L1 gas. |
| **Connect oracle** | `prediction_pool` resolves markets against Connect price feeds (BTC/USD, ETH/USD, SOL/USD, and 60+ other pairs the rollup tracks). Parimutuel pools mean no liquidity provider, no counterparty risk. |
| **Initia Usernames (`.init`)** | Every user is addressable by name across chat, payment, profile URL, and agent endpoint. One identity, four surfaces. |
| **Social login (Privy)** | Email / Google / X sign-in via `initiaPrivyWalletConnector`. No seed phrase friction for first-time users. |

---

## Agents, specifically

Three protocols so every kind of AI client can spend under your rules.

| Protocol | Transport | Who speaks it | Where in the repo |
|---|---|---|---|
| **MCP** | stdio | Claude Desktop, Claude Code, Cursor, any MCP client | [`apps/mcp-server`](./apps/mcp-server) |
| **A2A JSON-RPC 2.0** | HTTP | Any HTTP client, agent framework | `/a2a` on the API + [`/.well-known/agent.json`](./apps/api/src/routes/wellKnown.ts) |
| **x402** | HTTP 402 | Agents hitting paywalled URLs | [`paywall.move`](./packages/contracts/sources/paywall.move) + MCP `ori.purchase_paywall` |

**The safety story is on-chain, not in the server.**
`agent_policy::set_policy(agent, daily_cap_umin)` writes a per-agent cap. `agent_policy::pre_check_and_record` runs *inside* every spending tx. If the agent tries to exceed the cap, the Move VM aborts the tx — before any coin moves. The kill switch is a single `revoke_agent` tx the user can send from any device.

**14 MCP tools shipped today:**
`ori.send_payment` · `ori.send_tip` · `ori.create_link_gift` · `ori.get_balance` · `ori.get_profile` · `ori.resolve_init_name` · `ori.propose_wager` · `ori.list_top_creators` · `ori.purchase_paywall` · `ori.search_initia_docs` · `ori.fetch_initia_doc` · `ori.discover_x402` · `ori.schedule_action` · `ori.predict`

---

## Architecture

```
                    Browser / MCP client / A2A HTTP
                          │
                          ▼
┌──────────────────────────────────────────────┐
│  Next.js 16 + Fastify 5 (on Vercel)          │  ◀── EIP-191 wallet auth
│  ─ /api/[...path] wraps Fastify via inject() │  ◀── idempotency, rate limit
│  ─ realtime adapter (Supabase / Socket.IO)   │       in Redis (Upstash)
└──────────────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────────┐
│ Supabase         │ │ Upstash  │ │ Initia rollup    │
│ ─ Postgres 16    │ │ Redis    │ │ ─ ori-1 MiniMove │
│ ─ Edge Functions │ └──────────┘ │ ─ 18 Move modules│
│   (event-listener│               │ ─ OPinit → L1    │
│    + pg_cron)    │               │ ─ Connect oracle │
│ ─ Realtime       │               └──────────────────┘
└──────────────────┘                        ▲
        ▲                                   │
        └──────── event-decoder ────────────┘
                (packages/event-decoder)
                Pure TS shared by Node + Deno —
                same decode logic runs in the
                long-running Node listener AND the
                Supabase Edge Function. No drift.
```

Smart contracts hold all the money and state. The server only keeps off-chain things: encrypted messages, session tokens, and a Postgres cache of chain events for fast feeds.

---

## Tech stack

| Layer | Tech |
|---|---|
| Web | Next.js 16, React 19, Tailwind v4, Geist + Instrument Serif |
| API | Fastify 5, Prisma 6, ioredis, Graphile Worker, Zod |
| Database | PostgreSQL 16 (self-hosted locally; Supabase in prod) |
| Cache | Redis (Upstash in prod) |
| Realtime | Supabase Realtime (prod), Socket.IO (local dev) |
| Chain | Initia MiniMove (Cosmos SDK + Move VM), ethsecp256k1 |
| Auth | EIP-191 wallet signatures, session tokens in Postgres |
| Oracle | Connect (formerly Slinky) |
| Agent protocols | MCP stdio, A2A JSON-RPC 2.0, x402 |

---

## Repository layout

```
apps/
  web/             Next.js 16 frontend
  api/             Fastify backend (Prisma, Redis, event listener, outbox)
  mcp-server/      MCP stdio + A2A HTTP server (14 tools)

packages/
  contracts/       Move source for all 18 modules + Move tests
  event-decoder/   Pure TS decoder shared by Node + Deno (parity-tested)
  shared-types/    Types shared across apps
  sdk/             Client SDK helpers

supabase/
  config.toml
  functions/       Deno Edge Functions (event listener; pg_cron invokes)
  migrations/      pg_cron schedules

scripts/           Deploy, build, and test scripts (WSL-first)
docs/              Architecture, runbooks, migration plans
.initia/
  submission.json  Hackathon submission manifest (verified numbers)
```

---

## Run locally

**Needs**: Node 20+, pnpm 9+, Docker Desktop, WSL on Windows, and a funded Initia testnet wallet.

```bash
# 1. Install
pnpm install

# 2. Provision Postgres + Redis
#    Easiest: Supabase + Upstash (both free tier; URLs go in apps/api/.env).

# 3. Create apps/api/.env with the required vars (DATABASE_URL, REDIS_URL,
#    JWT_SECRET, ORI_RPC_URL, ORI_REST_URL, ORI_DEPLOYER_MNEMONIC, etc).

# 4. Apply DB migrations
pnpm --filter @ori/api db:migrate

# 5. Start a local rollup (WSL, separate terminal)
bash scripts/wsl-start-rollup.sh

# 6. Deploy contracts to that local rollup
bash scripts/deploy-testnet.sh

# 7. Run API and web in two terminals
pnpm --filter @ori/api dev        # http://localhost:3001
pnpm --filter @ori/web dev        # http://localhost:3000
```

Open http://localhost:3000 and connect a wallet. You're in.

---

## Deploy to production (free tier, ~35 min)

All three services have generous free tiers: **Vercel** (web + API as serverless), **Supabase** (Postgres + Edge Functions + Realtime), **Upstash** (Redis). Push the repo to GitHub, import into Vercel, set the env vars listed in `apps/web/src/lib/chain-config.ts` and `apps/api/src/config.ts`, then run `pnpm --filter @ori/api db:migrate:deploy` once against the production database.

---

## Testing — every number in this README is backed by a script

| Suite | Command | What it proves |
|---|---|---|
| Move unit tests | `bash scripts/wsl-move-test.sh` | Every entry function, every abort code |
| On-chain user flows | `bash scripts/wsl-onchain-user-flows.sh` | 16 real signed tx flows |
| Tier-2 modules | `bash scripts/wsl-test-tier2-modules.sh` | 21 more real tx flows |
| Backend suite | `bash scripts/wsl-test-everything.sh` | 96 API + event cases |
| Auth + A2A | `node scripts/wsl-test-auth-and-a2a.js` | 17 EIP-191 + JSON-RPC cases |
| MCP stdio | `bash scripts/wsl-test-mcp-stdio.sh` | 14 tools list + invoke |
| Frontend renders | `bash scripts/wsl-test-frontend-renders.sh` | 15 real page renders |
| Event-decoder parity | `pnpm --filter @ori/event-decoder test` | 7 cases, same code runs in Node + Deno |

Run against a live rollup. If you claim it, a script proves it.

---

## Agent setup (Claude Desktop)

Add this to your `mcp.json`:

```json
{
  "mcpServers": {
    "ori": {
      "command": "npx",
      "args": ["-y", "@ori/mcp-server"],
      "env": {
        "ORI_MCP_MNEMONIC": "<your 12 or 24 word BIP-39 mnemonic>",
        "ORI_CHAIN_ID": "ori-1",
        "ORI_RPC_URL": "https://<rollup-rpc>",
        "ORI_REST_URL": "https://<rollup-rest>"
      }
    }
  }
}
```

First, go to `/settings` in the web app and set a daily cap on-chain for this agent address. The agent can never spend more than what you allow — enforced by Move, not by the server.

A sample config lives at [`.mcp.json.sample`](./.mcp.json.sample).

---

## Docs

- [`CHANGELOG.md`](./CHANGELOG.md) — version-by-version release notes
- [`docs/aboutproduct.md`](./docs/aboutproduct.md) — product overview
- [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md) — demo walkthrough
- [`docs/architecture-graph/`](./docs/architecture-graph) — auto-generated module graph

---

## Links

- Initia docs: https://docs.initia.xyz
- Initia testnet explorer: https://scan.testnet.initia.xyz
- Move language: https://move-language.github.io/move/
- Model Context Protocol: https://modelcontextprotocol.io

---

## License

MIT. See [`LICENSE`](./LICENSE).
