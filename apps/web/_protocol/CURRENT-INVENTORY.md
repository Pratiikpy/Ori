# CURRENT-INVENTORY

Source: `apps/web/src/app/`

## Routes
### `(marketing)/` — root layout passthrough, no providers
- `page.tsx` — Landing (Server Component, ported from Landing.jsx). All 5 CTAs link to `/inbox`.

### `(ori)/layout.tsx` — `<Providers>` + `<OriShell>`
- `inbox/page.tsx` — ported, currently uses static `threads` mock + `agentActions`/`authorizedAgents`/`mcpTools` mocks
- `money/page.tsx` — ported, uses `currentUser.balance`, `media.gift`, `portfolio`, `moneyTabs`
- `play/page.tsx` — ported, uses `oraclePrices` mock, `playTabs`
- `explore/page.tsx` — ported, uses `discover`, `leaderboards`, `oraclePrices` mocks; `tick` simulated drift
- `profile/page.tsx` — ported, uses `currentUser`, `authorizedAgents`, `achievements`, `quests`, `profileActions`

### `(legacy)/layout.tsx` — `<Providers>` only (no shell at layout level)
Pages that already wrap themselves in `<AppShell>` (the older shell, not OriShell):
- `chat/[identifier]/page.tsx` — wires `useChat` → real DM via `lib/api-chats`, `useResolve`, `useAutoSign`. Already real-data.
- `send/page.tsx`, `send/bulk/page.tsx` — single-page payment composer, uses `msgSendPayment` via `useAutoSign`. Real-data.
- `squads/page.tsx` — squads.move msg helpers via useAutoSign. Real-data with localStorage cache.
- `paywall/[id]/page.tsx`, `paywall/[id]/pay/page.tsx`, `paywall/mine/page.tsx`, `paywall/new/page.tsx`. Real-data.
- `subscriptions/page.tsx` — register/subscribe/release plans via subscription_vault.move. Real-data.
- `agent/[address]/page.tsx` — public agent profile. Likely real-data.
- `[identifier]/page.tsx`, `[identifier]/followers/page.tsx`, `[identifier]/following/page.tsx` — public profile pages. Real-data via api-profile, follows.

### `api/` — server routes (OG image generation, etc.). Not visible UI.

## Components
- `components/ori-shell.tsx` — new, brutalist shell. Already partially wired: `useInterwovenKit` → initiaAddress + disconnect, `useUsernameQuery` → handle. Balance still mocked.
- `components/action-dialog.tsx` — new, ported. `submitAction` is toast-only — needs backing by real `msg*` helpers per action.
- `components/providers.tsx` — wraps Wagmi + InterwovenKit + QueryClient + Sonner Toaster. Stays.
- `components/app-shell.tsx` (+ `layout/*`) — older shell used by (legacy) pages. Stays.

## Lib
- `lib/api.ts` — base fetcher + session token storage
- `lib/api-chats.ts` — `fetchChats()`
- `lib/api-profile.ts` — partial profile helpers
- `lib/api-presence.ts` — presence ping
- `lib/contracts.ts` — Move msg builders (`msgSendPayment`, `msgCreateSquad`, etc.)
- `lib/crypto.ts` — libsodium sealed-box for encrypted DMs
- `lib/resolve.ts` — .init name ↔ address resolution
- `lib/chain-config.ts` — chain id, RPC, REST, API_URL
- `lib/tx.ts` — InterwovenKit submit helper

## Hooks
- `use-auto-sign.ts`, `use-keypair.ts`, `use-presence.ts`, `use-presence-set.ts`, `use-resolve.ts`, `use-session.ts`, `use-sign-challenge.ts`, `use-sponsor.ts`, `use-toast.ts`, `use-typing-indicator.ts`

## Data
- `data/ori-data.ts` — mock object exports (currentUser, threads, etc.) + form-data tabs (moneyTabs, playTabs, profileActions). Form-data stays. Mock object exports get phased out as hooks land.
