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
import { ORI_DENOM } from './chain-config'
import { haptic } from './haptics'

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
    const res = await kit.requestTxBlock({
      chainId,
      messages: messages as never,
      memo,
      gasAdjustment: 1.4,
    })
    haptic('confirm')
    return { txHash: extractTxHash(res), rawResponse: res }
  } catch (e) {
    haptic('error')
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

  // Move abort codes — format "code N" or "abort_code: 0xabcde".
  // Our modules throw error::invalid_argument, not_found, etc. We don't try
  // to decode every code; we just nudge the user toward actionable retry.
  const abortMatch = raw.match(/(?:abort_code|code)\s*[:=]?\s*(0x[0-9a-f]+|\d+)/i)
  if (abortMatch) {
    if (lower.includes('not_found') || lower.includes('not found')) {
      return "That record doesn't exist on-chain. It may have been settled already."
    }
    if (lower.includes('already_resolved') || lower.includes('expired')) {
      return 'This market is already resolved or past its deadline.'
    }
    if (lower.includes('no_stake')) {
      return "You don't have a winning stake in this market."
    }
    return `The chain rejected this action (${abortMatch[1]}). Try again or check the explorer.`
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
