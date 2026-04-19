/**
 * Runtime-neutral byte helpers.
 *
 * Node has `Buffer`, browsers/Deno have `atob`/`Uint8Array`. This module
 * provides base64 encode/decode + hex helpers that work identically in:
 *   - Node 20+ (Buffer via globalThis)
 *   - Deno (TextEncoder + native atob/btoa)
 *   - Modern browsers (same as Deno)
 *
 * By keeping these functions self-contained, neither the decoder nor its
 * consumers need to import node:* or deno std/* directly.
 */

/** base64 → utf8 string */
export function b64ToUtf8(b64: string): string {
  if (typeof globalThis.atob === 'function') {
    // Deno + browsers
    const bin = globalThis.atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new TextDecoder('utf-8').decode(bytes)
  }
  // Node 20+ also has atob via globalThis; fall back to Buffer just in case.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BufferCtor = (globalThis as any).Buffer
  if (BufferCtor) {
    return BufferCtor.from(b64, 'base64').toString('utf8')
  }
  throw new Error('no base64 decoder available in this runtime')
}

/** Convert a u8 array or a hex/0x-hex string to lowercase hex. */
export function bytesOrStringToHex(input: unknown): string {
  if (typeof input === 'string') {
    const clean = input.startsWith('0x') ? input.slice(2) : input
    if (/^[0-9a-f]+$/i.test(clean)) return clean.toLowerCase()
    return ''
  }
  if (Array.isArray(input)) {
    let hex = ''
    for (const n of input) {
      const byte = Number(n) & 0xff
      hex += byte.toString(16).padStart(2, '0')
    }
    return hex
  }
  return ''
}

/**
 * Convert hex to Uint8Array. Accepts 0x-prefixed or plain. Pads odd-length
 * input with a leading zero nibble (shouldn't happen for well-formed addresses,
 * but Initia's REST sometimes strips leading zeros).
 */
export function hexToBytes(hex: string): Uint8Array {
  let h = hex.startsWith('0x') ? hex.slice(2) : hex
  if (h.length % 2 === 1) h = '0' + h
  const out = new Uint8Array(h.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** Safe JSON.parse returning `null` on failure. */
export function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
