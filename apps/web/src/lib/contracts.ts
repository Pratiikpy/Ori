/**
 * Move contract call helpers — wraps the BCS arg encoding + MsgExecute shape
 * so components just pass typed params.
 *
 * Pattern verified against:
 *   - initia-docs/hackathon/examples/move-game.mdx lines 556-570 (MsgExecute.fromPartial)
 *   - jordi-stack/initia-link for BCS arg encoding
 *   - SandeshKhilari01/Stream-Pay for coin::transfer through module
 */
import { bcs } from '@initia/initia.js'
import { ORI_MODULE_ADDRESS, ORI_DENOM } from './chain-config'

export const MOVE_MSG_TYPE = '/initia.move.v1.MsgExecute'

/** Decode a base64 string into a Uint8Array. Browsers have atob; we wrap to
 *  handle Node-only environments and to keep the helper local to this file. */
function base64ToBytes(b64: string): Uint8Array {
  const bin = typeof atob === 'function'
    ? atob(b64)
    : Buffer.from(b64, 'base64').toString('binary')
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Build a MsgExecute wire object. InterwovenKit's submitTxBlock/requestTxBlock
 *  expects `args` as `Uint8Array[]` for direct protobuf encoding — base64
 *  strings yield "invalid uint32: undefined" because the proto encoder reads
 *  `value.byteLength` which is undefined for plain strings. Callers may pass
 *  either base64-encoded strings (legacy) or Uint8Array directly; we normalize. */
export function buildMsgExecute(params: {
  sender: string
  moduleAddress: string
  moduleName: string
  functionName: string
  typeArgs?: string[]
  args: Array<string | Uint8Array>
}): {
  typeUrl: string
  value: {
    sender: string
    moduleAddress: string
    moduleName: string
    functionName: string
    typeArgs: string[]
    args: Uint8Array[]
  }
} {
  return {
    typeUrl: MOVE_MSG_TYPE,
    value: {
      sender: params.sender,
      moduleAddress: params.moduleAddress,
      moduleName: params.moduleName,
      functionName: params.functionName,
      typeArgs: params.typeArgs ?? [],
      args: params.args.map((a) => (typeof a === 'string' ? base64ToBytes(a) : a)),
    },
  }
}

// ========== profile_registry ==========

export function msgCreateProfile(
  sender: string,
  bio: string,
  avatarUrl: string,
  links: string[],
  linkLabels: string[],
) {
  return buildMsgExecute({
    sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'profile_registry',
    functionName: 'create_profile',
    args: [
      bcs.string().serialize(bio).toBase64(),
      bcs.string().serialize(avatarUrl).toBase64(),
      bcs.vector(bcs.string()).serialize(links).toBase64(),
      bcs.vector(bcs.string()).serialize(linkLabels).toBase64(),
    ],
  })
}

export function msgUpdateBio(sender: string, newBio: string) {
  return buildMsgExecute({
    sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'profile_registry',
    functionName: 'update_bio',
    args: [bcs.string().serialize(newBio).toBase64()],
  })
}

export function msgSetEncryptionPubkey(sender: string, pubkey: Uint8Array) {
  return buildMsgExecute({
    sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'profile_registry',
    functionName: 'set_encryption_pubkey',
    args: [bcs.vector(bcs.u8()).serialize(Array.from(pubkey)).toBase64()],
  })
}

// ========== payment_router ==========

export function msgSendPayment(params: {
  sender: string
  recipient: string // init1... bech32
  amount: bigint
  memo: string
  chatId: string
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'payment_router',
    functionName: 'send',
    args: [
      bcs.address().serialize(params.recipient).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
      bcs.string().serialize(params.memo).toBase64(),
      bcs.string().serialize(params.chatId).toBase64(),
    ],
  })
}

export function msgBatchSend(params: {
  sender: string
  recipients: string[]
  amounts: bigint[]
  memos: string[]
  denom?: string
  batchId: string
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'payment_router',
    functionName: 'batch_send',
    args: [
      bcs.vector(bcs.address()).serialize(params.recipients).toBase64(),
      bcs.vector(bcs.u64()).serialize(params.amounts.map(String)).toBase64(),
      bcs.vector(bcs.string()).serialize(params.memos).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.string().serialize(params.batchId).toBase64(),
    ],
  })
}

// ========== tip_jar ==========

