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

## Why Ori exists

Crypto apps shout numbers. Messengers ignore money. Agents can reason but not pay.
Ori does neither — it's a chat app where payment is a message, and the agent on the
other side of your prompt can spend under limits you set on-chain.

- **Everyone can pay** — send, tip, gift, stream, split, subscribe, unlock — all from the chat thread.
- **Agents can pay too** — same eighteen actions as tools on an MCP server and an A2A JSON-RPC endpoint. A Move module called `agent_policy` caps what any single agent can spend per day.
- **No token launch** — bridged INIT is the unit of account. Transparent on-chain fees, no tokenomics overhead.

---

## What's on chain

The contract address on `ori-1` is `0x05dd0c60873d4d93658d5144fd0615bcfa43a53a`
(`init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2` in bech32). Every feature below is a real Move module under that address.

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
| `agent_policy` | Daily spending caps + kill switch for AI agents |

Eighteen modules. All verified by on-chain tests in `scripts/wsl-onchain-user-flows.sh` and `scripts/wsl-test-tier2-modules.sh`.

---

## Agents, specifically

Three protocols so every kind of AI client can spend under your rules.

| Protocol | Transport | Who speaks it | Where in the repo |
|---|---|---|---|
| **MCP** | stdio | Claude Desktop, Claude Code, Cursor, any MCP client | [`apps/mcp-server`](./apps/mcp-server) |
| **A2A JSON-RPC 2.0** | HTTP | Any HTTP client, agent framework | `/a2a` on the API + [`/.well-known/agent.json`](./apps/api/src/routes/wellKnown.ts) |
| **x402** | HTTP 402 | Agents hitting paywalled URLs | [`paywall.move`](./packages/contracts/sources/paywall.move) + MCP `ori.purchase_paywall` |

The safety story is on-chain, not in the server. `agent_policy::set_policy` writes a daily cap per agent address. `agent_policy::pre_check_and_record` runs inside every spending tx. No policy, no spend — enforced by the Move VM, not by us.

Fourteen tools live today: `ori.send_payment`, `ori.send_tip`, `ori.create_link_gift`, `ori.get_balance`, `ori.get_profile`, `ori.resolve_init_name`, `ori.propose_wager`, `ori.list_top_creators`, `ori.purchase_paywall`, `ori.search_initia_docs`, `ori.fetch_initia_doc`, `ori.discover_x402`, `ori.schedule_action`, `ori.predict`.

---

## Architecture

```
                    Browser / MCP client / A2A HTTP
                          │
                          ▼
┌─────────────────────────────────────────┐
│  Next.js 16 + Fastify 5 (on Vercel)     │  ◀── EIP-191 wallet auth
│  ─ /api/[...path] wraps Fastify         │  ◀── idempotency, rate limit
│  ─ realtime adapter (Supabase/Socket.IO)│      via Redis
└─────────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────────┐
│ Supabase         │ │ Upstash  │ │ Initia rollup    │
│ ─ Postgres 16    │ │ Redis    │ │ ─ ori-1 MiniMove │
│ ─ Edge Functions │ └──────────┘ │ ─ 18 Move modules│
│   (event-listener│               │ ─ OPinit to L1   │
│    + pg_cron)    │               │ ─ Connect oracle │
│ ─ Realtime       │               └──────────────────┘
└──────────────────┘                        ▲
        ▲                                   │
        └──────── event decoder ────────────┘
                (packages/event-decoder)
                shared between Node + Deno
                so the same logic runs in
                both runtimes — no drift.
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

# 2. Start Postgres + Redis in Docker
docker compose up -d

# 3. Copy env and fill in your mnemonic
cp .env.example apps/api/.env
# Edit apps/api/.env — set ORI_DEPLOYER_MNEMONIC (12 or 24 word BIP-39).

# 4. Apply DB migrations
pnpm --filter @ori/api db:migrate

# 5. Start a local rollup (WSL, separate terminal)
bash scripts/wsl-start-rollup.sh

# 6. Deploy contracts to that local rollup
bash scripts/deploy-testnet.sh

# 7. Run the API and web in two terminals
pnpm --filter @ori/api dev        # http://localhost:3001
pnpm --filter @ori/web dev        # http://localhost:3000
```

Open http://localhost:3000 and connect a wallet. You're in.

---

## Deploy to production (free tier, ~35 min)

All three services have generous free tiers: **Vercel** (web + API as serverless), **Supabase** (Postgres + Edge Functions + Realtime), **Upstash** (Redis).

- **Shipment 1** — web + API + database + Redis. See [`DEPLOY.md`](./DEPLOY.md).
- **Shipment 2** — real-time feed via Supabase Edge Functions + pg_cron. See [`DEPLOY2.md`](./DEPLOY2.md).

---

## Testing

Every test below is real — it signs a tx, decodes a block, or renders a page, and asserts the result.

| Suite | Command | Scope |
|---|---|---|
| Move unit tests | `bash scripts/wsl-move-test.sh` | Every entry function, every abort code |
| On-chain user flows | `bash scripts/wsl-onchain-user-flows.sh` | 16 real signed tx flows |
| Tier-2 modules | `bash scripts/wsl-test-tier2-modules.sh` | 21 more real tx flows |
| Backend suite | `bash scripts/wsl-test-everything.sh` | 96 API + event cases |
| Auth + A2A | `node scripts/wsl-test-auth-and-a2a.js` | 17 EIP-191 + JSON-RPC cases |
| MCP stdio | `bash scripts/wsl-test-mcp-stdio.sh` | 14 tools list + invoke |
| Frontend renders | `bash scripts/wsl-test-frontend-renders.sh` | 15 real page renders |
| Event-decoder parity | `pnpm --filter @ori/event-decoder test` | 7 cases, same code runs in Node + Deno |

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

First, go to `/settings` in the web app and set a daily cap on-chain for this agent address. The agent can never spend more than what you allow — enforced by Move, not by our server.

A sample config lives at [`.mcp.json.sample`](./.mcp.json.sample).

---

## Submission

The formal submission manifest is at [`.initia/submission.json`](./.initia/submission.json). Every number in that file (18 modules, 14 MCP tools, 21 Tier-2 on-chain tests, and so on) is backed by a test script that runs against a live rollup.

---

## Docs

- [`CHANGELOG.md`](./CHANGELOG.md) — version-by-version release notes
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — style guide and PR rules
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — ops playbook
- [`docs/MIGRATION_PLAN.md`](./docs/MIGRATION_PLAN.md) — Vercel + Supabase architecture
- [`docs/SHIPMENT1_PLAN.md`](./docs/SHIPMENT1_PLAN.md) · [`docs/SHIPMENT2_PLAN.md`](./docs/SHIPMENT2_PLAN.md) — phased deploy plans

---

## Links

- Initia docs: https://docs.initia.xyz
- Initia testnet explorer: https://scan.testnet.initia.xyz
- Move language: https://move-language.github.io/move/
- Model Context Protocol: https://modelcontextprotocol.io

---

## License

MIT. See [`LICENSE`](./LICENSE).
