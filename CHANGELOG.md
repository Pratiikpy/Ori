# Changelog

Only notable changes. All dates ISO.

## v0.4.0 — production reliability + agent policy (2026-04-18)

### Added (reliability layer)
- **Outbox pattern** — `domain_events` table + `OutboxWorker`. Every pub/sub publish is durable; Redis hiccups no longer drop badge mints or real-time events. `emitEvent(topic, payload)` replaces direct `redis.publish` in EventListener (9 call sites migrated).
- **Idempotency middleware** — Fastify plugin backed by Redis with 24h TTL. Routes opt-in via `config.idempotent = true`. Returns `X-Idempotent-Replay: hit|miss`. Stripe-style route+body fingerprint blocks key reuse across different ops.
- **Circuit breakers** — zero-dep CLOSED -> OPEN -> HALF_OPEN state machine wrapping oracle fetches. 5 consecutive failures trip a 30s cooldown with `Retry-After` headers. `circuitBreakers.snapshot()` powers `/health/deep`.
- **Deep health check** — `GET /health/deep` reports chain sync lag, oracle staleness (seconds since block_timestamp), redis ping ms, postgres pool, outbox pending + DLQ depth, per-breaker state. 503 if any signal degraded.
- **Graphile Worker** — Postgres-backed job queue with exponential backoff + DLQ. Concurrency 4. LISTEN/NOTIFY for sub-second pickup. Hosts the new `scheduled-action` task; future work migrates `AchievementIssuer` to this substrate.
- **Replay CLI** — `apps/api/scripts/replay-events.ts` to reset the event listener cursor and reprocess a range. Supports `--dry-run` and cursor inspection.

