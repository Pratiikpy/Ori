# CONTRACTS

`apps/web/src/lib/contracts.ts` — 62 `msg*` helpers covering every Move module visible in the reference + a few extras.

## Profile / identity
- `msgCreateProfile` — initial profile creation on chain
- `msgUpdateBio(sender, newBio)`
- `msgUpdateAvatar(sender, avatarUrl)`
- `msgUpdateLinks(sender, links, labels)`
- `msgUpdateTheme(sender, themeJson)`
- `msgSetSlug(sender, slug)`
- `msgUpdatePrivacy(...)` — hide_balance / hide_activity / whitelist_only_messages
- `msgSetEncryptionPubkey(sender, pubkey32B)`

## Follows
- `msgFollow({ follower, target })`
- `msgUnfollow({ follower, target })`

## Payments / tips / gifts (`payment_router.move`, `tip_jar.move`)
- `msgSendPayment(...)` — single payment with memo
- `msgBatchSend(...)` — bulk send (split bills)
- `msgTip(...)` — public creator tip
- `msgCreateDirectedGift(...)`, `msgCreateLinkGift(...)`, `msgCreateGroupGift(...)`
- `msgClaimLinkGift(...)`, `msgClaimDirectedGift(...)`, `msgClaimGroupSlot(...)`
- `msgReclaimExpiredGift(...)`, `msgReclaimExpiredGroup(...)`
- `msgRegisterGiftBox(...)` — reusable templates

## Wagers (`wager_escrow.move`)
- `msgProposeWager(...)`, `msgAcceptWager`, `msgResolveWager`, `msgCancelPendingWager`
- `msgProposeWagerFull`, `msgProposePvpWager`
- `msgConcedeWager`, `msgRefundExpiredWager`
- `msgProposeOracleWager`, `msgResolveFromOracle`

## Prediction markets (`prediction_pool.move`)
- `msgCreatePredictionMarket(...)`, `msgStakePrediction(...)`, `msgResolvePrediction`, `msgClaimPredictionWinnings`

## Lucky pools (`lucky_pool.move`)
- `msgCreateLuckyPool(...)`, `msgJoinLuckyPool`, `msgDrawLuckyPool`

## Subscriptions (`subscription_vault.move`)
- `msgRegisterSubscriptionPlan(...)`, `msgDeactivateSubscriptionPlan`
- `msgSubscribe(...)`, `msgReleaseSubscriptionPeriod`

## Squads (`squads.move`)
- `msgCreateSquad`, `msgJoinSquad`, `msgLeaveSquad`, `msgTransferSquadLeader`, `msgDisbandSquad`

## Agent policy (`agent_policy.move`)
- `msgSetAgentPolicy(...)`
- `msgRevokeAgent(...)`

## Execution
All helpers return a `MsgExecute` partial — the caller passes it to `useAutoSign(MOVE_MSG_TYPE).submit(...)` for one-tap small-tx OR to `kit.requestTxBlock([msg])` for the InterwovenKit drawer. Pattern reference: `app/(legacy)/send/page.tsx`, `app/(legacy)/squads/page.tsx`.

## Coverage vs reference action grids
| Reference action grid | Helper(s) | Status |
|---|---|---|
| Money / Payments → Send / Bulk / Tip | `msgSendPayment`, `msgBatchSend`, `msgTip` | ✅ |
| Money / Gifts (link/directed/group/claim/reclaim/box) | `msgCreate*Gift`, `msgClaim*Gift`, `msgReclaim*`, `msgRegisterGiftBox` | ✅ |
| Money / Streams (open / withdraw / close) | none in contracts.ts | ❌ STUB — payment_stream.move helpers don't exist yet |
| Money / Subscriptions | `msgRegisterSubscriptionPlan`, `msgSubscribe`, `msgRelease*`, `msgDeactivate*` | ✅ (most) |
| Money / Paywalls | none in contracts.ts | ❌ STUB — paywall.move helpers don't exist (note: legacy paywall pages exist with their own logic — investigate before stub) |
| Money / Sponsor | `/v1/sponsor/*` REST | ❌ no msg helpers; uses sponsor REST directly |
| Play / Wagers | full set | ✅ |
| Play / Prediction markets | `msgCreatePredictionMarket`, `msgStakePrediction`, `msgResolvePrediction`, `msgClaimPredictionWinnings`. Note: AI predict (`ori.predict`) is an MCP tool, no msg helper. | ✅ for create/stake/resolve/claim, STUB for AI predict |
| Play / Lucky pools | full set | ✅ |
| Profile / Identity (create/update/follow/...) | full set | ✅ |
| Profile / Reputation (thumbs up/down/retract/attest) | none | ❌ STUB — reputation.move helpers don't exist |
| Profile / Agent policy | `msgSetAgentPolicy`, `msgRevokeAgent` | ✅ (no kill switch helper, STUB) |
| Profile / Settings (push/agent-card) | REST `/v1/push/subscribe`, `.well-known/agent.json` | ❌ STUB for push UI; agent card is read-only |
| Inbox quick actions (encrypted DM, mark read, pay from chat, gift from chat) | `msgSendPayment`, `msgCreateLinkGift`, plus REST `/v1/messages` + read | ✅ |
