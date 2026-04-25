# CLIENT-WRAPPERS

What exists vs what's needed to cover §03's WIRE rows.

## Already exist
| File | Functions | Backend route |
|---|---|---|
| `lib/api.ts` | `getSessionToken`, `setSessionToken`, `clearSessionToken`, `ApiError` | shared |
| `lib/api-chats.ts` | `fetchChats() → { chats: ChatSummary[] }` | `GET /v1/chats` |
| `lib/api-profile.ts` | partial (used by chat encrypted-pubkey fetch) | `GET /v1/profiles/:address/encryption-pubkey` |
| `lib/api-presence.ts` | `pingPresence` | `POST /v1/presence/ping` |
| `lib/resolve.ts` | `resolve(identifier)` (also a hook `use-resolve`) | direct on-chain via initiaClient |
| `hooks/use-auto-sign.ts` | InterwovenKit auto-sign wrapper | (drives `msg*` execution) |

## To be added (this run)
| File (new) | Hook (new) | Backend route(s) |
|---|---|---|
| `lib/api-messages.ts` | `useChatMessages`, `useSendMessage`, `useMarkMessageRead` | `GET /v1/messages/:chatId`, `POST /v1/messages`, `POST /v1/messages/:id/read` |
| `lib/api-oracle.ts` | `useOracleTickers`, `useOraclePrice` | `GET /v1/oracle/tickers`, `GET /v1/oracle/price` |
| `lib/api-portfolio.ts` | `usePortfolio` | `GET /v1/profiles/:address/portfolio` |
| `lib/api-discover.ts` | `useDiscoverRecent`, `useDiscoverTopCreators`, `useDiscoverRising` | `GET /v1/discover/{recent,top-creators,rising}` |
| `lib/api-leaderboards.ts` | `useTopCreators`, `useTopTippers`, `useProfileTopTippers`, `useGlobalStats` | `GET /v1/leaderboards/*`, `GET /v1/profiles/:address/top-tippers` |
| `lib/api-agent-actions.ts` | `useAgentActionsByOwner`, `useAgentActionsByAgent` | `GET /v1/agent/user/:addr/actions`, `GET /v1/agent/:addr/actions` |
| `lib/api-quests.ts` | `useQuests` | `GET /v1/profiles/:address/quests` |
| `lib/api-trust.ts` | `useTrustScore` | `GET /v1/profiles/:address/trust-score` |
| `lib/api-activity.ts` | `useActivity`, `useWeeklyStats` | `GET /v1/profiles/:address/activity`, `/weekly-stats` |
| `lib/api-follows.ts` | `useFollowStats`, `useFollowers`, `useFollowing` | `GET /v1/profiles/:address/{follow-stats,followers,following}` |
| `lib/api-profile.ts` (extend) | `useProfile`, `useBadges` | `GET /v1/profiles/:address`, `/badges` |

## Auth requirements per route
| Route | Auth | Notes |
|---|---|---|
| `/v1/chats`, `/v1/messages/*` | Bearer (requireAuth) | session token from `useSession` hook |
| `/v1/profiles/encryption-pubkey` (POST) | Bearer | |
| All `/v1/profiles/:address/*` (GET) | none | public reads |
| `/v1/oracle/*` | none | proxy |
| `/v1/discover/*`, `/v1/leaderboards/*`, `/v1/agent/*` | none | public reads |
| `/v1/quests`, `/v1/trust-score`, `/v1/activity`, `/v1/follow-stats` | none | public reads |

## Auth gating in UI
Pages requiring authenticated reads (Inbox messages, my-side activity) must check `useInterwovenKit().isConnected` and render a "Connect wallet" CTA when disconnected.