export function msgTip(params: {
  sender: string
  creator: string
  amount: bigint
  message: string
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'tip_jar',
    functionName: 'tip',
    args: [
      bcs.address().serialize(params.creator).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
      bcs.string().serialize(params.message).toBase64(),
    ],
  })
}

// ========== gift_packet ==========

export function msgCreateDirectedGift(params: {
  sender: string
  recipient: string
  amount: bigint
  theme: number
  message: string
  ttlSeconds?: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_packet',
    functionName: 'create_directed_gift',
    args: [
      bcs.address().serialize(params.recipient).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
      bcs.u8().serialize(params.theme).toBase64(),
      bcs.string().serialize(params.message).toBase64(),
      bcs.u64().serialize((params.ttlSeconds ?? 0n).toString()).toBase64(),
    ],
  })
}

export function msgCreateLinkGift(params: {
  sender: string
  amount: bigint
  theme: number
  message: string
  secretHash: Uint8Array // 32 bytes
  ttlSeconds?: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_packet',
    functionName: 'create_link_gift',
    args: [
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
      bcs.u8().serialize(params.theme).toBase64(),
      bcs.string().serialize(params.message).toBase64(),
      bcs.vector(bcs.u8()).serialize(Array.from(params.secretHash)).toBase64(),
      bcs.u64().serialize((params.ttlSeconds ?? 0n).toString()).toBase64(),
    ],
  })
}

export function msgReclaimExpiredGift(params: { sender: string; giftId: bigint }) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_packet',
    functionName: 'reclaim_expired_gift',
    args: [bcs.u64().serialize(params.giftId.toString()).toBase64()],
  })
}

export function msgClaimLinkGift(params: {
  claimer: string
  giftId: bigint
  secret: Uint8Array
}) {
  return buildMsgExecute({
    sender: params.claimer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_packet',
    functionName: 'claim_link_gift',
    args: [
      bcs.u64().serialize(params.giftId.toString()).toBase64(),
      bcs.vector(bcs.u8()).serialize(Array.from(params.secret)).toBase64(),
    ],
  })
}

export function msgClaimDirectedGift(params: { claimer: string; giftId: bigint }) {
  return buildMsgExecute({
    sender: params.claimer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_packet',
    functionName: 'claim_directed_gift',
    args: [bcs.u64().serialize(params.giftId.toString()).toBase64()],
  })
}

// ========== wager_escrow ==========

export function msgProposeWager(params: {
  proposer: string
  accepter: string
  arbiter: string
  amount: bigint
  claim: string
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.proposer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'propose_wager',
    args: [
      bcs.address().serialize(params.accepter).toBase64(),
      bcs.address().serialize(params.arbiter).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
      bcs.string().serialize(params.claim).toBase64(),
    ],
  })
}

export function msgAcceptWager(params: { accepter: string; wagerId: bigint }) {
  return buildMsgExecute({
    sender: params.accepter,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'accept_wager',
    args: [bcs.u64().serialize(params.wagerId.toString()).toBase64()],
  })
}

export function msgResolveWager(params: {
  arbiter: string
  wagerId: bigint
  winner: string
}) {
  return buildMsgExecute({
    sender: params.arbiter,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'resolve_wager',
    args: [
      bcs.u64().serialize(params.wagerId.toString()).toBase64(),
      bcs.address().serialize(params.winner).toBase64(),
    ],
  })
}

export function msgCancelPendingWager(params: { proposer: string; wagerId: bigint }) {
  return buildMsgExecute({
    sender: params.proposer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'cancel_pending',
    args: [bcs.u64().serialize(params.wagerId.toString()).toBase64()],
  })
}

export function msgProposeWagerFull(params: {
  proposer: string
  accepter: string
  arbiter: string
  amount: bigint
  claim: string
  category: string
  deadlineSeconds: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.proposer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'propose_wager_full',
    args: [
      bcs.address().serialize(params.accepter).toBase64(),
      bcs.address().serialize(params.arbiter).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
      bcs.string().serialize(params.claim).toBase64(),
      bcs.string().serialize(params.category).toBase64(),
      bcs.u64().serialize(params.deadlineSeconds.toString()).toBase64(),
    ],
  })
}

