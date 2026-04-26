/**
 * E2E encryption helpers using libsodium sealed box.
 *
 * Design:
 *   - Each user generates an X25519 keypair on first run (keystore.ts).
 *   - Public key is posted on-chain via profile_registry::set_encryption_pubkey
 *     so any counterparty can fetch it and encrypt.
 *   - Private key is stored in IndexedDB, encrypted at rest with a symmetric key
 *     derived from an EIP-191 wallet signature over KEY_DERIVATION_MESSAGE.
 *   - Sender encrypts each message with recipient's pubkey (sealed box).
 *   - Only recipient can decrypt — backend stores ciphertext only.
 */
// Default import — the .mjs build of libsodium-wrappers-sumo exposes a
// single default export. The default's runtime members are typed via the
// module augmentation in apps/web/src/types/libsodium-wrappers-sumo.d.ts.
import sodium from 'libsodium-wrappers-sumo'

let readyPromise: Promise<void> | null = null
async function ensureReady(): Promise<void> {
  if (!readyPromise) readyPromise = sodium.ready
  await readyPromise
}

/** Encrypt a plaintext Uint8Array using a sealed box to the recipient's X25519 pubkey. */
export async function sealedBoxEncrypt(
  plaintext: Uint8Array,
  recipientPublicKey: Uint8Array,
): Promise<Uint8Array> {
  await ensureReady()
  return sodium.crypto_box_seal(plaintext, recipientPublicKey)
}

/** Decrypt a sealed-box ciphertext with our keypair. */
export async function sealedBoxDecrypt(
  ciphertext: Uint8Array,
  publicKey: Uint8Array,
  privateKey: Uint8Array,
): Promise<Uint8Array> {
  await ensureReady()
  return sodium.crypto_box_seal_open(ciphertext, publicKey, privateKey)
}

/** SHA-256 hash (used for payment-link secret commitment). */
export async function sha256(input: Uint8Array): Promise<Uint8Array> {
  await ensureReady()
  return sodium.crypto_hash_sha256(input)
}

export async function randomBytes(n: number): Promise<Uint8Array> {
  await ensureReady()
  return sodium.randombytes_buf(n)
}

/**
 * Derive a stable chat ID from two participants' addresses. Order-independent.
 * Uses SHA-256 of sorted, lowercased addresses joined by a null byte.
 */
export async function deriveChatId(addrA: string, addrB: string): Promise<string> {
  await ensureReady()
  const [a, b] = [addrA.toLowerCase(), addrB.toLowerCase()].sort() as [string, string]
  const enc = new TextEncoder()
  const bytes = new Uint8Array(enc.encode(a).length + 1 + enc.encode(b).length)
  bytes.set(enc.encode(a), 0)
  bytes[enc.encode(a).length] = 0
  bytes.set(enc.encode(b), enc.encode(a).length + 1)
  const hash = sodium.crypto_hash_sha256(bytes)
  return toHex(hash)
}

export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0')
  }
  return out
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16)
  }
  return out
}

export function toBase64(bytes: Uint8Array): string {
  if (typeof window === 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return window.btoa(binary)
}

export function fromBase64(b64: string): Uint8Array {
  if (typeof window === 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'))
  }
  const binary = window.atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}
