# Profile — verify

`apps/web/src/app/(ori)/profile/page.tsx` rewrite. Visual baseline preserved
from `ui-ref-orii/frontend/src/pages/Profile.jsx`. All four mock imports
(`currentUser`, `authorizedAgents`, `achievements`, `quests`) removed; the only
remaining static import from `@/data/ori-data` is `profileActions` (form-data
catalogue).

## Connection state

| State | Behaviour |
|---|---|
| `!isConnected` | Identity card replaced with "Connect wallet" CTA. Agent-policy / secondary cards collapse to disconnected placeholders. Tabs not rendered. |
| `isConnected` | Full layout. Hooks gated by `enabled: Boolean(address)` — they fire as soon as `initiaAddress` is present. |

## Card-level coverage

| Card | Status | Source |
|---|---|---|
| Identity — handle | WIRE | `profile.data?.initName ? '<name>.init' : shortenAddress(initiaAddress)` |
| Identity — bio | WIRE | `profile.data?.bio \|\| '—'` |
| Identity — address | WIRE | `shortenAddress(initiaAddress)` |
| Identity — followers | WIRE | `useFollowStats(initiaAddress).data?.followersCount ?? '—'` |
| Identity — following | WIRE | `useFollowStats(initiaAddress).data?.followingCount ?? '—'` |
| Identity — trust | WIRE | `useTrustScore(initiaAddress).data ? '<score>/<max>' : '—'` |
| Agent policy — slider | WIRE (commit) | `onValueCommit` → `msgSetAgentPolicy({ agent: DEFAULT_AGENT_ADDRESS, dailyCap })`. If `DEFAULT_AGENT_ADDRESS` env unset, toast "Select an agent first" + chip in card. |
| Agent policy — privacy switch | WIRE | Toggle → `msgUpdatePrivacy(sender, hideBalance, hideActivity, whitelistOnly)` with `whitelistOnly = nextValue`. `hideBalance/hideActivity` read from `profile.data` (default false). Chip "Saves on next tx" beneath. |
| Agent policy — authorized agents list | WIRE | Distinct `agentAddr` from `useAgentActionsByOwner(initiaAddress).data.entries`. Empty: "No agents yet". Loading: "Loading agents…". |
| Achievements | WIRE | `useBadges(initiaAddress).data` mapped to `${badgeType} L${level}`. Empty + loading states. |
| Quests | WIRE | `useQuests(initiaAddress).data.entries`. Header shows `Level X · Y XP`. Each row: title + `progress/threshold` + bar (progress/threshold * 100, capped 100) + `+xp XP`. |
| Merchant + links | WIRE / STUB-fallback | `profile.data?.links` as anchor buttons; if empty, single placeholder + `Coming soon` chip. No `ori.app/mira` hard-coded copy. |
| Notifications — phone push | STUB | Local toggle + `Coming soon` chip + toast on click. |
| Notifications — auto-sign | WIRE | Bound to `useAutoSign().isEnabled`. Toggle calls `enable()`/`disable()`. |

## Identity tab — action.id → handler map

| `action.id` | Handler |
|---|---|
| `create-profile` | `msgCreateProfile(sender, bio, '', links, links)` — values[0]=bio, values[1]=comma-separated links |
| `update-bio-avatar-links` | Heuristic on values[0]: contains comma → `msgUpdateLinks`; matches `^https?://` → `msgUpdateAvatar`; else → `msgUpdateBio`. (Spec mentioned `update-bio` — actual id from `data/ori-data.ts` is `update-bio-avatar-links` which combines all three.) |
| `set-slug` | `msgSetSlug(sender, values[0])` |
| `set-encryption-pubkey` | Validates 64-hex (32 bytes) → `msgSetEncryptionPubkey(sender, bytes)`; rejects with toast otherwise |
| `update-privacy-settings` | Three booleans parsed from values[0..2] (`/^(1\|true\|yes\|y\|on)$/i`) → `msgUpdatePrivacy(sender, a, b, c)` |
| `follow-user` | `msgFollow({ follower: sender, target: values[0] })` |
| `unfollow-user` | `msgUnfollow({ follower: sender, target: values[0] })` |

## Reputation tab

| `action.id` | Handler |
|---|---|
| `thumbs-up`, `thumbs-down`, `retract-vote`, `attest-signed-claim` | STUB toast — `reputation.move` msg helpers not exposed. |

Tab content also shows `Coming soon — reputation.move helpers not yet
exposed.` chip and the action grid is `pointer-events-none opacity-50`.

## Agent policy tab — action.id → handler map

| `action.id` | Handler |
|---|---|
| `set-agent-policy` | `msgSetAgentPolicy({ sender, agent: values[0], dailyCap: initToBaseUnits(values[1]) })` |
| `revoke-agent` | `msgRevokeAgent({ sender, agent: values[0] })` |
| `agent-kill-switch` | STUB toast — no helper. |

## Settings tab — action.id → handler map

| `action.id` | Handler |
|---|---|
| `push-subscribe` | STUB toast — PWA push deferred. |
| `push-delete` | STUB toast — PWA push deferred. |
| `agent-card` | `window.open('${origin}/.well-known/agent.json', '_blank')` |

## Tx pipeline

All wired actions go through `submitMsg`:

```ts
sendTx(kit, {
  chainId: ORI_CHAIN_ID,
  messages: [msg],
  autoSign: autoSignEnabled,
  fee: autoSignEnabled ? buildAutoSignFee(gasLimit) : undefined,
})
```

Errors surface via `friendlyError(e)` toast.

## Mock-import audit

Removed:

- `currentUser` (was `data/ori-data`)
- `authorizedAgents`
- `achievements`
- `quests`

Kept:

- `profileActions` (form-data catalogue — shape: `[{ id, label, actions: [{ id, title, contract, fields }] }]`)

## Constraints

- File stays `'use client'`.
- Only `apps/web/src/app/(ori)/profile/page.tsx` modified.
- `tsc --noEmit` is clean for this file (other repo errors in `lib/crypto.ts`,
  `lib/keystore.ts`, `components/ui/input-otp.tsx`, `app/(ori)/money/page.tsx`,
  and Next.js `.next/types/validator.ts` are pre-existing and out of scope).
