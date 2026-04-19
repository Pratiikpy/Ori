'use client'

/**
 * Deterministic keypair store backed by IndexedDB.
 *
 * Key design:
 *   1. The X25519 keypair is DERIVED from a wallet signature over
 *      KEY_DERIVATION_MESSAGE — so the same wallet produces the SAME keypair
 *      on every device. This is the multi-device fix: user onboarding on
 *      Phone A and Phone B produces the same public key; messages encrypted
 *      to Phone A can be decrypted on Phone B.
 *   2. We cache the public key (only) in IndexedDB for fast lookups without
 *      requiring a re-sign. The private key never touches disk.
 *
 * Why deterministic-from-signature (not store-encrypted):
 *   - Lost device = lost key is unacceptable for a real product. A signature
 *     over a canonical challenge is available anywhere the user can sign.
 *   - The signature is 65 bytes; we hash it with BLAKE2b-32 to get a uniform
 *     32-byte seed, then feed it into libsodium's seed-based keypair
 *     constructor so the keypair is fully determined by the signature.
 *   - This ties E2E identity to wallet identity — if you can sign with the
 *     wallet, you can decrypt your messages. Exactly what you want.
 */
import sodium from 'libsodium-wrappers-sumo'

const DB_NAME = 'ori'
const STORE_NAME = 'keystore'
const DB_VERSION = 2

export const KEY_DERIVATION_MESSAGE =
  'Ori E2E Key Derivation v1\n' +
  'Sign this message to unlock your encrypted messages.\n\n' +
  'The signature never leaves your device and authorizes no transactions.\n' +
  'Signing the same message always produces the same key.'

type StoredPubkey = {
  publicKey: Uint8Array
  ownerHexAddress: string
  version: number
}

let sodiumReady: Promise<void> | null = null
async function ensureSodium(): Promise<void> {
  if (!sodiumReady) sodiumReady = sodium.ready
  await sodiumReady
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const r = store.get(key)
    r.onsuccess = () => resolve((r.result as T | undefined) ?? null)
    r.onerror = () => reject(r.error)
  })
}

async function idbPut<T>(key: string, value: T): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const r = store.put(value, key)
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const r = store.delete(key)
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  })
}

function pubkeyIndexKey(hexAddress: string): string {
  return `pubkey:${hexAddress.toLowerCase()}`
}

export type Keypair = {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

/**
 * Deterministically derive the X25519 keypair from a wallet signature.
 *
 * Input: `signatureHex` — 0x-prefixed EIP-191 signature over KEY_DERIVATION_MESSAGE.
 * Output: the SAME {publicKey, privateKey} on every invocation with the same signature.
 */
export async function deriveKeypair(signatureHex: string): Promise<Keypair> {
  await ensureSodium()
  const clean = signatureHex.startsWith('0x') ? signatureHex.slice(2) : signatureHex
  const sigBytes = sodium.from_hex(clean)
  // BLAKE2b(32) of signature → canonical 32-byte seed.
  // libsodium's crypto_box_seed_keypair produces a deterministic keypair from a seed.
  const seed = sodium.crypto_generichash(32, sigBytes, null)
  const kp = sodium.crypto_box_seed_keypair(seed)
  // Wipe the seed — we don't need to retain it.
  seed.fill(0)
  return { publicKey: kp.publicKey, privateKey: kp.privateKey }
}

/** Cache only the public key — private key is never persisted; re-derive on demand. */
export async function cachePublicKey(hexAddress: string, publicKey: Uint8Array): Promise<void> {
  const blob: StoredPubkey = {
    publicKey,
    ownerHexAddress: hexAddress.toLowerCase(),
    version: 2,
  }
  await idbPut(pubkeyIndexKey(hexAddress), blob)
}

export async function getCachedPublicKey(hexAddress: string): Promise<Uint8Array | null> {
  const blob = await idbGet<StoredPubkey>(pubkeyIndexKey(hexAddress))
  if (!blob) return null
  if (blob.ownerHexAddress !== hexAddress.toLowerCase()) return null
  return blob.publicKey
}

export async function hasCachedPublicKey(hexAddress: string): Promise<boolean> {
  return (await getCachedPublicKey(hexAddress)) !== null
}

export async function deleteCached(hexAddress: string): Promise<void> {
  await idbDelete(pubkeyIndexKey(hexAddress))
}

// ─────────────────────────────────────────────────────────────────────────────
// Back-compat shims — earlier code called these names. Forward to the
// determinism-based API so existing components keep compiling.
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated in favor of {@link deriveKeypair} + {@link cachePublicKey}. */
export async function createAndStoreKeypair(
  hexAddress: string,
  signatureHex: string,
): Promise<Keypair> {
  const kp = await deriveKeypair(signatureHex)
  await cachePublicKey(hexAddress, kp.publicKey)
  return kp
}

/** @deprecated re-derives instead of decrypting a stored blob. */
export async function unlockKeypair(
  hexAddress: string,
  signatureHex: string,
): Promise<Keypair> {
  const kp = await deriveKeypair(signatureHex)
  // Opportunistically refresh the cached pubkey in case this is a fresh device.
  await cachePublicKey(hexAddress, kp.publicKey)
  return kp
}

/** @deprecated public-key-only check — matches the new flow. */
export async function getPublicKey(hexAddress: string): Promise<Uint8Array | null> {
  return getCachedPublicKey(hexAddress)
}

/** @deprecated — prefer {@link hasCachedPublicKey}. */
export async function hasKeypair(hexAddress: string): Promise<boolean> {
  return hasCachedPublicKey(hexAddress)
}

/** @deprecated — prefer {@link deleteCached}. */
export async function deleteKeypair(hexAddress: string): Promise<void> {
  await deleteCached(hexAddress)
}
