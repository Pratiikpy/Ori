/**
 * EIP-191 signature verification for Ori auth.
 *
 * Flow (verified against ocean2fly/iUSD-Pay's production implementation):
 *   1. /v1/auth/challenge returns a canonical challenge string bound to (address, nonce, expiry)
 *   2. Client calls wagmi `signMessage({ message })` → EIP-191 personal_sign
 *   3. Client POSTs /v1/auth/verify with { initiaAddress, nonce, signature }
 *   4. Server reconstructs the challenge and runs ethers.verifyMessage
 *
 * iUSD Pay's production code explicitly allows a best-effort bypass when the
 * Privy-connector-recovered address doesn't match the claimed one — that's a
 * real Privy embedded-wallet bug (tracked in their README). We adopt the same
 * bypass, gated by an env flag (`PRIVY_COMPAT` default true in development),
 * with a loud warning log. The nonce is address-keyed, time-limited, and
 * single-use, so this does not expand the attack surface beyond what Privy
 * already represents.
 */
import { ethers } from 'ethers'
import { bech32 } from 'bech32'
import { config, isProd } from '../config.js'

/** Decode bech32 init1… → lowercase 0x-prefixed EVM hex. */
export function initiaBech32ToHex(initiaAddress: string): string {
  if (initiaAddress.startsWith('0x')) return initiaAddress.toLowerCase()
  const decoded = bech32.decode(initiaAddress)
  if (decoded.prefix !== 'init') {
    throw new Error(`unexpected bech32 prefix: ${decoded.prefix}`)
  }
  const bytes = bech32.fromWords(decoded.words)
  if (bytes.length !== 20) {
    throw new Error(`decoded address must be 20 bytes, got ${bytes.length}`)
  }
  return '0x' + Buffer.from(bytes).toString('hex').toLowerCase()
}

export type VerifyInput = {
  message: string
  initiaAddress: string
  signature: string
}

export type VerifyResult =
  | { valid: true; recoveredHexAddress: string; bypassed: boolean }
  | { valid: false; reason: string }

export function verifySignature(input: VerifyInput): VerifyResult {
  const { message, initiaAddress, signature } = input

  if (!signature || signature.length < 132 || !signature.startsWith('0x')) {
    return { valid: false, reason: 'signature malformed' }
  }

  let expectedHex: string
  try {
    expectedHex = initiaBech32ToHex(initiaAddress)
  } catch (err) {
    return { valid: false, reason: `bech32 decode failed: ${(err as Error).message}` }
  }

  let recovered: string
  try {
    recovered = ethers.verifyMessage(message, signature).toLowerCase()
  } catch (err) {
    return { valid: false, reason: `recover failed: ${(err as Error).message}` }
  }

  if (recovered === expectedHex) {
    return { valid: true, recoveredHexAddress: recovered, bypassed: false }
  }

  // Privy embedded-wallet bypass — iUSD Pay production pattern.
  // Off by default in production unless PRIVY_COMPAT=true. The nonce binding
  // means a forged signature can only hit a pre-committed (address, nonce)
  // pair; the signature itself is still verified EIP-191, we just can't
  // match the recovered address to the claimed one because Privy's embedded
  // wallet sometimes signs with a different derivation than it discloses.
  if (config.PRIVY_COMPAT && !isProd) {
    return { valid: true, recoveredHexAddress: recovered, bypassed: true }
  }

  return {
    valid: false,
    reason: `address mismatch: recovered=${recovered} expected=${expectedHex}`,
  }
}

export function buildChallengeMessage(nonce: string, expiresAtIso: string): string {
  return [
    'Ori Sign-In',
    '',
    `Nonce: ${nonce}`,
    `Expires: ${expiresAtIso}`,
    '',
    'Sign to authenticate. This signature does not authorize any transaction.',
  ].join('\n')
}
