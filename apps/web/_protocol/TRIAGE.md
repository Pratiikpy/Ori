# TRIAGE

Per-feature decision: **WIRE** (real backend) / **STUB** (reference UI shipped with disabled controls + "Coming soon" chip) / **DELETE** (remove and reflow).

Default rule applied where no human input: STUB unless removal would break layout, in which case DELETE; never WIRE without a §03 endpoint.

## Inbox

| Feature | Backend | Decision |
|---|---|---|
| Threads list | `GET /v1/chats` | WIRE — `useChats()` |
| Active thread name / handle / kind | derived from `/v1/chats` row | WIRE |
| Active thread message list | `GET /v1/messages/:chatId` | WIRE — `useChatMessages()` |
| Send encrypted message | `POST /v1/messages` + libsodium seal in `lib/crypto.ts` | WIRE — `useSendMessage()` |
| Online presence dot | `GET /v1/presence/*` (route exists) | WIRE — best-effort; STUB if hook complexity outsizes value (default STUB) |
| Typing indicator | none in REST routes | STUB — keep visual, no live signal |
| Read receipts | `POST /v1/messages/:id/read` | WIRE on viewport-enter (best effort) |
| Quick actions row (encrypted DM / mark read / pay from chat / chat gift) | `msgSendPayment`, `msgCreateLinkGift`, REST | WIRE — open ActionDialog routed through useAutoSign for the contract-backed ones; STUB chip on "encrypted DM" since the composer below is the real send path |
| MCP control room — authorized agents card | `GET /v1/agent/user/:addr/actions` distinct agentAddr | WIRE — derive from agent actions |
| MCP — Actions tab | `GET /v1/agent/user/:addr/actions` | WIRE — `useAgentActionsByOwner(initiaAddress)` |
| MCP — Tools tab (mcpTools static list) | static catalogue | KEEP — these are tool names, not data; no backend needed |

## Money

| Feature | Backend | Decision |
|---|---|---|
| Total wallet balance | none — no balance fetcher in lib yet | STUB — show "Connect wallet" copy + 0 INIT placeholder; chip "Live balance soon"; OR pull from useInterwovenKit() if available |
| Agent daily cap card | `agent_policy.move` view function (none in api) | STUB |
| Gift visual card | static `media.gift` image | KEEP — pure decoration |
| Portfolio grid (4 tiles) | `GET /v1/profiles/:address/portfolio` `stats.*` | WIRE — `usePortfolio(initiaAddress)` |
| Tab: Payments — Send / Bulk / Tip | `msgSendPayment`, `msgBatchSend`, `msgTip` | WIRE via ActionDialog → useAutoSign |
| Tab: Gifts — every action | `msgCreate*Gift`, `msgClaim*Gift`, `msgReclaim*`, `msgRegisterGiftBox` | WIRE |
| Tab: Streams — open / withdraw / close | no helpers in contracts.ts | STUB |
| Tab: Subscriptions — register / subscribe / release / cancel / deactivate | most helpers exist; cancel doesn't | WIRE for register/subscribe/release/deactivate; STUB cancel |
| Tab: Paywalls — create / purchase / deactivate / register-merchant | no msg helpers in contracts.ts | STUB the action grid (note: legacy `paywall/*` routes have own logic, but the action-card grid here is contract-msg style) |
| Tab: Sponsor — status / claim seed / sponsored .init | `/v1/sponsor/*` REST | WIRE — three REST calls |

## Play

| Feature | Backend | Decision |
|---|---|---|
| Intro card copy | static | KEEP |
| Slinky live oracle (top 3 pairs) | `GET /v1/oracle/tickers` + per-pair `/v1/oracle/price` | WIRE — `useOraclePrice('BTC/USD')` etc. for top 3 |
| Tab: Wagers — propose / accept / resolve / etc | full `msgWager*` set | WIRE all 9 actions |
| Tab: Prediction markets — create / stake YES / stake NO / resolve / claim | helpers exist | WIRE |
| Tab: Prediction markets — AI predict | MCP tool, no contract msg | STUB |
| Tab: Lucky pools — create / join / draw | helpers exist | WIRE |

## Explore

| Feature | Backend | Decision |
|---|---|---|
| Discover grid: recent | `GET /v1/discover/recent` | WIRE |
| Discover grid: top creators | `GET /v1/discover/top-creators` | WIRE |
| Discover grid: rising | `GET /v1/discover/rising` | WIRE |
| Tab: Leaderboards (creators / tippers / per-profile tippers) | `/v1/leaderboards/*`, `/v1/profiles/:address/top-tippers` | WIRE |
| Tab: Oracle prices grid (live mocked drift) | `/v1/oracle/tickers` + per-pair price | WIRE — replace setInterval drift with React Query refetch every 5s |
| Tab: Activity (mira purchased paywall, etc — hard-coded strings in reference) | `GET /v1/profiles/:address/activity` (per-address) OR none for global feed | STUB — global activity feed has no endpoint; show 4 placeholder rows + chip |
| Tab: Squads (5 actions) | `msgCreateSquad`, `msgJoinSquad`, `msgLeaveSquad`, `msgDisbandSquad`, `msgTransferSquadLeader` | WIRE |

## Profile

| Feature | Backend | Decision |
|---|---|---|
| Identity card (handle / bio / address / followers / following / trust) | `GET /v1/profiles/:address` + `/follow-stats` + `/trust-score` | WIRE |
| Agent policy card — slider (daily cap) | `msgSetAgentPolicy` on submit; current value: no view fn in api | WIRE the submit, STUB the displayed-current-value (default 250 INIT) until view fn exists |
| Agent policy card — privacy switch | `msgUpdatePrivacy` | WIRE |
| Authorized agents list | distinct agentAddr from `GET /v1/agent/user/:addr/actions` | WIRE |
| Achievements card | `GET /v1/profiles/:address/badges` | WIRE — replace static `achievements` mock |
| Quests card | `GET /v1/profiles/:address/quests` | WIRE |
| Merchant + links card | `lib/api-profile` profile.links | WIRE — render `profile.links` if any; STUB if empty + chip |
| Notifications card — push / auto-sign | `/v1/push/subscribe` REST + `useAutoSign` toggle | WIRE auto-sign toggle (already a hook); STUB push subscribe (browser permissions complexity) |
| Tab: Identity actions (create profile / update bio / set slug / etc.) | `msgCreateProfile`, `msgUpdateBio`, etc. | WIRE |
| Tab: Reputation actions (thumbs up / down / retract / attest) | no helpers | STUB |
| Tab: Agent policy actions (set / revoke / kill switch) | `msgSetAgentPolicy`, `msgRevokeAgent`; kill switch missing | WIRE first two, STUB kill switch |
| Tab: Settings — push subscribe / push delete / agent card | REST | STUB push (browser PermissionAPI complexity); WIRE agent card as link |

## Landing
Already shipped. All visual elements are static — no backend wiring needed. Only change still pending: actual `Cabinet Grotesk` self-host (currently Manrope substitute). Out of scope for this run; flagged in DECISIONS.

## Cross-page

| Feature | Backend | Decision |
|---|---|---|
| OriShell sidebar wallet card | `useInterwovenKit` (already wired) + `useUsernameQuery` | WIRE — already done in last commit |
| OriShell sidebar balance | none | STUB — TODO comment in place |
| OriShell topbar trust badge | `GET /v1/profiles/:address/trust-score` | WIRE |
| OriShell topbar agent-cap badge | no view fn | STUB — show "250 INIT" placeholder + chip |