export function msgProposePvpWager(params: {
  proposer: string
  accepter: string
  amount: bigint
  claim: string
  category: string
  deadlineSeconds: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.proposer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'propose_pvp_wager',
    args: [
      bcs.address().serialize(params.accepter).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
      bcs.string().serialize(params.claim).toBase64(),
      bcs.string().serialize(params.category).toBase64(),
      bcs.u64().serialize(params.deadlineSeconds.toString()).toBase64(),
    ],
  })
}

export function msgConcedeWager(params: { loser: string; wagerId: bigint }) {
  return buildMsgExecute({
    sender: params.loser,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'concede',
    args: [bcs.u64().serialize(params.wagerId.toString()).toBase64()],
  })
}

export function msgRefundExpiredWager(params: { caller: string; wagerId: bigint }) {
  return buildMsgExecute({
    sender: params.caller,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'refund_expired',
    args: [bcs.u64().serialize(params.wagerId.toString()).toBase64()],
  })
}

/** Oracle-resolved wager. Price-based predictions via Slinky. */
export function msgProposeOracleWager(params: {
  proposer: string
  accepter: string
  amount: bigint
  claim: string
  category: string
  deadlineSeconds: bigint
  oraclePair: string
  targetPrice: bigint
  proposerWinsAbove: boolean
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.proposer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'propose_oracle_wager',
    args: [
      bcs.address().serialize(params.accepter).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
      bcs.string().serialize(params.claim).toBase64(),
      bcs.string().serialize(params.category).toBase64(),
      bcs.u64().serialize(params.deadlineSeconds.toString()).toBase64(),
      bcs.string().serialize(params.oraclePair).toBase64(),
      bcs.u256().serialize(params.targetPrice.toString()).toBase64(),
      bcs.bool().serialize(params.proposerWinsAbove).toBase64(),
    ],
  })
}

/** Permissionless — anyone triggers resolution after deadline. */
export function msgResolveFromOracle(params: { caller: string; wagerId: bigint }) {
  return buildMsgExecute({
    sender: params.caller,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'wager_escrow',
    functionName: 'resolve_from_oracle',
    args: [bcs.u64().serialize(params.wagerId.toString()).toBase64()],
  })
}

// ========== subscription_vault ==========

export function msgRegisterSubscriptionPlan(params: {
  creator: string
  pricePerPeriod: bigint
  periodSeconds: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.creator,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'subscription_vault',
    functionName: 'register_plan',
    args: [
      bcs.u64().serialize(params.pricePerPeriod.toString()).toBase64(),
      bcs.u64().serialize(params.periodSeconds.toString()).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
    ],
  })
}

export function msgDeactivateSubscriptionPlan(params: { creator: string }) {
  return buildMsgExecute({
    sender: params.creator,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'subscription_vault',
    functionName: 'deactivate_plan',
    args: [],
  })
}

export function msgSubscribe(params: {
  subscriber: string
  creator: string
  periods: bigint
}) {
  return buildMsgExecute({
    sender: params.subscriber,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'subscription_vault',
    functionName: 'subscribe',
    args: [
      bcs.address().serialize(params.creator).toBase64(),
      bcs.u64().serialize(params.periods.toString()).toBase64(),
    ],
  })
}

export function msgReleaseSubscriptionPeriod(params: {
  caller: string
  subscriber: string
  creator: string
}) {
  return buildMsgExecute({
    sender: params.caller,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'subscription_vault',
    functionName: 'release_period',
    args: [
      bcs.address().serialize(params.subscriber).toBase64(),
      bcs.address().serialize(params.creator).toBase64(),
    ],
  })
}

export function msgCancelSubscription(params: {
  subscriber: string
  creator: string
}) {
  return buildMsgExecute({
    sender: params.subscriber,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'subscription_vault',
    functionName: 'cancel_subscription',
    args: [bcs.address().serialize(params.creator).toBase64()],
  })
}

// ========== payment_stream ==========

export function msgOpenStream(params: {
  sender: string
  recipient: string
  ratePerSecond: bigint
  durationSeconds: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'payment_stream',
    functionName: 'open_stream',
    args: [
      bcs.address().serialize(params.recipient).toBase64(),
      bcs.u64().serialize(params.ratePerSecond.toString()).toBase64(),
      bcs.u64().serialize(params.durationSeconds.toString()).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
    ],
  })
}

export function msgWithdrawStream(params: { recipient: string; streamId: bigint }) {
  return buildMsgExecute({
    sender: params.recipient,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'payment_stream',
    functionName: 'withdraw_accrued',
    args: [bcs.u64().serialize(params.streamId.toString()).toBase64()],
  })
}

