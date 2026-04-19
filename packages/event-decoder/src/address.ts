/**
 * Address normalization — converts any Initia address representation
 * (bech32 init1..., 0x-prefixed hex, 32-byte hex with leading zeros,
 * short-hex stripped of leading zeros) to canonical `init1...`.
 *
 * Why this is needed: Initia's REST API pretty-prints addresses by
 * stripping leading zero-nibbles, so you may receive strings shorter
 * than 40 chars. We left-pad back to a full 20 bytes before encoding.
 */
import { bech32 } from 'bech32'
import { hexToBytes } from './runtime.js'

export function normalizeAddress(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('init1')) return raw

  let clean = raw.startsWith('0x') ? raw.slice(2) : raw
  // Drop any oversized leading zero-prefix (32-byte form would be 64 chars).
  clean = clean.replace(/^0+/, '') || '0'
  // Ensure an even number of hex digits.
  if (clean.length % 2 === 1) clean = '0' + clean
  // Trim to 20 bytes if it exceeds (meaningful bytes are the trailing ones).
  if (clean.length > 40) clean = clean.slice(-40)
  // Left-pad to a full 20 bytes.
  clean = clean.padStart(40, '0')

  try {
    const bytes = hexToBytes(clean)
    const words = bech32.toWords(bytes)
    return bech32.encode('init', words)
  } catch {
    return raw
  }
}
