# Inbox — verify

Per-row reconciliation of `_protocol/TRIAGE.md` (Inbox section) against the
real implementation in `apps/web/src/app/(ori)/inbox/page.tsx`.

| TRIAGE row | Status | Notes |
|---|---|---|
| Threads list | WIRED | `useChats()` drives the left column with loading skeletons + error + empty + disconnected states. |
| Active thread name / handle / kind | WIRED | derived from the selected `ChatSummary` (`counterparty.initName`, `initiaAddress`); `kind` is hardcoded to `Encrypted DM` since the backend chat row has no explicit kind field. |
| Active thread message list | WIRED | `useChatMessages(chatId)` + sealed-box decrypt loop (own messages via `senderCiphertextBase64`, inbound via `ciphertextBase64`). |
| Send encrypted message | WIRED | `useSendMessage()` + `sealedBoxEncrypt` to recipient pubkey via `getRecipientEncryptionPubkey()` + sender-copy seal to own pubkey. `senderSignatureBase64` ships a deterministic placeholder (64 zero bytes) — **NEEDS-FOLLOW-UP** if backend strictly verifies the signature; legacy chat had the same limitation. |
| Online presence dot | STUBBED | Static green pulse dot retained as decoration, no chip (purely decorative per triage). |
| Typing indicator | STUBBED | "typing dots ready" copy retained verbatim, no live signal. |
| Read receipts | WIRED | `useMarkMessageRead()` fires best-effort on inbound-and-unread messages once they land in `decrypted` state. |
| Quick actions row (4 buttons) | STUBBED | Row gets a header with a `Coming soon` chip; buttons still open the existing `ActionDialog` (toast-only OK per triage). |
| MCP — Authorized agents card | WIRED | Distinct `agentAddr`s derived from `useAgentActionsByOwner(initiaAddress).data.entries`. Empty state ships a `Coming soon` chip with copy "No agents have acted on your behalf yet." |
| MCP — Actions tab | WIRED | Same hook; rows render `toolName` (kicker), stringified `args` (detail), `agentAddr` (actor), and `status` chip with success/failed/pending color. Empty state ships its own `Coming soon` chip. |
| MCP — Tools tab | KEEP | Static `mcpTools` import retained — tool catalogue, not data. |

## Counts

- Total hook references in JSX/body: **17** (`useChats`, `useChatMessages`, `useSendMessage`, `useMarkMessageRead`, `useAgentActionsByOwner`, `useKeypair`, `useInterwovenKit` and their derived state — counted via `Grep` of the hook names).
- Distinct hooks invoked: **7** (`useInterwovenKit`, `useChats`, `useChatMessages`, `useAgentActionsByOwner`, `useSendMessage`, `useMarkMessageRead`, `useKeypair`).
- `Coming soon` chip occurrences: **4** — `quick-action-row-chip`, `authorized-agents-empty-chip`, `agent-actions-empty-chip`, plus the `ComingSoonChip` component definition itself (the literal text appears 3× as visible chips in JSX + 1× as the chip component children fallback in code).

## tsc clean

Ran `cd apps/web && ./node_modules/.bin/tsc --noEmit`.

- **No new errors in `apps/web/src/app/(ori)/inbox/page.tsx`.**
- Pre-existing errors (acknowledged as ignorable per task brief):
  - `.next/types/validator.ts` (stale generated types referencing `app/inbox/page.js` etc.)
  - `src/components/ui/input-otp.tsx` (`inputOTPContext` typed as `unknown`)
  - `src/lib/crypto.ts` & `src/lib/keystore.ts` (libsodium-wrappers-sumo type-stub mismatch on `crypto_box_seal`, `crypto_box_seal_open`, `randombytes_buf`, `crypto_generichash`, `crypto_box_seed_keypair`, `from_hex`, `ready`).

tsc clean (no new errors): **yes**.

## Constraint compliance

- No `import .* data/ori-data` line containing `currentUser|threads|agentActions|authorizedAgents` remains. Only `mcpTools` is imported from `data/ori-data` (KEEP per triage).
- `'use client'` directive present at top of file.
- No `framer-motion` import added.
- No file outside `apps/web/src/app/(ori)/inbox/page.tsx` modified (verify doc itself is the only other file written, in the explicitly-permitted `_protocol/verify/` directory).

## Follow-ups for human review

1. **`senderSignatureBase64` placeholder.** The backend `/v1/messages` POST schema requires this field; the legacy `/chat/[identifier]` page also delegates this to a `ChatComposer` component that no longer exists in the tree. Until libsodium signing keypair derivation is exposed via a hook, this page sends a 64-byte zero placeholder. If the backend strictly verifies, message sends will 4xx and need a real signature — wire-up should add `signMessage(...)` to the keypair scope or a sibling helper in `lib/crypto.ts`.
2. **Active thread kind** is hardcoded to `Encrypted DM`. If the chat row ever gains a `kind` discriminator (group / channel / etc.) the header derivation should switch to that field.
