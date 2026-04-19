# Ori production migration — Vercel + Supabase + Upstash

Target: move from "everything runs on my laptop in Docker" to a fully hosted
$0/month production stack.

## Current vs target architecture

### Current (local dev, what all 177 tests run against)

```
Laptop (Docker)
├── apps/web           Next.js 16 @ :3000
├── apps/api           Fastify @ :3001
│   ├── Fastify routes (auth, chats, payments, ...)
│   ├── event-listener (24/7, polls rollup :26657 every 2s)
│   ├── Graphile Worker (polls DB every 500ms for jobs)
│   ├── Socket.IO server (real-time push to web)
│   └── webPush / achievementIssuer / sponsor services
├── ori-1 rollup       CometBFT/MiniMove @ :26657/:1317
├── Postgres 16        Docker @ :5433
└── Redis 7            Docker @ :6379
```

### Target (production)

```
Vercel (free, Hobby)
└── apps/web           Next.js 16 SSR + API routes
    └── /api/[...]     ← Fastify app wrapped as a single serverless function

Supabase (free)
├── Postgres            the same schema Prisma deploys today
├── Realtime            ← replaces Socket.IO for server→web push
├── Storage             (future: avatars)
└── Edge Functions (Deno)
    ├── event-listener  ← pg_cron invokes every 30s, polls rollup REST
    ├── achievement-issuer
    ├── web-push-fanout
    └── scheduled-action-runner

Upstash (free, 1-click from Vercel)
└── Redis               idempotency cache + rate limits (no pubsub needed)

Cloudflare Tunnel (free)
└── ori-rollup-tunnel   exposes laptop :1317 to https://ori-1.<user>.trycloudflare.com
                        (later replaced by a real rollup deploy)
```

Four hosts, all free tier. The only moving piece during the migration is
porting three Node-with-Prisma services into Deno Edge Functions — every
other layer is just env-var swap.

## Scope — what changes, what doesn't

### Doesn't change (these stay identical)

