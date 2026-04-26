# Ori Frontend PRD / Handoff

## Original problem statement
Build the best frontend possible for Ori, a chat wallet on the Initia rollup. Every reachable feature must be real and connected to existing backend/on-chain helpers; no frontend-only fake features. User clarified: backend is in repo, use existing wallet integration, focus on existing current frontend features that were visually misaligned, and use a minimal professional design.

## Architecture decisions
- Preserve the existing Next.js monorepo frontend and Fastify-in-repo API adapter.
- Keep the active Ori surfaces: Inbox, Money, Play, Explore, Profile.
- Use real existing Move message helpers and documented `/v1` API clients only; removed fake/simulated action states from active UI.
- Adopt minimal Swiss-style visual direction: high contrast, sharp borders, blue accent, Archivo/Manrope typography.
- Require public frontend URLs/config through environment values and provide local web env values for development.

## Implemented
- Redesigned active Ori surfaces with tighter alignment, minimal high-contrast styling, and no visible “coming soon/simulated/mock” labels.
- Updated generic action modal to submit through page handlers only; no simulated confirmation toasts.
- Wired Money actions for streams, paywalls, merchant registration, subscription cancellation, gift claim/reclaim/group slot flows, and link metadata best-effort backend calls where available.
- Updated Play wager/market forms to use concrete IDs/fields rather than repurposed generic inputs.
- Replaced Explore public placeholder activity with connected-user activity state.
- Wired Profile reputation and push actions to existing helpers/client endpoints; removed disabled reputation stub UI.
- Added sidebar data-testids and improved disconnected Profile action cards.
- Verified `corepack pnpm --filter @ori/web typecheck` passes and key routes return 200 locally.

## Known limitations / environment notes
- Backend API validation was not completed in this container because required backend env vars/services are not configured (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ORI_RPC_URL`, `ORI_REST_URL`, contract address, VAPID keys). Frontend now points to the in-repo `/api` adapter locally, but the adapter needs those real values to serve `/v1` responses.
- Connected-wallet transaction flows require a real wallet session and real contract module address.

## Prioritized backlog
### P0
- Provide real backend/API environment values and verify `/api/health`, `/api/v1/discover/recent`, `/api/v1/chats`, `/api/v1/users/me`.
- Connect wallet in test environment and validate Money/Profile/Play transaction flows end-to-end.

### P1
- Add connected-wallet automated tests for profile reputation, push subscription, agent policy, and privacy settings.
- Improve API error states so failed backend configuration appears as a clean product-level notice instead of console-only failures.

### P2
- Add richer responsive visual polish for mobile action-heavy pages.
- Add shareable success summaries after gifts, paywalls, wagers, and weekly stats.


## Deployment fix — Vercel env vars
- Vercel build failed because `NEXT_PUBLIC_JSON_RPC_URL` was missing after frontend config was changed to fail fast when required public chain env values are absent.
- Updated `/app/.env.production.example` to include all required `NEXT_PUBLIC_*` values used by `apps/web/src/lib/chain-config.ts`, including JSON-RPC, native denom/symbol/decimals, bridge, app, websocket, and L1 username portal values.
- Verified `pnpm --filter @ori/web build` completes locally when env values are present.

### Required Vercel public env checklist
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_WS_URL
- NEXT_PUBLIC_CHAIN_ID
- NEXT_PUBLIC_RPC_URL
- NEXT_PUBLIC_REST_URL
- NEXT_PUBLIC_JSON_RPC_URL
- NEXT_PUBLIC_NATIVE_DENOM
- NEXT_PUBLIC_NATIVE_SYMBOL
- NEXT_PUBLIC_NATIVE_DECIMALS
- NEXT_PUBLIC_ORI_MODULE_ADDRESS
- NEXT_PUBLIC_BRIDGE_SRC_CHAIN_ID
- NEXT_PUBLIC_BRIDGE_SRC_DENOM
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_L1_CHAIN_ID
- NEXT_PUBLIC_L1_REST_URL
- NEXT_PUBLIC_L1_USERNAMES_PORTAL_URL