export function msgCloseStream(params: { sender: string; streamId: bigint }) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'payment_stream',
    functionName: 'close_stream',
    args: [bcs.u64().serialize(params.streamId.toString()).toBase64()],
  })
}

// ========== paywall ==========

export function msgCreatePaywall(params: {
  creator: string
  title: string
  resourceUri: string
  price: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.creator,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'paywall',
    functionName: 'create_paywall',
    args: [
      bcs.string().serialize(params.title).toBase64(),
      bcs.string().serialize(params.resourceUri).toBase64(),
      bcs.u64().serialize(params.price.toString()).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
    ],
  })
}

export function msgPurchasePaywall(params: { buyer: string; paywallId: bigint }) {
  return buildMsgExecute({
    sender: params.buyer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'paywall',
    functionName: 'purchase',
    args: [bcs.u64().serialize(params.paywallId.toString()).toBase64()],
  })
}

export function msgDeactivatePaywall(params: { creator: string; paywallId: bigint }) {
  return buildMsgExecute({
    sender: params.creator,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'paywall',
    functionName: 'deactivate_paywall',
    args: [bcs.u64().serialize(params.paywallId.toString()).toBase64()],
  })
}

// ========== reputation ==========

export function msgThumbsUp(params: { voter: string; target: string }) {
  return buildMsgExecute({
    sender: params.voter,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'reputation',
    functionName: 'thumbs_up',
    args: [bcs.address().serialize(params.target).toBase64()],
  })
}

export function msgThumbsDown(params: { voter: string; target: string }) {
  return buildMsgExecute({
    sender: params.voter,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'reputation',
    functionName: 'thumbs_down',
    args: [bcs.address().serialize(params.target).toBase64()],
  })
}

export function msgRetractVote(params: { voter: string; target: string }) {
  return buildMsgExecute({
    sender: params.voter,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'reputation',
    functionName: 'retract_vote',
    args: [bcs.address().serialize(params.target).toBase64()],
  })
}

export function msgAttest(params: {
  attester: string
  target: string
  claim: string
  evidenceUri: string
}) {
  return buildMsgExecute({
    sender: params.attester,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'reputation',
    functionName: 'attest',
    args: [
      bcs.address().serialize(params.target).toBase64(),
      bcs.string().serialize(params.claim).toBase64(),
      bcs.string().serialize(params.evidenceUri).toBase64(),
    ],
  })
}

// ========== merchant_registry ==========

export function msgRegisterMerchant(params: {
  owner: string
  name: string
  category: string
  logoUrl: string
  contact: string
  acceptedDenoms: string[]
}) {
  return buildMsgExecute({
    sender: params.owner,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'merchant_registry',
    functionName: 'register',
    args: [
      bcs.string().serialize(params.name).toBase64(),
      bcs.string().serialize(params.category).toBase64(),
      bcs.string().serialize(params.logoUrl).toBase64(),
      bcs.string().serialize(params.contact).toBase64(),
      bcs.vector(bcs.string()).serialize(params.acceptedDenoms).toBase64(),
    ],
  })
}

// ========== lucky_pool ==========

export function msgCreateLuckyPool(params: {
  creator: string
  entryFee: bigint
  maxParticipants: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.creator,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'lucky_pool',
    functionName: 'create_pool',
    args: [
      bcs.u64().serialize(params.entryFee.toString()).toBase64(),
      bcs.u64().serialize(params.maxParticipants.toString()).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
    ],
  })
}

export function msgJoinLuckyPool(params: { participant: string; poolId: bigint }) {
  return buildMsgExecute({
    sender: params.participant,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'lucky_pool',
    functionName: 'join_pool',
    args: [bcs.u64().serialize(params.poolId.toString()).toBase64()],
  })
}

export function msgDrawLuckyPool(params: { caller: string; poolId: bigint }) {
  return buildMsgExecute({
    sender: params.caller,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'lucky_pool',
    functionName: 'draw',
    args: [bcs.u64().serialize(params.poolId.toString()).toBase64()],
  })
}

// ========== gift_group ==========

