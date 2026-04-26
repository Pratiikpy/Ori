// Generate a real Ori session JWT for gas-station by calling
// /v1/auth/challenge and signing the EIP-191 challenge with the
// gas-station private key (eth_secp256k1 — Initia's default for
// Privy-compat profiles).
//
// Usage:
//   node scripts/test-jwt.mjs
//
// Prints the JWT to stdout. Set ORI_TEST_PK env if you want a
// different private key. Defaults to the gas-station hex export.
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js'
import { bech32 } from 'bech32'

const keccak_256 = keccak256
const secp = { secp256k1 }

const API = process.env.ORI_API ?? 'https://ori-chi-rosy.vercel.app/api'
const PK_HEX =
  process.env.ORI_TEST_PK ?? '7d29c568ed93672999b7c73ef1391a1c8f056e142269b7dc5951de040a932e77'

function hexToBytes(hex) {
  const clean = hex.replace(/^0x/, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return bytes
}
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}
function utf8(s) { return new TextEncoder().encode(s) }

async function main() {
  const pkBytes = hexToBytes(PK_HEX)
  const pubCompressed = secp.secp256k1.getPublicKey(pkBytes, true)     // 33 bytes
  const pubUncompressed = secp.secp256k1.getPublicKey(pkBytes, false)  // 65 bytes (0x04 || X || Y)
  const pubXY = pubUncompressed.slice(1) // strip 0x04 prefix → 64 bytes

  // Ethereum-style address: keccak256(pubXY) → last 20 bytes
  const ethAddrBytes = keccak_256(pubXY).slice(-20)
  const hexAddress = '0x' + bytesToHex(ethAddrBytes)
  const initiaAddress = bech32.encode('init', bech32.toWords(ethAddrBytes))
  console.error('hexAddress:    ', hexAddress)
  console.error('initiaAddress: ', initiaAddress)

  // 1. Request challenge
  const cRes = await fetch(`${API}/v1/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initiaAddress }),
  })
  const challenge = await cRes.json()
  if (!cRes.ok) throw new Error('challenge fail: ' + JSON.stringify(challenge))
  console.error('nonce:', challenge.nonce)

  // 2. Sign EIP-191 personal_sign
  // Format: keccak256("\x19Ethereum Signed Message:\n" + msg.length + msg)
  const msg = challenge.challenge
  const msgBytes = utf8(msg)
  const prefix = utf8(`\x19Ethereum Signed Message:\n${msgBytes.length}`)
  const fullMsg = new Uint8Array(prefix.length + msgBytes.length)
  fullMsg.set(prefix, 0)
  fullMsg.set(msgBytes, prefix.length)
  const digest = keccak_256(fullMsg)
  const sig = secp.secp256k1.sign(digest, pkBytes)
  // Build 65-byte (r || s || v) signature with v = 27 + recovery
  const sigBytes = new Uint8Array(65)
  sigBytes.set(hexToBytes(sig.r.toString(16).padStart(64, '0')), 0)
  sigBytes.set(hexToBytes(sig.s.toString(16).padStart(64, '0')), 32)
  sigBytes[64] = (sig.recovery ?? 0) + 27
  const sigHex = '0x' + bytesToHex(sigBytes)

  // 3. Verify
  const vRes = await fetch(`${API}/v1/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      initiaAddress,
      hexAddress,
      nonce: challenge.nonce,
      signature: sigHex,
    }),
  })
  const verify = await vRes.json()
  if (!vRes.ok) {
    console.error('verify fail:', JSON.stringify(verify, null, 2))
    process.exit(1)
  }
  // Print only the JWT to stdout for shell capture
  console.log(verify.token)
  console.error('user:', JSON.stringify(verify.user))
}

main().catch((e) => {
  console.error('FAIL:', e.message)
  process.exit(1)
})
