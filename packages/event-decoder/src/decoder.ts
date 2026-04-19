/**
 * Decode a CometBFT `/block_results?height=N` response into Ori events.
 *
 * Pure function. No I/O, no Node globals, no Deno std. Call from:
 *   - Node (apps/api/src/services/eventListener.ts)
 *   - Deno (supabase/functions/event-listener/index.ts)
 *   - Tests (parity fixtures in this package)
 *
 * Single responsibility: read raw block-result events, emit typed Ori events.
 * Everything downstream -- DB writes, Redis pubsub, Realtime broadcast,
 * Socket.IO fan-out, outbox inserts -- belongs to the caller.
 */
import type {
  BlockResultsResponse,
  DecodedEvent,
  RawAttr,
  RawEvent,
} from './types.js'
import { normalizeAddress } from './address.js'
import { b64ToUtf8, bytesOrStringToHex, safeJson } from './runtime.js'

/**
 * Parse every Move event in a block-results response. Transaction failures
 * (code != 0) are skipped -- we don't index events from reverted txs. Block-
 * finalize events are included (that's where some Move modules emit).
 */
export function parseBlockResults(
  body: BlockResultsResponse,
  height: bigint,
): DecodedEvent[] {
  const out: DecodedEvent[] = []
  const txs = body.result?.txs_results ?? []

  for (let txIndex = 0; txIndex < txs.length; txIndex++) {
    const tx = txs[txIndex]
    if (!tx) continue
    if (tx.code && tx.code !== 0) continue
    for (const ev of tx.events ?? []) {
      const decoded = decodeEvent(ev, height, txIndex)
      if (decoded) out.push(decoded)
    }
  }

  for (const ev of body.result?.finalize_block_events ?? []) {
    // Block-finalize events don't have a tx index; use -1 as sentinel.
    const decoded = decodeEvent(ev, height, -1)
    if (decoded) out.push(decoded)
  }

  return out
}

/** Decode a single Move event, or null if it isn't one we care about. */
function decodeEvent(
  ev: RawEvent,
  height: bigint,
  txIndex: number,
): DecodedEvent | null {
  if (ev.type !== 'move') return null

  const tag = readAttr(ev, 'type_tag')
  const dataStr = readAttr(ev, 'data')
  if (!tag || !dataStr) return null

  const data = safeJson(dataStr)
  if (!data || typeof data !== 'object') return null

  if (tag.endsWith('::tip_jar::TipSent')) {
    return decodeTip(data as Record<string, unknown>, height, txIndex)
  }
  if (tag.endsWith('::payment_router::PaymentSent')) {
    return decodePayment(data as Record<string, unknown>, height, txIndex)
  }
  if (tag.endsWith('::payment_router::BatchPaymentSent')) {
    return decodeBatchPayment(data as Record<string, unknown>, height, txIndex)
  }
  if (tag.endsWith('::gift_packet::GiftCreated')) {
    return decodeGiftCreated(data as Record<string, unknown>, height, txIndex)
  }
  if (tag.endsWith('::achievement_sbt::BadgeAwarded')) {
    return decodeBadge(data as Record<string, unknown>, height, txIndex)
  }
  if (tag.endsWith('::wager_escrow::WagerProposed')) {
    return decodeWagerProposed(data as Record<string, unknown>, height, txIndex)
  }
  if (tag.endsWith('::follow_graph::Followed')) {
    return decodeFollowed(data as Record<string, unknown>, height, txIndex, 'followed')
  }
  if (tag.endsWith('::follow_graph::Unfollowed')) {
    return decodeFollowed(data as Record<string, unknown>, height, txIndex, 'unfollowed')
  }

  return null
}

/**
 * Read an attribute from a CometBFT event. Cosmos SDK versions have shipped
 * with attributes in both plain-text and base64-encoded forms for the same
 * event; we try plain first, then base64 as a fallback.
 */
function readAttr(ev: RawEvent, key: string): string | null {
  for (const a of ev.attributes) {
    if (a.key === key) return a.value
  }
  // Fallback: base64-encoded keys.
  const b64Match = findBase64Attr(ev.attributes, key)
  if (b64Match) {
    try {
      return b64ToUtf8(b64Match.value)
    } catch {
      return null
    }
  }
  return null
}

