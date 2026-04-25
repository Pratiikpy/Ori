# Network smoke test — SKIPPED in this run

Per `_protocol/DECISIONS.md` § "What's NOT being done in this run":
visual diffing and network-tab capture both require Playwright + a running
reference + a running deployment with full client-side hydration. Not
tractable in a single conversation alongside the wiring work.

## Substitute verification — grep-based hook coverage

For each WIRE row in `TRIAGE.md`, we grep the page file for the corresponding
hook usage. If the hook name appears in JSX (i.e. it's actually called and
its return value reaches the rendered output), we treat the WIRE as
landed. STUB rows are checked for `Coming soon` chip presence.

The `verify/<Page>.md` files contain the row-by-row trace.

## Commands the user can run to confirm network calls fire

Open `https://ori-chi-rosy.vercel.app/inbox` (with wallet connected) and in
DevTools Network tab, filter by `/v1/`. Expected requests on each page load:

| Page | Expected requests |
|---|---|
| `/inbox` | `GET /v1/chats`, `GET /v1/messages/<id>` (after select), `GET /v1/agent/user/<addr>/actions`, `GET /v1/profiles/<recipient>/encryption-pubkey` (on send) |
| `/explore` | `GET /v1/discover/recent`, `GET /v1/discover/top-creators`, `GET /v1/discover/rising`, `GET /v1/leaderboards/top-creators`, `GET /v1/leaderboards/top-tippers`, `GET /v1/profiles/<addr>/top-tippers`, `GET /v1/oracle/price?pair=BTC/USD` × 5 |
| `/money` | `GET /v1/profiles/<addr>/portfolio` |
| `/play` | `GET /v1/oracle/price?pair=BTC/USD` (×3, refetch every 5s) |
| `/profile` | `GET /v1/profiles/<addr>`, `/follow-stats`, `/trust-score`, `/badges`, `/quests`, `/v1/agent/user/<addr>/actions` |

If any of these are missing in the browser network panel, the corresponding
hook isn't reaching the JSX — verify back at the per-page verify file.

## Authentication

Pages that hit auth-gated routes (Inbox `/v1/chats`, `/v1/messages/*`) must
have a session token in `localStorage['ori.session_token']`. The session
boot flow is `components/session-boot.tsx`. Without a session, those reads
return 401 — the hooks surface that as `error` state and the page renders
the disconnected/empty fallback. This is correct behavior, not a bug.