export function msgCreateGroupGift(params: {
  sender: string
  totalAmount: bigint
  slotCount: bigint
  theme: number
  message: string
  secretHashes: Uint8Array[]
  ttlSeconds?: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_group',
    functionName: 'create_group_gift',
    args: [
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
      bcs.u64().serialize(params.totalAmount.toString()).toBase64(),
      bcs.u64().serialize(params.slotCount.toString()).toBase64(),
      bcs.u8().serialize(params.theme).toBase64(),
      bcs.string().serialize(params.message).toBase64(),
      bcs
        .vector(bcs.vector(bcs.u8()))
        .serialize(params.secretHashes.map((h) => Array.from(h)))
        .toBase64(),
      bcs.u64().serialize((params.ttlSeconds ?? 0n).toString()).toBase64(),
    ],
  })
}

export function msgClaimGroupSlot(params: {
  claimer: string
  giftId: bigint
  slotIndex: bigint
  secret: Uint8Array
}) {
  return buildMsgExecute({
    sender: params.claimer,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_group',
    functionName: 'claim_group_slot',
    args: [
      bcs.u64().serialize(params.giftId.toString()).toBase64(),
      bcs.u64().serialize(params.slotIndex.toString()).toBase64(),
      bcs.vector(bcs.u8()).serialize(Array.from(params.secret)).toBase64(),
    ],
  })
}

export function msgReclaimExpiredGroup(params: { sender: string; giftId: bigint }) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_group',
    functionName: 'reclaim_expired_group',
    args: [bcs.u64().serialize(params.giftId.toString()).toBase64()],
  })
}

// ========== gift_box_catalog ==========

export function msgRegisterGiftBox(params: {
  admin: string
  name: string
  theme: number
  imageUri: string
  description: string
  accentHex: string
  featuredOrder: bigint
}) {
  return buildMsgExecute({
    sender: params.admin,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'gift_box_catalog',
    functionName: 'register_box',
    args: [
      bcs.string().serialize(params.name).toBase64(),
      bcs.u8().serialize(params.theme).toBase64(),
      bcs.string().serialize(params.imageUri).toBase64(),
      bcs.string().serialize(params.description).toBase64(),
      bcs.string().serialize(params.accentHex).toBase64(),
      bcs.u64().serialize(params.featuredOrder.toString()).toBase64(),
    ],
  })
}

// ========== squads ==========

export function msgCreateSquad(params: { leader: string; name: string }) {
  return buildMsgExecute({
    sender: params.leader,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'squads',
    functionName: 'create_squad',
    args: [bcs.string().serialize(params.name).toBase64()],
  })
}

export function msgJoinSquad(params: { member: string; squadId: bigint }) {
  return buildMsgExecute({
    sender: params.member,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'squads',
    functionName: 'join_squad',
    args: [bcs.u64().serialize(params.squadId.toString()).toBase64()],
  })
}

export function msgLeaveSquad(params: { member: string; squadId: bigint }) {
  return buildMsgExecute({
    sender: params.member,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'squads',
    functionName: 'leave_squad',
    args: [bcs.u64().serialize(params.squadId.toString()).toBase64()],
  })
}

export function msgTransferSquadLeader(params: {
  leader: string
  squadId: bigint
  newLeader: string
}) {
  return buildMsgExecute({
    sender: params.leader,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'squads',
    functionName: 'transfer_leader',
    args: [
      bcs.u64().serialize(params.squadId.toString()).toBase64(),
      bcs.address().serialize(params.newLeader).toBase64(),
    ],
  })
}

export function msgDisbandSquad(params: { leader: string; squadId: bigint }) {
  return buildMsgExecute({
    sender: params.leader,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'squads',
    functionName: 'disband_squad',
    args: [bcs.u64().serialize(params.squadId.toString()).toBase64()],
  })
}

// ========== follow_graph ==========

export function msgFollow(params: { follower: string; target: string }) {
  return buildMsgExecute({
    sender: params.follower,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'follow_graph',
    functionName: 'follow',
    args: [bcs.address().serialize(params.target).toBase64()],
  })
}

export function msgUnfollow(params: { follower: string; target: string }) {
  return buildMsgExecute({
    sender: params.follower,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'follow_graph',
    functionName: 'unfollow',
    args: [bcs.address().serialize(params.target).toBase64()],
  })
}

// ========== profile_registry — updates ==========

export function msgUpdateAvatar(sender: string, avatarUrl: string) {
  return buildMsgExecute({
    sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'profile_registry',
    functionName: 'update_avatar',
    args: [bcs.string().serialize(avatarUrl).toBase64()],
  })
}

