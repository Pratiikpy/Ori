// Type augmentation for libsodium-wrappers-sumo.
//
// @types/libsodium-wrappers-sumo@0.7.8's namespace types are missing the
// most-used runtime members: `.ready`, `.randombytes_buf`, `.crypto_box_*`,
// `.crypto_hash_sha256`, `.crypto_generichash`, `.from_hex` etc. We can't
// use a namespace import (`import * as sodium`) because the actual .mjs
// build has a single default export — at runtime, named imports fail with
// "The export X was not found in module".
//
// So we keep `import sodium from 'libsodium-wrappers-sumo'` and use module
// augmentation to enrich the TYPE of the default export to match what's
// actually exposed at runtime.
declare module 'libsodium-wrappers-sumo' {
  interface Sodium {
    /** Promise that resolves once the WASM core has loaded. Always await
     * this before calling any other sodium function. */
    ready: Promise<void>

    // Hashing
    crypto_hash_sha256(input: Uint8Array): Uint8Array
    crypto_generichash(
      hashLength: number,
      input: Uint8Array | string,
      key?: Uint8Array | null,
    ): Uint8Array

    // Sealed box (anonymous public-key encryption)
    crypto_box_seal(plaintext: Uint8Array, publicKey: Uint8Array): Uint8Array
    crypto_box_seal_open(
      ciphertext: Uint8Array,
      publicKey: Uint8Array,
      privateKey: Uint8Array,
    ): Uint8Array

    // Keypair generation
    crypto_box_seed_keypair(seed: Uint8Array): {
      keyType: 'x25519'
      privateKey: Uint8Array
      publicKey: Uint8Array
    }
    crypto_box_keypair(): {
      keyType: 'x25519'
      privateKey: Uint8Array
      publicKey: Uint8Array
    }

    // Random bytes
    randombytes_buf(length: number): Uint8Array

    // Encoding helpers
    from_hex(hex: string): Uint8Array
    to_hex(bytes: Uint8Array): string
    from_base64(b64: string, variant?: number): Uint8Array
    to_base64(bytes: Uint8Array, variant?: number): string
  }
  const sodium: Sodium
  export default sodium
}
