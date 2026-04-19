# Shipment 1 — minimum viable Vercel + Supabase deploy

Goal: public URL you can share; users can sign in, send money, chat.
Scope: web + API + DB + Redis. No event-listener, no realtime, no workers.

## What we get from Supabase (easy wins, no extra work)

Beyond raw Postgres, we get these for free just by using Supabase:

- **Supavisor connection pooling** — critical for serverless. Without it, Vercel Fluid Compute burns through Postgres connection limits in minutes. Use the pooled URL for runtime, direct URL for migrations.
- **Automated daily backups** — 7-day retention on free tier. Prisma Studio + pg_dump no longer required.
- **Dashboard SQL Editor** — queries + logs in one place.
- **Future-ready for Realtime / Edge Functions** — Shipment 2 builds on the same project.

Two things we explicitly DON'T use:
- Supabase Auth — our EIP-191 wallet auth is better for a chat wallet.
- Supabase Row Level Security — our API already enforces auth in middleware. Turning RLS on would require rewriting every query with JWT claims. Skip it. We'll use service-role key + trust our API layer.

## Phases (each reversible, each keeps local dev green)

### A — Read + document (30 min)
Before touching code, read and understand:
- `apps/api/src/index.ts` + `server.ts` — how Fastify currently boots
- `apps/api/src/lib/prisma.ts` — Prisma client init
- `apps/api/src/lib/redis.ts` — ioredis setup (verify Upstash compat)
- `apps/api/prisma/schema.prisma` — find any PG extensions we depend on
- `apps/web/src/lib/api.ts` — confirm web uses `NEXT_PUBLIC_API_URL`
- Supabase docs on: Supavisor connection-string shape, pgbouncer mode, Prisma-specific setup

Output: notes in this doc on any gotchas.

### B — Refactor Fastify bootstrap into `buildServer()` (45 min)
Today `apps/api/src/index.ts` probably does `buildServer() + listen()` + starts
worker + event-listener + Socket.IO in one file. For serverless, the HTTP
routes need to initialize without listening and without starting the worker.

Split into:
- `apps/api/src/server.ts` → export `buildServer(): FastifyInstance` (routes + plugins only, no listen, no worker, no listener, no socket.io)
- `apps/api/src/index.ts` → `buildServer() → listen() + startWorker() + startEventListener() + startSocketIO()` — the current Node process entry, unchanged for local dev
- New: `apps/web/src/app/api/[...path]/route.ts` imports `buildServer` from `@ori/api/server`, caches the instance across warm invocations, calls `.inject()` per request

Local dev command (`pnpm --filter @ori/api dev`) keeps working: uses `index.ts` entry.
Vercel deploy: uses the catchall route, which uses `server.ts` exports only.

### C — Connection pooling + Prisma for serverless (30 min)
Vercel serverless invocations each spin up a fresh Node runtime. Prisma's
default connection behavior opens a pool per invocation. At 100 concurrent
invocations × 10 connections = 1000 sockets to Postgres. Supabase free tier
caps at ~60 direct connections. So:

- Runtime `DATABASE_URL` = Supavisor pooled (transaction mode, port 6543)
- Migration `DATABASE_URL` = direct (port 5432, pooler bypassed)
- Prisma client: add `?pgbouncer=true&connection_limit=1` query params to pooled URL
- Prisma schema: ensure no `CREATE EXTENSION` statements that need direct conn

### D — Redis for serverless (15 min)
Upstash gives a `rediss://` URL (TLS). ioredis auto-detects the scheme.
Only change: verify nothing in our code does `redis.duplicate()` or holds
long-lived subscriber connections in the API layer (those would fail in
serverless). Spot check `redis.ts` callers.

### E — Web env + API URL (10 min)
- `apps/web/src/lib/api.ts` — confirm uses `NEXT_PUBLIC_API_URL`
- When deployed on Vercel, web + API are on the SAME domain, so
  `NEXT_PUBLIC_API_URL=""` (same-origin) just works. Catchall `/api/[...path]`
  on Vercel receives requests.
- For local dev: `NEXT_PUBLIC_API_URL=http://localhost:3001` still points at
  the standalone Fastify for parity.

### F — Vercel config (20 min)
`vercel.json` at repo root:
- `buildCommand`: `pnpm build --filter @ori/web...`
- `outputDirectory`: `apps/web/.next`
- `installCommand`: `pnpm install --frozen-lockfile` (must pick up our `ky` override)
- `functions`: `apps/web/src/app/api/[...path]/route.ts` → maxDuration 30s
- `framework`: `nextjs`
- Env vars documented (filled in Vercel UI)

### G — Deploy runbook `DEPLOY.md` (30 min)
Step-by-step for the user:
1. Create Supabase project (2 min)
2. Get both DATABASE_URLs from dashboard (1 min)
3. Add Upstash Redis via Vercel marketplace (2 min)
4. Import GitHub repo in Vercel (1 min)
5. Paste env vars (3 min)
6. Run `npx prisma migrate deploy` against direct URL (1 min)
7. Optional: run seed script (2 min)
8. Deploy (automatic on git push, or click Deploy in Vercel)
9. Test: open URL, connect wallet, send a test payment

Total user time: ~15-20 minutes of clicking.

### H — Verify (30 min)
- Run full test suite against **local** Postgres — must stay 177 green
- Run smoke test suite against **Supabase staging** — document any skips
- `vercel dev` locally — hit `/api/v1/health`, verify same response as standalone
- Deploy to Vercel preview, test the 3 critical flows:
  - auth: challenge → sign → verify → JWT → /v1/auth/me
  - send: POST /v1/payments/send
  - chat: GET /v1/chats

## Total

~3 hours of my focused work. You: 15-20 min of clicking when ready to deploy.

## Files I'll touch

New:
- `apps/web/src/app/api/[...path]/route.ts`
- `vercel.json`
- `.env.production.example`
- `DEPLOY.md`

Modified:
- `apps/api/src/index.ts` — split bootstrap
- `apps/api/src/server.ts` — export `buildServer()` (may already)
- `apps/api/prisma/schema.prisma` — no change expected, but verify
- `apps/web/.env.example` — add `NEXT_PUBLIC_API_URL`

Zero changes to:
- All Fastify routes (20+ files)
- Prisma schema (other than maybe adding a `?connection_limit=1`)
- UI components
- Move contracts
- MCP server
- Test files

## Risk register (Shipment 1 only)

| Risk | Mitigation |
|---|---|
| Fastify-inject translates response wrong for streaming | We don't stream; all responses are JSON. Verify in Phase B smoke test. |
| Prisma connection exhausts Supavisor pool | Pooled URL + `connection_limit=1` + singleton client. Standard serverless-Prisma setup, documented. |
| `ky` bug returns on fresh install | `pnpm.overrides` already in root package.json ensures fresh install pulls ky@^1.14.0 |
| Cold start >3s causes auth UX lag | Fastify + Prisma singleton = ~500ms warm, 1-2s cold. Acceptable. |
| Secrets accidentally committed | `.env.production.example` uses placeholders; real values only in Vercel UI. |

## What's explicitly out of scope for Shipment 1

- Event listener (will stay local until Shipment 2)
- Socket.IO / Realtime (will be stubbed; frontend gracefully handles no-connection)
- Graphile Worker (scheduled actions won't run in prod until Shipment 2)
- Web push delivery
- Achievement auto-issuance

Users can still: sign in, view profile, send payments, chat, view portfolio,
predict, tip, gift. They cannot: receive real-time payment cards, get
auto-issued badges, rely on scheduled-payment tasks.
