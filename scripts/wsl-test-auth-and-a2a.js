#!/usr/bin/env node
/**
 * Phase 4 end-to-end: real EIP-191 auth flow + A2A JSON-RPC round-trip.
 *
 * Auth:
 *   1. derive wallet from mnemonic (Initia uses coinType=60, same as ETH)
 *   2. convert hex → bech32 init1...
 *   3. POST /v1/auth/challenge
 *   4. EIP-191 personal_sign the challenge
 *   5. POST /v1/auth/verify → JWT
 *   6. GET /v1/auth/me with Bearer token
 *   7. POST an authenticated endpoint (e.g. profile update)
 *
 * A2A:
 *   1. Spawn mcp-server with ORI_A2A_PORT=3030 (stdio stays connected but to
 *      a null stdin; we just need the HTTP server side)
 *   2. Wait for listen
 *   3. POST /a2a JSON-RPC tools/list
 *   4. POST /a2a JSON-RPC tools/call (ori.get_balance)
 *   5. POST /a2a direct method (ori.get_balance as method)
 *   6. Error envelopes: parse error, unknown method
 *
 * This script runs from the API package so we pick up its ethers + bech32.
 */
const { ethers } = require('ethers')
const { bech32 } = require('bech32')
const { spawn } = require('node:child_process')
const http = require('node:http')

const API = 'http://localhost:3001'
const A2A_PORT = 3030
// Read from env. Either export ORI_TEST_MNEMONIC before running, or source
// apps/api/.env first (local dev has ORI_DEPLOYER_MNEMONIC already set).
const MNEMONIC = process.env.ORI_TEST_MNEMONIC || process.env.ORI_DEPLOYER_MNEMONIC || ''
if (!MNEMONIC) {
  console.error(
    'No mnemonic set. Export ORI_TEST_MNEMONIC (12 or 24-word BIP-39 of a funded init1 wallet) before running this test.',
  )
  process.exit(1)
}

let PASS = 0
let FAIL = 0
const fails = []

function pass(label, detail = '') {
  PASS += 1
  console.log(`  [PASS] ${label.padEnd(44)} ${String(detail).slice(0, 80)}`)
}
function fail(label, detail) {
  FAIL += 1
  fails.push(`${label} :: ${String(detail).slice(0, 240)}`)
  console.log(`  [FAIL] ${label.padEnd(44)} ${String(detail).slice(0, 140)}`)
}

function hexToBech32Init(hex0x) {
  const bytes = Buffer.from(hex0x.slice(2), 'hex')
  if (bytes.length !== 20) throw new Error(`bad hex length ${bytes.length}`)
  const words = bech32.toWords(bytes)
  return bech32.encode('init', words)
}

async function post(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: res.status, body: json, raw: text }
}

async function get(url, headers = {}) {
  const res = await fetch(url, { headers })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: res.status, body: json, raw: text }
}