### Added (agent layer)
- **`/.well-known/agent.json`** — A2A spec-compliant discovery endpoint listing all 13 MCP/A2A skills with tags, auth schemes, chain metadata. Indexes Ori for agent-to-agent discovery.
- **`agent_policy.move`** (module #18) — on-chain per-agent daily spending cap + kill switch. `set_policy`, `revoke_agent`, `pre_check_and_record` (aborts over cap), `reset_daily_window` (permissionless after 24h). Deployed at tx `1171993D9F8859B519057E23DF19AC88D1D6F09DB7092B591362F7EECE3B640C`.
- **Agent spending dashboard** — `AgentAction` Prisma model + `/v1/agent/log` ingestion + `GET /v1/agent/:addr/actions` read API + `/agent/[address]/page.tsx` dashboard showing every tool call with prompt hash, tx hash, status, and args preview.
- **Scheduled actions** — new MCP tool `ori.schedule_action` + `POST /v1/agent/schedule` endpoint + `scheduled-action` graphile task. Supports kinds: tip, purchase_paywall, subscribe_renew, predict. Either `run_at` (ISO ts) or `run_in_seconds`. Deduplicated via `jobKey` for idempotency across retries.
- **Kill switch UI** — `AgentPolicySection` component in /settings. Shows daily-cap progress bar (green/amber/red), active state (shield icon), REVOKE button (red, with confirm dialog). Reads `agent_policy::get_policy` + `policy_exists` view fns; writes via `set_policy` / `revoke_agent` entry fns.
- **MCP action attribution** — every MCP tool call POSTs to `/v1/agent/log` with `promptHash = sha256(canonicalJson(args))`. Non-blocking, best-effort. Surfaces in the dashboard.

### Changed
- MCP tools: **14 total** (was 13) -- added `ori.schedule_action`. Signer attribution now logged for every call.
- Move modules: **18 total** (was 17) -- added `agent_policy`.

### Infra
- New Prisma migration: `20260418175530_add_outbox_and_agent_actions`.
- Graphile Worker migrations auto-applied on first worker start (uses its own `graphile_worker` schema in Postgres).
- Helmet CSP directives now account for outbox worker responses (no inline scripts).

## v0.3.0 — agent wallet repositioning + Predict (2026-04-18)

### Added
- **`prediction_pool.move`** — parimutuel binary prediction markets resolved by Connect oracle. 5 view functions, 4 entry functions (`create_market`, `stake`, `resolve`, `claim_winnings`), zero-liquidity settlement. Deployed at tx `54C6BB910C39587DC4388AE371F7C972464770CD758F3251548FE06ED9EE72D7`.
- **`/predict` page** — one-tap HIGHER/LOWER on 5 famous tokens (BTC/ETH/SOL/BNB/ATOM) with 60s-to-1day resolution windows. Auto-sign banner when disabled. Resolve + Claim controls for market lifecycle.
- **`/today` tab** — agent activity feed, weekly stats digest, Tweet share, quick actions.
- **`/ask` page** — Claude Desktop MCP setup guide + 5 copy-paste demo prompts.
- **Two new MCP tools** — `ori.predict` and `ori.discover_x402` (total: 13).
- **API: `/v1/oracle/price` + `/v1/oracle/tickers`** proxies with 2s Redis cache and clean 404 for pairs not tracked on the rollup.
- **API: `/v1/profiles/:address/weekly-stats`** — 7-day agent-activity rollup.
- **Next.js convention files** — `not-found.tsx`, `error.tsx`, `loading.tsx`, skeleton primitive, `friendlyError()` helper.
- **Global a11y styles** — focus-visible ring, skip-to-content, prefers-reduced-motion, dark scrollbar.
- **`GAS_LIMITS` + `POLL_INTERVALS`** constants in chain-config to kill magic numbers.
- **Helmet CSP** in production for the API.

### Changed
- ⚠️ **Positioning**: "consumer super-app" -> **"agent wallet for Initia"** across README, landing, submission pitches, demo script.
- ⚠️ **Nav reorder**: 4 tabs (Chats / Discover / Send / Profile) -> 5 tabs (**Today / Ask Claude / Predict / Create / Friends**). Profile accessible via header avatar.
- ⚠️ **Native symbol**: `ORI` -> **`INIT`** (matches bridged-token reality and pitch copy).
- Tagline: "Messages, money, and agents -- same surface." -> **"Let Claude spend your INIT."**
- Removed false "95/95 E2E tests passing" claim from README.

### Infra
- Postgres + Redis started via `docker compose up -d`. Prisma migrations applied.
- `minitiad` + `opinitd.executor.service` managed via systemd --user with `Restart=always`.

## v0.2.0 — no-compromise hardening

Complete real-product pass. Every item from the "known limitations" list fixed.

### Move contracts
- **All 6 modules audited against the real `initia_std` stdlib** from the InitiaLibrary source (initia-labs/move-natives). Import paths verified, function signatures match `coin`, `event`, `block`, `hash`, `object`, `table`.
- **Move.toml** switched to `initia-labs/move-natives` — matches iUSD Pay's mainnet-shipped setup.
- **`gift_packet::reclaim_expired_gift`** — senders reclaim unclaimed link-gift funds after expiry so money is never locked forever.
- **`gift_packet::GiftCreated` event** now emits `secret_hash` + `expires_at` so the backend can correlate payment-link off-chain metadata without relying on the client's tx-response parsing.
- **`wager_escrow::cancel_pending`** — proposer can reclaim a pending wager if no accepter materializes.
- **Comprehensive Move tests added** for all 6 modules: coin flow tests with real mint→transfer→balance assertions, abort-code tests for every error path, expiry flow tests using `block::set_block_info`.

### Backend
- **EIP-191 verifySignature** with Privy embedded-wallet bypass (`PRIVY_COMPAT` env) — matches iUSD Pay's production workaround for the known Privy signature-recovery bug. Gated to non-production by default.
- **Fastify decoration ordering fixed** — `buildApp()` now takes `io` and decorates BEFORE registering routes, so every request handler sees `app.io` from the first request.
- **Custom HTTP server** shared between Fastify and Socket.IO (no port-collision fragility).
- **Rate-limit tiers** — global, messages, auth, each configurable.
- **Graceful shutdown** with ordered teardown (event listener → issuer → WS → Fastify → Prisma → Redis).
- **Push subscription routes** (`POST/DELETE /v1/push/subscribe`) + VAPID public key endpoint.
- **Web Push dispatcher** (`services/webPush.ts`) — real `web-push` VAPID send; auto-deletes 410 Gone subscriptions; skips if user is online via Redis presence.
- **Achievement issuer** (`services/achievementIssuer.ts`) — Cosmos signer built from mnemonic via `@cosmjs/proto-signing`, subscribes to Redis event channels, mints badges idempotently with Redis-locked in-flight guard.
- **Move signer** (`services/moveSigner.ts`) — general `sendMoveExecute` helper the issuer (and any future backend service) uses.
- **Event listener upgrades**:
  - Cursor-first-write on cold start → crash-safe from the very first block.
  - Per-block cursor commit → exactly-once under any crash scenario.
  - Publishes to Redis Pub/Sub: `ori:event:tip`, `ori:event:payment`, `ori:event:gift_created`, `ori:event:badge`.
  - Decodes base64-encoded Cosmos SDK event attributes (older SDK versions).
  - Populates `PaymentLink.onChainGiftId` by correlating GiftCreated events via secret_hash.
  - Emits `badge.awarded` WS event to the recipient.

### Frontend
- **Deterministic X25519 keypair** — same wallet signature always produces the same `(publicKey, privateKey)` via `crypto_box_seed_keypair(BLAKE2b(sig))`. Multi-device just works; no cross-device keypair drift.
- **Encrypt-to-self** — every outgoing message is sealed twice (recipient pubkey + own pubkey) so sender's history decrypts on reload, any device, same wallet.
- **Message schema** gains optional `senderCiphertext` Bytes column; API + client updated end-to-end.
- **Central tx helper** (`lib/tx.ts`) — `sendTx(kit, { autoSign, ... })` dispatches between `submitTxBlock` (silent + fee) and `requestTxBlock` (UI). `buildAutoSignFee(gasLimit)` produces a real StdFee with explicit amount (no more `amount: []` placeholder). `extractMoveEventData(tx, suffix)` parses events from `DeliverTxResponse`.
- **Every tx site converted**: onboarding, send, bulk send, gift creation, gift claim, settings, tip jar, wager (propose/accept/resolve/cancel), chat composer payment.
- **Wager UI complete**: `WagerModal` (propose), `WagerCard` (inline chat card with role-aware accept / cancel / resolve), `useAutoSign` integration, tx-event-driven `wagerId` extraction.
- **Settings page** (`/settings`) — bio, avatar, links (add/remove), privacy toggles (hide balance / activity / whitelist-only). Per-section save.
- **Presence** — `usePresence` heartbeat every 15s keeps Redis presence key warm; backend's push dispatcher skips offline-only notifications for online users.
- **Push notifications wired end-to-end** — service worker at `/sw.js`, `ensurePushSubscription()` auto-registers on session boot, backend `firePushToUser` on message POST when recipient offline.
- **`SessionBoot` component** — one-time side-effects after sign-in: WS auth, presence heartbeat, push subscription.
- **Error boundary** around the providers.
- **PWA** — service worker, manifest.json, installable on iOS/Android.
- **Achievement SBT event listener on WS** — frontend gets `badge.awarded` for toast.

### Config & infra
- `.env.example` updated with new vars: `PRIVY_COMPAT`, rate-limit tiers, `BADGE_ISSUER_MNEMONIC`, `ISSUER_GAS_DENOM`, L1 frontend URLs.
- `@cosmjs/proto-signing` and `@cosmjs/stargate` added for backend signing.
- Monorepo at 100 files (up from 87 in v0.1.0).

### Known residual work (explicitly tracked)
- Move code needs `minitiad move build` to compile once — syntactic fixes may be needed as the compiler surfaces them.
- Privy social login assumes the connector exposes wagmi `signMessage` for EIP-191. Flip `PRIVY_COMPAT=false` once we verify strict matching works on a real Privy integration.

## v0.1.0 — initial scaffold

Initial monorepo + 6 Move modules + backend skeleton + frontend pages. See git history.
