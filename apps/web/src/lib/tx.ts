'use client'

/**
 * Tx helpers — centralized so fee calculation + auto-sign branch logic is
 * never duplicated across components.
 *
 * Usage:
 *   const tx = await sendTx(useInterwovenKit(), {
 *     chainId: ORI_CHAIN_ID,
 *     messages: [...],
 *     autoSign: autoSignEnabled,
 *   })
 *   console.log(tx.txHash, tx.rawResponse)
 */
import type { useInterwovenKit } from '@initia/interwovenkit-react'
import { ORI_CHAIN_ID, ORI_DENOM } from './chain-config'
import { haptic } from './haptics'

/**
 * Build a tx-detail explorer URL for the Ori rollup. The Initia hosted
 * explorer (scan.testnet.initia.xyz) routes by `/{chainId}/txs/{hash}` per
 * initia-docs/developers/developer-guides/integrating-initia-apps/usernames.mdx.
 * If our rollup isn't yet indexed there the URL still gives the user the hash
 * to copy, which is strictly better than discarding it.
 */
export function txExplorerUrl(txHash: string): string {
  return `https://scan.testnet.initia.xyz/${ORI_CHAIN_ID}/txs/${txHash}`
}

/** Re-export with a name some hooks use — same function as friendlyError. */
export const friendlyTxError = (err: unknown): string => friendlyError(err)

export type InterwovenKit = ReturnType<typeof useInterwovenKit>

export type StdFee = { amount: Array<{ amount: string; denom: string }>; gas: string }

export type EncodeObject = { typeUrl: string; value: unknown }

export type TxSendOpts = {
  chainId: string
  messages: EncodeObject[]
  autoSign: boolean
  /** Required when autoSign is true (submitTxBlock demands a pre-calculated fee). */
  fee?: StdFee
  memo?: string
  /** Gas limit in units — used for fee-estimation fallback. */
  gasLimit?: number
}

export type TxResult = {
  txHash: string
  rawResponse: unknown
}

/**
 * Send a transaction, transparently choosing between `submitTxBlock` (silent,
 * for auto-sign) and `requestTxBlock` (UI prompt). The caller doesn't need
 * to worry about which one — the `autoSign` flag selects.
 */
export async function sendTx(
  kit: InterwovenKit,
  opts: TxSendOpts,
): Promise<TxResult> {
  const { chainId, messages, autoSign, memo } = opts
  haptic('tap')

  try {
    if (autoSign) {
      const fee = opts.fee ?? buildAutoSignFee(opts.gasLimit ?? 500_000)
      const res = await kit.submitTxBlock({ chainId, messages: messages as never, memo, fee })
      haptic('confirm')
      return { txHash: extractTxHash(res), rawResponse: res }
    }
    // Pre-pass `gas` so the kit skips its `simulate` step. The simulate path
    // fails ("invalid uint32: undefined") for the wagmi `injected()` connector
    // because the kit's SigningStargateClient.simulate flow can't build a
    // SignerInfo without a derived pubkey when MetaMask hasn't yet exposed it.
    // A flat gas budget is acceptable; gasAdjustment still applies under the
    // hood for any callers passing a real gas estimate.
    const flatGas = opts.gasLimit ?? 500_000
    const res = await kit.requestTxBlock({
      chainId,
      messages: messages as never,
      memo,
      gas: flatGas,
      gasAdjustment: 1.4,
    } as never)
    haptic('confirm')
    return { txHash: extractTxHash(res), rawResponse: res }
  } catch (e) {
    haptic('error')
    // E2E DIAGNOSTIC: print full error context so wallet-integration bugs
    // (e.g. "invalid uint32: undefined") surface with stack + cause chain.
    if (typeof window !== 'undefined') {
      const m = e instanceof Error ? e.message : String(e)
      const s = e instanceof Error ? e.stack ?? '' : ''
      const cause = e instanceof Error ? (e as Error & { cause?: unknown }).cause : null
      const causeStr =
        cause instanceof Error
          ? `\nCAUSE: ${cause.message}\n${cause.stack ?? ''}`
          : cause
            ? `\nCAUSE: ${JSON.stringify(cause)}`
            : ''
      // eslint-disable-next-line no-console
      console.error(
        `[ori:tx-fail] message=${m}\nchainId=${chainId} autoSign=${autoSign} messageCount=${messages.length}\nSTACK:\n${s}${causeStr}`,
      )
    }
    throw e
  }
}

/**
 * Build a deterministic fee object for auto-signed transactions.
 *
 * Why a helper: `submitTxBlock` requires `fee: StdFee` upfront (no prompt UI).
 * For auto-signed MsgExecute calls, a gasPrice of 0.015u{DENOM} is the
 * Initia default. We over-allocate gas a bit for complex Move calls that
 * perform multiple coin transfers (gift vault release, wager payout split).
 */
export function buildAutoSignFee(gasLimit: number): StdFee {
  const gasPriceMicro = 15 // 0.015 * 1000 = 15 units of gasPrice-per-gas (micro-precise)
  const amount = BigInt(gasLimit) * BigInt(gasPriceMicro) / 1000n
  return {
    amount: [{ denom: ORI_DENOM, amount: amount.toString() }],
    gas: gasLimit.toString(),
  }
}