- Prisma schema + all migrations — Supabase IS vanilla Postgres
- Fastify routes (auth, chats, messages, payments, portfolio, agent, etc.)
- Web app UI (all 177 test-passing pages) — only `NEXT_PUBLIC_API_URL` moves
- Move contracts on ori-1 — unaffected
- MCP server — unaffected (runs on user's machine via `npx`)
- EIP-191 wallet auth — keep it, it's better than Supabase Auth
- Auth sessions in Postgres — keep it
- Outbox pattern — keep it (table-backed, DB-agnostic)
- 177 tests — pass unchanged against local Docker OR Supabase

### Changes

| Component | Today | Target | Type of change |
|---|---|---|---|
| Postgres host | Docker :5433 | Supabase | **env var** (DATABASE_URL) |
| Redis host | Docker :6379 | Upstash | **env var** (REDIS_URL) |
| Fastify entry | `src/server.ts` listen(3001) | `/api/[...path]/route.ts` wraps Fastify | **new adapter file**, no route changes |
| Event listener | Node process, `setInterval` | Supabase Edge Function + pg_cron | **port Node → Deno** |
| Graphile Worker | Node process, DB poll | pg_cron + Edge Function per task | **port tasks → Deno** |
| Socket.IO | Fastify.ws server | Supabase Realtime broadcast | **swap client SDK** |
| Web push delivery | Node service | Edge Function invoked on outbox insert | **port Node → Deno** |
| Rollup access | localhost:26657 | Cloudflare Tunnel public URL | **infra setup** |

### Disappears

- Long-running Node process for `apps/api` (was hosting listener + worker + socket.io)
- Docker compose in production (still used in dev)
- Node `socket.io-client` package in frontend

## Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Fastify cold start on Vercel > 3s | medium | Use Fluid Compute; lazy-init DB; cache Prisma client across invocations |
| Edge Function timeout (Supabase 400s) | low | Each listener tick processes ≤25 blocks, finishes in <10s |
| Deno port drifts from Node behavior | high | Same test fixtures run against both; parity test suite |
| Rollup tunnel disconnects | medium | Cloudflare Tunnel supports auto-reconnect; add healthcheck that alerts |
| Prisma migrations on Supabase | low | Supabase is vanilla Postgres 16; `prisma migrate deploy` just works |
| Realtime replaces Socket.IO 1-to-1 | medium | Our usage is simple (emit event to user-room); Realtime broadcast covers it; isolate in an adapter |
| `ky` v2 bug in prod | resolved | Patch already applied via `wsl-patch-ky.sh` + `pnpm.overrides` |
| Supabase free tier DB pauses after 1 wk idle | low | Real product will have traffic; click to unpause is 30s |

## Phases

Each phase is independent, reversible, and keeps local dev green.

### Phase 0 — planning (this document)
Write the plan. Flag blockers. Decide on rollup exposure. ✅ **You are here.**

### Phase 1 — Supabase Postgres dry run (30 min)
- Create empty Supabase project (you do this, free tier)
- Export `DATABASE_URL` from Supabase dashboard
- Run `pnpm prisma migrate deploy` against Supabase URL
- Verify schema landed via Supabase SQL Editor
- Seed against Supabase with existing seed script
- Run **all 177 tests** pointed at Supabase — must all pass
- If green: Supabase is drop-in. Postgres part is done.

Exit criteria: local tests pass with `DATABASE_URL=<supabase>`.

### Phase 2 — Upstash Redis dry run (15 min)
- Create Upstash Redis via Vercel marketplace (you do this)
- Export `REDIS_URL` — Upstash is ioredis-compatible
- Run tests that touch Redis (idempotency, rate limits) against Upstash
- Verify: `redis-cli -u $UPSTASH_URL ping` returns PONG

Exit criteria: idempotency middleware still dedupes correctly against Upstash.

### Phase 3 — Fastify on Vercel (2 hrs)
The tricky one. Fastify doesn't natively run on Vercel serverless — it's
built for long-lived Node servers. Two paths, I'll use (A):

**Path A (chosen):** wrap the whole Fastify app in a single Next.js Route
Handler at `apps/web/src/app/api/[...path]/route.ts`. The handler lazily
instantiates the Fastify app (cached across warm invocations) and calls
`app.inject({ method, url, headers, payload })` for each request. This works
because `fastify.inject()` is designed for testing — it routes a request
through Fastify without opening a socket, so it's serverless-safe.

**Path B (rejected):** rewrite every Fastify route as a Next.js Route Handler.
Would cost 2 days, would double our route-file count, would break tests.

- New file: `apps/web/src/app/api/[...path]/route.ts` (30 lines)
- Patch `apps/api/src/server.ts` to export `buildServer()` without listening
- Set up `vercel.json` with `maxDuration: 30`
- Warm the DB pool: Prisma singleton across invocations
- `vercel dev` smoke test locally

Exit criteria: `curl http://localhost:3000/api/v1/health` returns the same
JSON as `curl http://localhost:3001/health`.

### Phase 4 — Event listener as Edge Function (2 hrs)
The second tricky one. Port `apps/api/src/services/eventListener.ts`
(500 lines of Move event decoding) from Node/Prisma → Deno/postgres-js.

Strategy: keep the decoding logic **pure** (no DB, no Redis in the
decode functions). Split decode from I/O so both Node and Deno can share
it via a new `packages/event-decoder` workspace.

- `packages/event-decoder/src/index.ts` — decoded-event types + decode fns,
  pure TS, no runtime deps, importable from both Node and Deno
- `apps/api/src/services/eventListener.ts` — use `packages/event-decoder`,
  keep the Node glue (Prisma writes + Redis pubsub)
- `supabase/functions/event-listener/index.ts` — Deno, uses
  `packages/event-decoder` (via esm.sh), writes to Postgres via
  `postgres-js`, emits to Supabase Realtime broadcast
- pg_cron schedule: every 30 seconds
- Cursor stored in `event_cursors` table (exists already)

Test strategy: same fixture blocks from rollup → run through both Node
and Deno decoders → assert identical output.

Exit criteria: a tx landed on the rollup appears in Postgres within 30s via
the Edge Function path.

### Phase 5 — Graphile Worker → pg_cron + Edge Functions (1 hr)
List current jobs: `scheduled-action`. That's it. One Edge Function.

- `supabase/functions/scheduled-action-runner/index.ts` — Deno
- pg_cron: every 1 min
- Logic: `SELECT * FROM graphile_worker.jobs WHERE run_at < now() LIMIT 10`
  then call the right handler per job type, update status

Exit criteria: scheduling a payment for +1min runs on the Edge Function.

### Phase 6 — Socket.IO → Supabase Realtime (1 hr)
Server emit: `io.to(userRoom).emit('payment.new', data)`
           → `supabase.channel(`user:${userId}`).send({ type: 'broadcast', event: 'payment.new', payload: data })`

Client receive: `socket.on('payment.new', cb)`
              → `supabase.channel(`user:${userId}`).on('broadcast', { event: 'payment.new' }, cb).subscribe()`

- New file: `apps/web/src/lib/realtime.ts` — abstracts Socket.IO vs Supabase
  based on env. Prod = Supabase, dev = Socket.IO (or also Supabase).
- Replace `getSocket()` callers with `getRealtime()` (same API shape)

Exit criteria: frontend receives a payment.new event after a tx in prod.

### Phase 7 — Deploy artifacts (30 min)
- `vercel.json` — maxDuration, env var bindings
- `supabase/config.toml` — Edge Function bundle config
- `.env.production.example` — documents every required env var
- `DEPLOY.md` — step-by-step runbook, 10-20 minutes of clicking

### Phase 8 — Verify everything (1 hr)
- Local dev still works (Docker compose + current code) — run all 177 tests
- Deploy to Supabase + Vercel staging
- Smoke test: sign in, send a payment, see it appear in realtime
- Verify event listener processed the tx (check cursor advanced)

## Rollback plan

At every phase, `git checkout` restores the previous state. The env-var swap
phases (1, 2) need zero code changes. The Edge Function phases (4, 5, 6)
add new files — deleting them restores Node services. The Vercel adapter
(phase 3) is additive — Fastify still runs as before under `pnpm --filter
@ori/api dev` for local work.

## Total time

- Phases 0+1+2+7+8: ~3 hrs (plan, env swaps, docs, verify)
- Phase 3 (Fastify on Vercel): ~2 hrs
- Phase 4 (event listener port): ~2 hrs
- Phase 5 (Graphile → pg_cron): ~1 hr
- Phase 6 (Socket.IO → Realtime): ~1 hr

**Total: ~9 hrs of focused work, spread across commits.**

## What I need from you before Phase 3

Three decisions that shape the execution:

1. **Rollup exposure — pick one**
   - [A] Cloudflare Tunnel now (`cloudflared tunnel --url http://localhost:1317`), free, auto-reconnect
   - [B] Deploy rollup to Fly.io (~1 hr setup, $0-2/mo)
   - [C] Skip event-listener deployment; run it locally until rollup is public
   
   Default if you don't answer: (A).

2. **Fastify-on-Vercel path — confirm**
   - I'll use `fastify.inject()` wrapped in a Next.js catchall Route Handler
   - Alternative is Path B (rewrite 20 routes) — not recommended
   
   Default: (A) — inject wrapper.

3. **Event-decoder shared package — confirm**
   - New workspace `packages/event-decoder` for decode logic shared between
     Node (current listener) and Deno (new Edge Function)
   - Alternative: duplicate the decode logic; two copies to keep in sync
   
   Default: new shared package.

If you reply "go" I'll take all three defaults and start Phase 1.
