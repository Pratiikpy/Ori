# Shipment 2 — real-time feed parity via Supabase Edge Functions

Goal: everything that runs as a Node process today (event-listener, Graphile
Worker, Socket.IO broadcast) moves to Supabase so the app is fully hosted.
Local dev keeps running exactly the same Node services; prod uses Edge
Functions. Same decoding logic, two runtimes.

## What "done" means

After Shipment 2, opening the deployed URL and sending a payment from one
browser tab results in:

1. Tx lands on chain (already works, Shipment 1)
2. Event listener Edge Function picks it up within 60s
3. `payment_events` row appears in Supabase Postgres
4. `/today` feed of the recipient shows the event
5. Supabase Realtime pushes a payment-card to the recipient's other tab
   (which is subscribed via `apps/web/src/lib/realtime.ts`)

All without a single Node process running in production.

## Architecture

```
Supabase
├── Postgres
├── pg_cron              ── schedules every 60s
│   └── invokes via pg_net → Edge Function URL
├── Edge Functions (Deno)
│   ├── event-listener         (polls rollup, decodes, writes)
│   ├── scheduled-action-runner (drains graphile_worker.jobs)
│   ├── web-push-fanout        (reads outbox, sends push)
│   └── achievement-issuer     (reads payment/tip events, mints badges)
└── Realtime                   (Fastify broadcast + web subscribes)

packages/event-decoder
├── src/
│   ├── types.ts               (TipSent, PaymentSent, GiftCreated, BadgeAwarded)
│   ├── bech32.ts              (hex → init1...)
│   ├── decoder.ts             (parseBlockResults → decoded events)
│   └── index.ts
├── package.json               (type: module, no runtime deps)
└── tests/
    └── decoder.test.ts        (fixture blocks → expected events)
```

## Shared decoder package — the linchpin

The event listener's risky part is Move-event decoding: 500 lines of
type-switching on `TipSent` / `PaymentSent` / `GiftCreated` / `BadgeAwarded`
event structs, with bech32 conversion and BCS field extraction. Rewriting
this twice (Node + Deno) = shipping the bugs twice.

Solution: extract the pure decoder into `packages/event-decoder`:
- Only primitives: no DB, no Redis, no Socket.IO, no node:* imports
- Input: a CometBFT `/block_results` JSON payload
- Output: an array of `{ type, height, txHash, data }` typed events
- Importable from Node (relative path) AND Deno (via esm.sh bundle or raw
  GitHub URL since Supabase Edge Runtime supports both)

Tests in this package verify `parseBlockResults(fixture) === expected`.
Running them in both Node (vitest) and Deno (`deno test`) gives us
cross-runtime parity.

## Phases

### A — Plan (this doc) ✅

### B — `packages/event-decoder` (1 hr)
Extract the decode logic from `apps/api/src/services/eventListener.ts`.
Keep: type guards, bech32 conversion, event type switch. Drop everything
related to I/O (Prisma, Redis, Socket.IO, outbox).

Deliverable: `packages/event-decoder/` with tests passing under both Node
vitest and Deno.

### C — Refactor Node listener to use the shared package (30 min)
The Node listener becomes: pull → call `parseBlockResults(response)` from
`@ori/event-decoder` → loop over decoded events → write via Prisma.

Local dev tests must stay 100% green. The listener's behavior is unchanged —
we just moved the decoder.

### D — Deno Edge Function `event-listener` (2 hrs)
`supabase/functions/event-listener/index.ts`:
- Imports shared decoder from esm.sh (Supabase's preferred import style)
- Postgres via `https://deno.land/x/postgresjs@v3.4.5/mod.js`
- Flow: read cursor → fetch `/block_results` → parse → insert events → write
  cursor → broadcast via `supabase.channel(...).send(...)`
- Self-terminates under the 400s Edge Function limit (we only process up to
  50 blocks per tick, finishes in <10s)

### E — `supabase/config.toml` + migration SQL (30 min)
```toml
[functions.event-listener]
verify_jwt = false    # pg_cron invokes without a user JWT
```

Migration:
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- Schedule invocation every minute
select cron.schedule(
  'event-listener',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/event-listener',
       headers := jsonb_build_object(
         'Authorization', 'Bearer <service_role_key>',
         'Content-Type', 'application/json'
       )
     ) $$
);
```

### F — Realtime adapter (1 hr)
Introduce `apps/web/src/lib/realtime.ts` that abstracts Socket.IO vs
Supabase Realtime:
- Checks for `NEXT_PUBLIC_SUPABASE_URL` — if set, uses Supabase
- Else falls back to Socket.IO (for local dev)
- Same API: `.on('payment.new', handler)`, `.off(...)`, `.close()`

Replace `getSocket()` callers with `getRealtime()`. Both transports work
simultaneously in dev if both env vars are set (useful for A/B testing).

### G — API broadcast helper (30 min)
New `apps/api/src/lib/broadcast.ts`:
- `broadcast(room, event, payload)` dispatches to:
  - Socket.IO if `app.io` is defined (Node long-running mode)
  - Supabase Realtime if `SUPABASE_SERVICE_ROLE_KEY` is set (serverless mode)
- Either-or or both — no divergence

All `app.io.to(...).emit(...)` callsites in routes become `broadcast(room, event, payload)`.

### H — DEPLOY2.md runbook (30 min)
- Enable pg_cron + pg_net in Supabase dashboard
- Deploy Edge Functions: `supabase functions deploy event-listener`
- Run the cron-schedule SQL migration
- Set secrets (service role key, RPC URL, rollup REST)
- Verify: make a tx, watch the row land in payment_events within 60s

### I — Verify end-to-end (1 hr)
- Local dev: 177 tests still green
- Staging: fire a payment → appears in Supabase within 60s
- Frontend: Realtime push delivers payment card to recipient tab

## Scope cuts (will ship in Shipment 3)

These services are present in the Node stack but we're NOT porting them in
Shipment 2. Their work can wait:

- **`achievement-issuer`** — mints SBTs after first payment. Manually mintable via MCP. Not blocking.
- **`web-push-fanout`** — web push is nice-to-have; real-time in-app already works via Realtime.
- **`scheduled-action-runner`** — lets users schedule a payment for "tomorrow 9am". Feature is discoverable via MCP; UI support pending.

Porting these to Edge Functions is straightforward once the event-listener
pattern is proven. Each one = ~30 min of Deno work.

## Risk register (Shipment 2 only)

| Risk | Severity | Mitigation |
|---|---|---|
| Deno decode drifts from Node | **high** | Shared package + same tests run under both runtimes |
| postgres-js on Deno has quirks | medium | Widely used in Supabase community; follow their templates |
| pg_cron requires 5-field cron (no sub-minute) | low | Accepted — 60s lag is fine, documented in UX copy |
| Edge Function cold start adds latency | low | Invocation runs in background on cron; user never waits |
| SUPABASE_SERVICE_ROLE_KEY leaked | medium | Store only as Supabase Function Secret; never in git |
| Realtime messages miss subscribers | low | Broadcast is fire-and-forget; UI also polls /today on focus |

## What stays unchanged

- Every Fastify route in `apps/api/src/routes/*` — no changes
- Every UI component that reads event data — reads the same tables
- Prisma schema — no new tables
- EIP-191 auth — not touched
- All 177 existing tests — pass without modification
- Local dev via docker-compose + `pnpm --filter @ori/api dev` — unchanged

## Total time

~7 hours. Broken into commits per phase for rollback safety.