export function extractTxHash(tx: unknown): string {
  if (!tx || typeof tx !== 'object') return ''
  const m = tx as Record<string, unknown>
  for (const k of ['transactionHash', 'txhash', 'hash']) {
    const v = m[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return ''
}

/**
 * Per-module Move abort-code → human message table. Codes are sourced from
 * the `const E_*` constants in packages/contracts/sources/<module>.move.
 *
 * Cosmos SDK surfaces Move aborts as a string like:
 *   "failed to execute message; message index: 0: ... abort code: 4 from <module>::<function>"
 * On Initia these can also include the module name / function name,
 * which lets us pick the right entry in the table. When no module is
 * detected we fall back to a generic message that includes the raw code.
 */
const MOVE_ABORT_MESSAGES: Record<string, Record<number, string>> = {
  wager_escrow: {
    1: 'Wager not found.',
    2: 'You are not a party to this wager.',
    3: 'Wager not in pending state — already accepted or resolved.',
    4: 'Arbiter must be a third party — not the proposer or accepter.',
    5: 'Wager already accepted.',
    6: 'Stake amount must be greater than zero.',
    7: 'Wager has expired.',
    8: 'Only the arbiter can resolve this wager.',
    9: 'Winner must be the proposer or the accepter.',
  },
  prediction_pool: {
    1: 'Market not found.',
    2: 'Market is past its deadline.',
    3: 'Market is already resolved.',
    4: 'Stake must be greater than zero.',
    5: 'Only the market creator can resolve.',
    6: 'No winning stake to claim.',
  },
  agent_policy: {
    1: 'No policy configured for this agent.',
    2: 'Daily spending cap exceeded for this agent.',
    3: 'Agent has been revoked.',
    4: 'This message type is not in the agent allowlist.',
  },
  payment_router: {
    1: 'Cannot send to yourself.',
    2: 'Recipient does not have a profile yet.',
    3: 'Batch size exceeds the per-tx limit.',
  },
  paywall: {
    1: 'Paywall not found.',
    2: 'Paywall is deactivated.',
    3: 'Insufficient payment.',
    4: 'Already purchased — open the unlocked content.',
  },
  subscription_vault: {
    1: 'Plan not found.',
    2: 'Plan is deactivated.',
    3: 'Already subscribed.',
    4: 'Period not yet due.',
    5: 'No active subscription to release.',
  },
  gift_packet: {
    1: 'Gift not found.',
    2: 'Already claimed.',
    3: 'Gift expired — original sender can reclaim.',
    4: 'Wrong secret — gift cannot be unlocked with this code.',
    5: 'You are not the intended recipient.',
  },
  profile_registry: {
    1: 'Profile already exists.',
    2: 'Profile not found.',
    3: 'Encryption pubkey must be 32 bytes.',
    4: 'Links and labels must be the same length.',
    5: 'Slug already taken.',
  },
}

/**
 * Map raw broadcast/sign errors to something a human would understand.
 * Covers the common ones: insufficient gas, rejected signature, abort codes.
 * Anything unknown falls through to a shortened form of the raw message.
 */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'unknown error')
  const lower = raw.toLowerCase()

  // User-cancelled flows — InterwovenKit + Privy use varying strings.
  if (
    lower.includes('user denied') ||
    lower.includes('user rejected') ||
    lower.includes('request rejected') ||
    lower.includes('closed by user')
  ) {
    return 'You cancelled the transaction.'
  }

  // Funds.
  if (lower.includes('insufficient funds') || lower.includes('insufficient balance')) {
    return "Your wallet doesn't have enough INIT to cover this plus gas."
  }
  if (lower.includes('insufficient fee') || lower.includes('not enough gas')) {
    return 'Gas estimate was too low for this action. Try again.'
  }

  // Move abort codes. Two patterns:
  //   "abort code: N from <addr>::<module>::<function>"
  //   "code N" (older formatter)
  const abortMatch = raw.match(/(?:abort_code|abort code|code)\s*[:=]?\s*(0x[0-9a-f]+|\d+)/i)
  const moduleMatch = raw.match(/::(\w+)::\w+/)
  if (abortMatch) {
    const codeRaw = abortMatch[1]!
    const code = codeRaw.startsWith('0x') ? parseInt(codeRaw, 16) : parseInt(codeRaw, 10)
    const moduleName = moduleMatch?.[1] ?? null
    if (moduleName) {
      const table = MOVE_ABORT_MESSAGES[moduleName]
      if (table && table[code]) return table[code]!
    }
    // Fallback to substring matching on the message itself for the codes
    // that emit categorical names instead of just numbers.
    if (lower.includes('not_found') || lower.includes('not found')) {
      return "That record doesn't exist on-chain. It may have been settled already."
    }
    if (lower.includes('already_resolved') || lower.includes('expired')) {
      return 'This market is already resolved or past its deadline.'
    }
    if (lower.includes('no_stake')) {
      return "You don't have a winning stake to claim."
    }
    return `The chain rejected this action (${moduleName ?? 'unknown module'}, code ${code}).`
  }

  // Network.
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return "Couldn't reach the network. Check your connection and retry."
  }

  // Fallback — keep it short so toast doesn't explode.
  return raw.length > 180 ? raw.slice(0, 180) + '…' : raw
}

/** Extract a specific Move event's `data` field from a transaction response. */
export function extractMoveEventData(
  tx: unknown,
  typeTagSuffix: string,
): Record<string, unknown> | null {
  if (!tx || typeof tx !== 'object') return null
  const events = (tx as { events?: Array<{ type?: string; attributes?: Array<{ key: string; value: string }> }> }).events ?? []
  for (const ev of events) {
    if (ev.type !== 'move') continue
    const tag = ev.attributes?.find((a) => a.key === 'type_tag')?.value ?? ''
    if (!tag.endsWith(typeTagSuffix)) continue
    const dataStr = ev.attributes?.find((a) => a.key === 'data')?.value ?? ''
    try {
      return JSON.parse(dataStr) as Record<string, unknown>
    } catch {
      return null
    }
  }
  return null
}
