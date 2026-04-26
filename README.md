<div align="center">

# Ori

### Messages that move money.

A chat wallet for humans and AI agents on the Initia MiniMove rollup. Every conversation can carry a payment, a tip, a gift, a paywall, or a wager — and every action is also a tool an agent can call, under a daily cap you sign once.

[Live app](https://ori-chi-rosy.vercel.app) · [Submission manifest](./.initia/submission.json) · [Contract on explorer](https://scan.testnet.initia.xyz/ori-1/accounts/0x05dd0c60873d4d93658d5144fd0615bcfa43a53a)

[![Chain](https://img.shields.io/badge/chain-ori--1%20MiniMove-0022FF)](https://docs.initia.xyz)
[![Modules](https://img.shields.io/badge/Move%20modules-18-0022FF)](./packages/contracts/sources)
[![Agent tools](https://img.shields.io/badge/MCP%20tools-14-0022FF)](./apps/mcp-server)
[![Protocols](https://img.shields.io/badge/protocols-MCP%20·%20A2A%20·%20x402-0022FF)](#agents-as-first-class-users)
[![License](https://img.shields.io/badge/license-MIT-0022FF)](./LICENSE)

</div>

---

## What it is

Ori collapses the wallet into the chat window. Open a thread with a friend, drop an amount, hit send — both sides see the payment land as a card without leaving the conversation. The same happens for tips, gift packets, link-based group gifts, paywalls, subscriptions, payment streams, prediction markets, lucky pools, and 1v1 wagers. Eighteen Move modules carry it all on a single MiniMove rollup.

Where most wallets stop, Ori adds a parallel surface for AI. Every primitive that a human can call from the UI is also a tool on an MCP server, exposed through Claude Desktop and any other MCP client. The same tools are mirrored over A2A JSON-RPC so non-MCP agents reach them by HTTP. The paywall module speaks x402 — an HTTP 402 response with a Move payment route an agent can satisfy in one round-trip. None of this is a wrapper: an on-chain `agent_policy` module enforces a per-agent daily spending cap and a kill-switch that propagates to every device the moment you sign it.

> Built for the **INITIATE** hackathon. Primary track: AI. Secondary: Consumer.

---

## Five-second summary

| | |
|:---|:---|
| **Chain** | `ori-1` MiniMove rollup, settles to `initiation-2` via OPinit |
| **Contract** | `0x05dd0c60873d4d93658d5144fd0615bcfa43a53a` (18 Move modules) |
| **Identity** | `.init` usernames on Initia L1 (one name, every device) |
| **Encryption** | libsodium sealed-box. X25519 keys derived from a wallet signature so they survive device loss |
| **Oracle** | Connect price feeds (BTC/USD, ETH/USD, SOL/USD plus 60+ pairs) for prediction markets |
| **Realtime** | Socket.IO for messages and presence; HTTP polling fallback when WS is offline |
| **Tokenomics** | None. Bridged INIT only, via Interwoven Bridge |

---

## How it fits together

```
                                ┌───────────────────────────┐
       Browser / mobile  ───►   │   Next.js 16 (App Router) │
                                │   InterwovenKit drawer    │
                                │   libsodium for E2E DMs   │
                                └────────────┬──────────────┘
                                             │ HTTPS
                                             ▼
                                ┌───────────────────────────┐
       Claude Desktop  ──MCP──► │   Fastify API             │
       Agent over A2A  ──HTTP─► │   Prisma · Postgres       │
       x402 client     ──HTTP─► │   Redis pub/sub · Outbox  │
                                └────────────┬──────────────┘
                                             │ Cosmos SDK
                                             ▼
                                ┌───────────────────────────┐
                                │  ori-1 (MiniMove rollup)  │
                                │  18 Move modules          │
                                │  agent_policy enforces    │
                                │  per-agent daily caps     │
                                └────────────┬──────────────┘
                                             │ OPinit
                                             ▼
                                ┌───────────────────────────┐
                                │  Initia L1 (initiation-2) │
                                │  • settlement             │
                                │  • .init usernames        │
                                │  • Interwoven Bridge      │
                                └───────────────────────────┘
```

The web app and the Fastify API ship as a single Vercel deployment (the API runs as a serverless catchall route). The rollup runs separately and is exposed to the deployment over a secure tunnel. There is no co-located VM, no Kubernetes, no docker-compose in production.

---

## What's on chain

Eighteen modules under a single named address. Each one is a real Move source file in [`packages/contracts/sources`](./packages/contracts/sources) and ships with Move unit tests.

| Module | Purpose |
|:---|:---|
| `profile_registry` | Public profile + `.init` handle + on-chain X25519 encryption pubkey |
| `payment_router` | Send, batch-send, and chat-scoped payment cards |
| `tip_jar` | One-tap creator tips with a 1% platform fee |
| `gift_packet` | Link-based single-recipient gifts |
| `gift_group` | Multi-slot pots with per-slot secrets |
| `gift_box_catalog` | Curated gift themes |
| `payment_stream` | Continuous per-second streams |
| `subscription_vault` | Recurring plans with per-period release |
| `paywall` | Lock any URL or content behind a Move payment; speaks x402 |
| `merchant_registry` | Storefront identity + accepted-denom routing |
| `wager_escrow` | 1v1 and PvP wagers with arbiter or oracle resolution |
| `prediction_pool` | Parimutuel YES/NO markets, resolved by Connect oracle |
| `lucky_pool` | Fixed-entry pools with deterministic VRF winner draw |
| `squads` | Group identities (chats, shared funds, leaderboards) |
| `follow_graph` | Follow / unfollow as a chain-scoped social graph |
| `reputation` | Thumbs-up, thumbs-down, signed-claim attestations |
| `achievement_sbt` | Soulbound badges for milestones (multi-level) |
| `agent_policy` | Per-agent daily spending cap and kill-switch enforced by VM |

---

## Agents as first-class users

Three protocols, one surface.

**MCP** — Fourteen of the actions above are exposed as MCP tools (`payment.send`, `tip.send`, `gift.create_link`, `paywall.purchase`, `prediction.stake`, etc.). Claude Desktop discovers them through stdio and can transact under your authorization. Source: [`apps/mcp-server`](./apps/mcp-server).

**A2A JSON-RPC 2.0** — The same tools are mirrored at `/agent/jsonrpc`. Any non-MCP agent calls them with a plain HTTP request. The agent card lives at [`/.well-known/agent.json`](./apps/api/src/routes/wellKnown.ts), so discovery is one fetch.

**x402** — The paywall module mints a payment route that satisfies x402's HTTP 402 challenge. An agent that hits a locked URL gets back a JSON envelope describing the Move call needed to unlock it; one round-trip later, the agent has paid and the URL serves.

**Daily caps in Move, not in middleware.** `agent_policy::can_spend(owner, agent, amount)` is read by every spend module before it accepts an agent's payment. Revoke an agent and the cap goes to zero in the next block — even mid-flight a Claude session stops being able to send.

---

## Initia-native features used

| Feature | Where it lands |
|:---|:---|
| **MiniMove VM** | Every module is Move source, compiled with `minitiad move build` |
| **OPinit settlement** | `ori-1` settles to `initiation-2`; bridged INIT is the gas + unit of account |
| **InterwovenKit auto-signing** | 24h session keys cover `/initia.move.v1.MsgExecute`, so an agent can chain calls without prompting |
| **Sponsored onboarding** | New wallets get a small seed grant + a sponsored `.init` username on first login |
| **Connect oracle** | `prediction_pool` markets resolve against Connect feeds — BTC/USD, ETH/USD, SOL/USD, and 60+ pairs the rollup tracks |
| **Interwoven Bridge** | The only path INIT enters the rollup. No platform token issued, ever |

---

## Tech stack

| Layer | Choice |
|:---|:---|
| Frontend | Next.js 16 (App Router, Server Components), Turbopack, Tailwind CSS v4 |
| Wallet UX | `@initia/interwovenkit-react` (drawer + autosign + Privy social login) |
| API | Fastify 5 on Vercel serverless (catchall route mounts in-process) |
| Realtime | Socket.IO with HTTP polling fallback for environments without WS upgrade |
| Database | Postgres on Supabase, accessed via Prisma 6 |
| Cache / queue | Upstash Redis (pub/sub + idempotency middleware + circuit-breaker state) |
| Encryption | libsodium-wrappers-sumo sealed-box; X25519 keys derived from EIP-191 signature |
| Background jobs | Graphile Worker (Postgres-backed) for outbox, push, and scheduled actions |
| Move toolchain | `minitiad` for the rollup, `aptos move` compatible source under `packages/contracts` |
| Hosting | Vercel for web + API, Supabase for DB + Realtime, Upstash for Redis |

---

## Repo layout

```
ori/
├── apps/
│   ├── web/                      Next.js 16 frontend + API catchall
│   ├── api/                      Fastify routes, Prisma, workers
│   └── mcp-server/               14-tool MCP stdio server for agents
├── packages/
│   ├── contracts/                18 Move modules + Move unit tests
│   ├── shared-types/             TS types shared across apps
│   └── event-decoder/            Pure-TS Move event decoder (Node + Deno)
├── scripts/                      Deploy, smoke-test, and migration helpers
├── supabase/                     Edge function source
├── docs/                         Public-facing docs + architecture graph
└── .initia/submission.json       Hackathon submission manifest
```

---

## Run it locally

Prerequisites: Node 22+, pnpm 9+, a Postgres URL, a Redis URL, a wallet mnemonic.

```bash
# 1. Install
git clone https://github.com/Pratiikpy/Ori.git ori && cd ori
pnpm install

# 2. Configure
#    Create apps/api/.env with DATABASE_URL, REDIS_URL, JWT_SECRET,
#    ORI_RPC_URL, ORI_REST_URL, ORI_DEPLOYER_MNEMONIC, VAPID_*.
#    Required vars are documented in apps/api/src/config.ts.

# 3. Apply DB schema
pnpm --filter @ori/api db:migrate:deploy

# 4. (Optional) start a local rollup if you don't have a public RPC
bash scripts/wsl-start-rollup.sh

# 5. Run web + API in two terminals
pnpm --filter @ori/api dev      # http://localhost:3001
pnpm --filter @ori/web dev      # http://localhost:3000
```

Connect a wallet, sign once for the session, sign once for the encryption keypair, and you're sending encrypted DMs that carry payments.

---

## Deploy to production

The repo is shaped for a free-tier deploy across three providers.

| Service | Provider | What it hosts |
|:---|:---|:---|
| Web + API | **Vercel** | Next.js frontend; Fastify API mounted on `/api/[...path]` |
| Postgres | **Supabase** | Prisma schema, with the transaction pooler URL for runtime |
| Redis | **Upstash** | pub/sub, idempotency, circuit-breaker state |

Push the repo, import the project on Vercel, set the env vars enumerated in [`apps/web/src/lib/chain-config.ts`](./apps/web/src/lib/chain-config.ts) and [`apps/api/src/config.ts`](./apps/api/src/config.ts), then run `pnpm --filter @ori/api db:migrate:deploy` once against the production database. The rollup itself runs anywhere reachable over HTTPS — set `ORI_RPC_URL` and `ORI_REST_URL` to the public endpoints.

---

## Verification

Every claim in `.initia/submission.json` is backed by a script in this repo.

| Check | How it's verified |
|:---|:---|
| 18 Move modules deploy and respond | `scripts/wsl-onchain-user-flows.sh` (16 real tx flows) |
| All tier-2 modules pass tests | `scripts/wsl-test-tier2-modules.sh` (21 on-chain tests) |
| MCP server lists and runs 14 tools | `scripts/wsl-test-mcp-stdio.sh` |
| Auth + A2A end-to-end | `scripts/wsl-test-auth-and-a2a.js` (17 cases) |
| 15 frontend routes render | `scripts/wsl-test-frontend-renders.sh` |
| Move event decoder parity | `packages/event-decoder` (7 unit tests) |
| Move modules unit-tested | `packages/contracts` (per-module Move tests) |

---

## Why no token

Most wallets ship a token. Ori does not. The platform uses bridged INIT through Interwoven Bridge as gas and unit of account — the same model Base uses with bridged ETH. There is no governance token, no liquidity-mining program, no airdrop. Fees are minimal and visible in `.move` source. We thought the right thing to do for a hackathon submission was to ship a real product and let the chain's token do its job.

---

## Links

- Initia documentation — https://docs.initia.xyz
- Initia testnet explorer — https://scan.testnet.initia.xyz
- Move language reference — https://move-language.github.io/move/
- Connect oracle — https://docs.initia.xyz/home/core-concepts/connect

---

## License

MIT for the application code and the Move contracts. See [`LICENSE`](./LICENSE).

<div align="center">
<sub>Built by <a href="https://x.com/prateekhh">@prateekhh</a> for the <strong>INITIATE</strong> hackathon.</sub>
</div>