export function msgUpdateLinks(sender: string, links: string[], labels: string[]) {
  return buildMsgExecute({
    sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'profile_registry',
    functionName: 'update_links',
    args: [
      bcs.vector(bcs.string()).serialize(links).toBase64(),
      bcs.vector(bcs.string()).serialize(labels).toBase64(),
    ],
  })
}

export function msgUpdateTheme(sender: string, themeJson: string) {
  return buildMsgExecute({
    sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'profile_registry',
    functionName: 'update_theme',
    args: [bcs.string().serialize(themeJson).toBase64()],
  })
}

export function msgSetSlug(sender: string, slug: string) {
  return buildMsgExecute({
    sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'profile_registry',
    functionName: 'set_slug',
    args: [bcs.string().serialize(slug).toBase64()],
  })
}

export function msgUpdatePrivacy(
  sender: string,
  hideBalance: boolean,
  hideActivity: boolean,
  whitelistOnly: boolean,
) {
  return buildMsgExecute({
    sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'profile_registry',
    functionName: 'update_privacy',
    args: [
      bcs.bool().serialize(hideBalance).toBase64(),
      bcs.bool().serialize(hideActivity).toBase64(),
      bcs.bool().serialize(whitelistOnly).toBase64(),
    ],
  })
}

// ========== prediction_pool ==========

/**
 * Open a parimutuel binary prediction market. `targetPrice` is the raw oracle
 * integer (already scaled by the pair's native decimals). `comparator=true`
 * means YES wins when the resolved price is >= target. Denom defaults to ORI.
 */
export function msgCreatePredictionMarket(params: {
  sender: string
  oraclePair: string
  targetPrice: bigint
  comparator: boolean
  deadlineSeconds: bigint
  denom?: string
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'prediction_pool',
    functionName: 'create_market',
    args: [
      bcs.string().serialize(params.oraclePair).toBase64(),
      bcs.u256().serialize(params.targetPrice.toString()).toBase64(),
      bcs.bool().serialize(params.comparator).toBase64(),
      bcs.u64().serialize(params.deadlineSeconds.toString()).toBase64(),
      bcs.string().serialize(params.denom ?? ORI_DENOM).toBase64(),
    ],
  })
}

export function msgStakePrediction(params: {
  sender: string
  marketId: bigint
  sideYes: boolean
  amount: bigint
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'prediction_pool',
    functionName: 'stake',
    args: [
      bcs.u64().serialize(params.marketId.toString()).toBase64(),
      bcs.bool().serialize(params.sideYes).toBase64(),
      bcs.u64().serialize(params.amount.toString()).toBase64(),
    ],
  })
}

/**
 * Permissionless after the market's deadline. Reads the oracle and sets
 * outcome on-chain. Does NOT distribute funds — winners still must call
 * msgClaimPredictionWinnings.
 */
export function msgResolvePrediction(params: { sender: string; marketId: bigint }) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'prediction_pool',
    functionName: 'resolve',
    args: [bcs.u64().serialize(params.marketId.toString()).toBase64()],
  })
}

export function msgClaimPredictionWinnings(params: { sender: string; marketId: bigint }) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'prediction_pool',
    functionName: 'claim_winnings',
    args: [bcs.u64().serialize(params.marketId.toString()).toBase64()],
  })
}

// ========== agent_policy ==========

/**
 * Register (or update) a daily spending cap for an agent under the caller's
 * account. daily_cap is in base units (umin). The caller is the owner.
 */
export function msgSetAgentPolicy(params: {
  sender: string
  agent: string
  dailyCap: bigint
}) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'agent_policy',
    functionName: 'set_policy',
    args: [
      bcs.address().serialize(params.agent).toBase64(),
      bcs.u64().serialize(params.dailyCap.toString()).toBase64(),
    ],
  })
}

/**
 * Kill switch. Sets active=false on the policy; subsequent
 * pre_check_and_record calls will abort. Re-enable via set_policy.
 */
export function msgRevokeAgent(params: { sender: string; agent: string }) {
  return buildMsgExecute({
    sender: params.sender,
    moduleAddress: ORI_MODULE_ADDRESS,
    moduleName: 'agent_policy',
    functionName: 'revoke_agent',
    args: [bcs.address().serialize(params.agent).toBase64()],
  })
}