function findBase64Attr(attrs: RawAttr[], decodedKey: string): RawAttr | null {
  for (const a of attrs) {
    try {
      if (b64ToUtf8(a.key) === decodedKey) return a
    } catch {
      // ignore
    }
  }
  return null
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Individual event decoders — keep these narrow & type-safe.             */
/* ──────────────────────────────────────────────────────────────────────── */

function decodeTip(
  d: Record<string, unknown>,
  height: bigint,
  txIndex: number,
): DecodedEvent | null {
  const tipper = normalizeAddress(String(d.tipper ?? ''))
  const creator = normalizeAddress(String(d.creator ?? ''))
  if (!tipper || !creator) return null
  return {
    kind: 'tip',
    height,
    txIndex,
    tipper,
    creator,
    grossAmount: toBigInt(d.gross_amount),
    netAmount: toBigInt(d.net_amount),
    feeAmount: toBigInt(d.fee_amount),
    denom: String(d.denom ?? ''),
    message: String(d.message ?? ''),
  }
}

function decodePayment(
  d: Record<string, unknown>,
  height: bigint,
  txIndex: number,
): DecodedEvent | null {
  const from = normalizeAddress(String(d.from ?? ''))
  const to = normalizeAddress(String(d.to ?? ''))
  if (!from || !to) return null
  return {
    kind: 'payment',
    height,
    txIndex,
    from,
    to,
    amount: toBigInt(d.amount),
    denom: String(d.denom ?? ''),
    memo: String(d.memo ?? ''),
    chatId: String(d.chat_id ?? ''),
  }
}

function decodeBatchPayment(
  d: Record<string, unknown>,
  height: bigint,
  txIndex: number,
): DecodedEvent | null {
  const from = normalizeAddress(String(d.from ?? ''))
  if (!from) return null
  return {
    kind: 'payment_batch',
    height,
    txIndex,
    from,
    recipientCount: Number(d.recipient_count ?? 0),
    totalAmount: toBigInt(d.total_amount),
    denom: String(d.denom ?? ''),
    batchId: String(d.batch_id ?? ''),
  }
}

function decodeGiftCreated(
  d: Record<string, unknown>,
  height: bigint,
  txIndex: number,
): DecodedEvent | null {
  const sender = normalizeAddress(String(d.sender ?? ''))
  if (!sender) return null
  return {
    kind: 'gift_created',
    height,
    txIndex,
    id: String(d.id ?? ''),
    sender,
    amount: toBigInt(d.amount),
    denom: String(d.denom ?? ''),
    theme: Number(d.theme ?? 0),
    mode: Number(d.mode ?? 0),
    secretHashHex: bytesOrStringToHex(d.secret_hash),
    expiresAt: Number(d.expires_at ?? 0),
  }
}

function decodeBadge(
  d: Record<string, unknown>,
  height: bigint,
  txIndex: number,
): DecodedEvent | null {
  const recipient = normalizeAddress(String(d.recipient ?? ''))
  if (!recipient) return null
  return {
    kind: 'badge',
    height,
    txIndex,
    recipient,
    badgeType: Number(d.badge_type ?? 0),
    level: Number(d.level ?? 0),
    metadataUri: String(d.metadata_uri ?? ''),
  }
}

function decodeWagerProposed(
  d: Record<string, unknown>,
  height: bigint,
  txIndex: number,
): DecodedEvent | null {
  const proposer = normalizeAddress(String(d.proposer ?? ''))
  if (!proposer) return null
  return {
    kind: 'wager_proposed',
    height,
    txIndex,
    wagerId: String(d.wager_id ?? ''),
    proposer,
    accepter: normalizeAddress(String(d.accepter ?? '')),
    arbiter: normalizeAddress(String(d.arbiter ?? '')),
    amount: toBigInt(d.amount),
    denom: String(d.denom ?? ''),
    claim: String(d.claim ?? ''),
  }
}

function decodeFollowed(
  d: Record<string, unknown>,
  height: bigint,
  txIndex: number,
  kind: 'followed' | 'unfollowed',
): DecodedEvent | null {
  const from = normalizeAddress(String(d.from ?? ''))
  const to = normalizeAddress(String(d.to ?? ''))
  if (!from || !to) return null
  return { kind, height, txIndex, from, to }
}

function toBigInt(v: unknown): bigint {
  if (typeof v === 'bigint') return v
  try {
    return BigInt(String(v ?? '0'))
  } catch {
    return 0n
  }
}