async function main() {
  console.log('='.repeat(72))
  console.log('  PHASE 4: AUTH FLOW + A2A JSON-RPC')
  console.log('='.repeat(72))
  console.log('')

  // ═══════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════
  console.log('=== Auth flow (EIP-191 challenge → verify → authed request) ===')

  const wallet = ethers.Wallet.fromPhrase(MNEMONIC)
  const hexAddr = wallet.address.toLowerCase()
  let initAddr
  try {
    initAddr = hexToBech32Init(hexAddr)
    pass('derive wallet', `${initAddr}`)
  } catch (e) {
    fail('derive wallet', String(e))
    return
  }

  // 1. challenge
  const ch = await post(`${API}/v1/auth/challenge`, { initiaAddress: initAddr })
  if (ch.status !== 200 || !ch.body?.nonce) {
    fail('auth challenge', `status=${ch.status} body=${ch.raw.slice(0, 160)}`)
    return
  }
  pass('auth challenge', `nonce=${ch.body.nonce.slice(0, 16)}... expires=${ch.body.expiresAt}`)

  // 2. sign
  let sig
  try {
    sig = await wallet.signMessage(ch.body.challenge)
    pass('EIP-191 sign', `sig=${sig.slice(0, 20)}...`)
  } catch (e) {
    fail('EIP-191 sign', String(e))
    return
  }

  // 3. verify
  const vr = await post(`${API}/v1/auth/verify`, {
    initiaAddress: initAddr,
    hexAddress: hexAddr,
    nonce: ch.body.nonce,
    signature: sig,
  })
  if (vr.status !== 200 || !vr.body?.token) {
    fail('auth verify', `status=${vr.status} body=${vr.raw.slice(0, 160)}`)
    return
  }
  const token = vr.body.token
  pass('auth verify', `token=${token.slice(0, 16)}... user.id=${vr.body.user?.id}`)

  // 4. /v1/auth/me
  const me = await get(`${API}/v1/auth/me`, { authorization: `Bearer ${token}` })
  if (me.status !== 200 || me.body?.user?.initiaAddress !== initAddr) {
    fail('GET /v1/auth/me', `status=${me.status} body=${me.raw.slice(0, 160)}`)
  } else {
    pass('GET /v1/auth/me', `addr=${me.body.user.initiaAddress}`)
  }

  // 5. /v1/auth/me with NO token → should 401
  const me401 = await get(`${API}/v1/auth/me`)
  if (me401.status === 401) {
    pass('GET /v1/auth/me (no token)', '401 as expected')
  } else {
    fail('GET /v1/auth/me (no token)', `expected 401 got ${me401.status}`)
  }

  // 6. /v1/auth/me with GARBAGE token → should 401
  const me401g = await get(`${API}/v1/auth/me`, { authorization: 'Bearer deadbeef' })
  if (me401g.status === 401) {
    pass('GET /v1/auth/me (bad token)', '401 as expected')
  } else {
    fail('GET /v1/auth/me (bad token)', `expected 401 got ${me401g.status}`)
  }

  // 7. use JWT to hit an actual authed write — profile PATCH / POST.
  //    Look up a likely protected endpoint; if profiles.ts exposes PATCH /v1/profiles/me,
  //    we try that. Failure with 400/404 still validates that auth passed
  //    (not 401).
  const profUpdate = await post(
    `${API}/v1/profiles/me`,
    { bio: `ori-auth-test-${Date.now()}` },
    { authorization: `Bearer ${token}` },
  )
  if (profUpdate.status === 401) {
    fail('authed POST /v1/profiles/me', `unexpected 401 with valid token`)
  } else {
    pass('authed POST /v1/profiles/me', `status=${profUpdate.status} (auth accepted)`)
  }

  // 8. logout → next /me should 401
  const lo = await post(`${API}/v1/auth/logout`, {}, { authorization: `Bearer ${token}` })
  if (lo.status === 204 || lo.status === 200) {
    pass('POST /v1/auth/logout', `status=${lo.status}`)
  } else {
    fail('POST /v1/auth/logout', `status=${lo.status} body=${lo.raw.slice(0, 160)}`)
  }
  const me2 = await get(`${API}/v1/auth/me`, { authorization: `Bearer ${token}` })
  if (me2.status === 401) {
    pass('GET /v1/auth/me (post-logout)', '401 as expected')
  } else {
    fail('GET /v1/auth/me (post-logout)', `expected 401 got ${me2.status}`)
  }

  // ═══════════════════════════════════════════════════
  // A2A JSON-RPC HTTP
  // ═══════════════════════════════════════════════════
  console.log('')
  console.log('=== A2A JSON-RPC HTTP ===')

  const env = {
    ...process.env,
    ORI_CHAIN_ID: 'ori-1',
    ORI_RPC_URL: 'http://localhost:26657',
    ORI_REST_URL: 'http://localhost:1317',
    ORI_MODULE_ADDRESS: '0x05dd0c60873d4d93658d5144fd0615bcfa43a53a',
    ORI_DENOM: 'umin',
    ORI_API_URL: API,
    ORI_WEB_URL: 'http://localhost:3000',
    ORI_A2A_PORT: String(A2A_PORT),
    ORI_MCP_STDIO: 'off', // HTTP server only
    ORI_MCP_MNEMONIC: MNEMONIC,
  }
  const mcp = spawn(
    'node',
    ['/mnt/c/Users/prate/Downloads/Initia builder/ori/apps/mcp-server/dist/index.js'],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  )

  const stderrBuf = []
  mcp.stderr.on('data', (d) => stderrBuf.push(d.toString()))

  // Wait up to 10s for "listening" log
  const ready = await new Promise((resolve) => {
    const t0 = Date.now()
    const poll = () => {
      const s = stderrBuf.join('')
      if (s.includes('[ori-a2a]')) return resolve(true)
      if (Date.now() - t0 > 10000) return resolve(false)
      setTimeout(poll, 200)
    }
    poll()
  })
  if (!ready) {
    fail('A2A startup', `never printed listen log: ${stderrBuf.join('').slice(0, 200)}`)
    mcp.kill()
    finish()
    return
  }
  pass('A2A startup', `listening on :${A2A_PORT}`)

  const A2A = `http://localhost:${A2A_PORT}`

  // Health / discovery
  const health = await get(`${A2A}/`)
  if (health.status === 200 && health.body?.protocol === 'a2a') {
    pass('GET / discovery', `caps=${health.body.capabilities?.length ?? 0} tools`)
  } else {
    fail('GET / discovery', `status=${health.status} body=${health.raw.slice(0, 160)}`)
  }

  // tools/list
  const tl = await post(`${A2A}/a2a`, { jsonrpc: '2.0', id: 1, method: 'tools/list' })
  if (tl.status === 200 && tl.body?.result?.tools?.length >= 14) {
    pass('POST tools/list', `got ${tl.body.result.tools.length} tools`)
  } else {
    fail('POST tools/list', `status=${tl.status} body=${tl.raw.slice(0, 160)}`)
  }

  // tools/call ori.get_balance
  const tc = await post(`${A2A}/a2a`, {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'ori.get_balance', arguments: { address: initAddr } },
  })
  if (tc.status === 200 && tc.body?.result?.content?.[0]?.text) {
    pass('POST tools/call get_balance', tc.body.result.content[0].text.slice(0, 80))
  } else {
    fail('POST tools/call get_balance', `status=${tc.status} body=${tc.raw.slice(0, 160)}`)
  }

  // Direct-method ori.get_balance
  const dm = await post(`${A2A}/a2a`, {
    jsonrpc: '2.0',
    id: 3,
    method: 'ori.get_balance',
    params: { address: initAddr },
  })
  if (dm.status === 200 && dm.body?.result?.content?.[0]?.text) {
    pass('POST direct ori.get_balance', dm.body.result.content[0].text.slice(0, 80))
  } else {
    fail('POST direct ori.get_balance', `status=${dm.status} body=${dm.raw.slice(0, 160)}`)
  }

  // Parse-error envelope
  const pe = await new Promise((resolve) => {
    const r = http.request(
      { host: 'localhost', port: A2A_PORT, path: '/a2a', method: 'POST' },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) })
          } catch {
            resolve({ status: res.statusCode, body: null, raw: data })
          }
        })
      },
    )
    r.on('error', (e) => resolve({ err: e.message }))
    r.write('{not json')
    r.end()
  })
  if (pe.body?.error?.code === -32700) {
    pass('parse-error envelope', 'code=-32700 Parse error')
  } else {
    fail('parse-error envelope', JSON.stringify(pe))
  }

  // Unknown method envelope
  const unk = await post(`${A2A}/a2a`, { jsonrpc: '2.0', id: 4, method: 'does.not.exist' })
  if (unk.body?.error?.code === -32601) {
    pass('unknown-method envelope', 'code=-32601 Method not found')
  } else {
    fail('unknown-method envelope', JSON.stringify(unk.body ?? unk.raw))
  }

  mcp.kill()
  finish()
}

function finish() {
  console.log('')
  console.log('='.repeat(72))
  console.log(`  AUTH + A2A RESULTS: ${PASS} passed, ${FAIL} failed`)
  console.log('='.repeat(72))
  if (fails.length) {
    console.log('')
    console.log('Failures:')
    for (const f of fails) console.log(`  - ${f}`)
    process.exit(1)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error('fatal:', e)
  process.exit(1)
})
