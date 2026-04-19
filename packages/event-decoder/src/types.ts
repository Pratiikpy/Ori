/**
 * Ori on-chain event shapes -- the format produced by the Move contracts
 * once the raw CometBFT `/block_results` response has been decoded.
 *
 * All amounts are base-unit `bigint`s (1 ORI = 1_000_000 umin).
 * All addresses are canonical bech32 `init1...` form.
 * `height` is the block the event was observed in (used for dedup).
 * `txIndex` is the position within the block (together with height, a
 * stable compound key).
 *
 * Fields map to the Move struct definitions in packages/contracts/sources/*.
 * If you change a Move event's field names, update the decoder in
 * ./decoder.ts AND add a fixture test.
 */
export type OriEventKind =
  | 'tip'
  | 'payment'
  | 'payment_batch'
  | 'gift_created'
  | 'badge'
  | 'wager_proposed'
  | 'followed'
  | 'unfollowed'

export interface BaseEvent {
  kind: OriEventKind
  height: bigint
  txIndex: number
}

export interface TipEvent extends BaseEvent {
  kind: 'tip'
  tipper: string
  creator: string
  grossAmount: bigint
  netAmount: bigint
  feeAmount: bigint
  denom: string
  message: string
}

export interface PaymentEvent extends BaseEvent {
  kind: 'payment'
  from: string
  to: string
  amount: bigint
  denom: string
  memo: string
  chatId: string
}

export interface PaymentBatchEvent extends BaseEvent {
  kind: 'payment_batch'
  from: string
  recipientCount: number
  totalAmount: bigint
  denom: string
  batchId: string
}

export interface GiftCreatedEvent extends BaseEvent {
  kind: 'gift_created'
  id: string
  sender: string
  amount: bigint
  denom: string
  theme: number
  mode: number
  secretHashHex: string
  expiresAt: number
}

export interface BadgeEvent extends BaseEvent {
  kind: 'badge'
  recipient: string
  badgeType: number
  level: number
  metadataUri: string
}

export interface WagerProposedEvent extends BaseEvent {
  kind: 'wager_proposed'
  wagerId: string
  proposer: string
  accepter: string
  arbiter: string
  amount: bigint
  denom: string
  claim: string
}

export interface FollowedEvent extends BaseEvent {
  kind: 'followed'
  from: string
  to: string
}

export interface UnfollowedEvent extends BaseEvent {
  kind: 'unfollowed'
  from: string
  to: string
}

export type DecodedEvent =
  | TipEvent
  | PaymentEvent
  | PaymentBatchEvent
  | GiftCreatedEvent
  | BadgeEvent
  | WagerProposedEvent
  | FollowedEvent
  | UnfollowedEvent

/** Raw CometBFT event attribute. */
export interface RawAttr {
  key: string
  value: string
  index?: boolean
}

/** Raw CometBFT event. */
export interface RawEvent {
  type: string
  attributes: RawAttr[]
}

/** The /block_results response shape we actually care about. */
export interface BlockResultsResponse {
  result?: {
    txs_results?: Array<{
      code?: number
      events?: RawEvent[]
    }>
    finalize_block_events?: RawEvent[]
  }
}
