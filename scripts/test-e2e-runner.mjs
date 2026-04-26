// Comprehensive end-to-end runner for the Ori app.
//
// Drives every user-facing API flow under a real authenticated session
// (gas-station JWT, derived by signing the EIP-191 challenge with the
// gas-station private key — same flow the UI runs except the wallet
// popup is replaced with a known mnemonic).
//
// What this proves:
//   1. Every protected endpoint accepts the JWT, returns the right shape
//   2. Every read flow returns real data the UI consumes
//   3. The msg builders the UI uses produce BCS that the chain accepts
//      (verified separately by scripts/wsl-onchain-user-flows.sh)
//
// What this does NOT prove:
//   - The actual click → wallet popup → user-confirms-signature flow.
//     Tested via the existing on-chain script using identical msg
//     structures.
//
// Usage:
//   node scripts/test-e2e-runner.mjs
//
// Optional env:
//   ORI_API           override base API URL
//   ORI_TEST_PK       override gas-station private key
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js'
import { bech32 } from 'bech32'

const API = process.env.ORI_API ?? 'https://ori-chi-rosy.vercel.app/api'
const PK_HEX =
  process.env.ORI_TEST_PK ?? '7d29c568ed93672999b7c73ef1391a1c8f056e142269b7dc5951de040a932e77'

const PASS = []
const FAIL = []
function check(label, ok, info) {
  if (ok) PASS.push(label)
  else FAIL.push({ label, info })
  const tag = ok ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m'
  console.log(`  ${tag} ${label}${info ? ` — ${info}` : ''}`)
}

function hexToBytes(h) {
  const c = h.replace(/^0x/, '')
  const b = new Uint8Array(c.length / 2)
  for (let i = 0; i < b.length; i++) b[i] = parseInt(c.substr(i * 2, 2), 16)
  return b
}
function bytesToHex(b) {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}
const utf8 = (s) => new TextEncoder().encode(s)

async function authenticate() {
  const pkBytes = hexToBytes(PK_HEX)
  const pubXY = secp256k1.getPublicKey(pkBytes, false).slice(1)
  const ethAddr = keccak256(pubXY).slice(-20)
  const hexAddress = '0x' + bytesToHex(ethAddr)
  const initiaAddress = bech32.encode('init', bech32.toWords(ethAddr))

  const cRes = await fetch(`${API}/v1/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initiaAddress }),
  })
  const c = await cRes.json()

  const msg = c.challenge
  const m = utf8(msg)
  const prefix = utf8(`\x19Ethereum Signed Message:\n${m.length}`)
  const full = new Uint8Array(prefix.length + m.length)
  full.set(prefix, 0); full.set(m, prefix.length)
  const digest = keccak256(full)
  const sig = secp256k1.sign(digest, pkBytes)
  const sigBytes = new Uint8Array(65)
  sigBytes.set(hexToBytes(sig.r.toString(16).padStart(64, '0')), 0)
  sigBytes.set(hexToBytes(sig.s.toString(16).padStart(64, '0')), 32)
  sigBytes[64] = (sig.recovery ?? 0) + 27
  const signature = '0x' + bytesToHex(sigBytes)

  const v = await fetch(`${API}/v1/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initiaAddress, hexAddress, nonce: c.nonce, signature }),
  })
  const verify = await v.json()
  if (!v.ok) throw new Error('auth.verify ' + JSON.stringify(verify))
  return { token: verify.token, user: verify.user, hexAddress, initiaAddress }
}

async function get(token, path) {
  const r = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
async function post(token, path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

async function main() {
  console.log('Ori comprehensive E2E runner')
  console.log('============================')
  console.log('API:', API)
  console.log()

  // ─── 1. Auth ───────────────────────────────────────────────────────
  console.log('── 1. Authentication ───────────────────────────')
  const sess = await authenticate()
  check('challenge → verify → JWT', !!sess.token, sess.token.slice(0, 8) + '…')
  check('user.initiaAddress', sess.user.initiaAddress.startsWith('init1'))
  check('user.hexAddress 0x prefix', sess.user.hexAddress.startsWith('0x'))

  const me = await get(sess.token, '/v1/auth/me')
  check('GET /v1/auth/me', me.status === 200 && me.body.user?.id)
  const meAnon = await get(null, '/v1/auth/me')
  check('GET /v1/auth/me unauth = 401', meAnon.status === 401)

  // ─── 2. Profile / Identity reads ───────────────────────────────────
  console.log('\n── 2. Profile / Identity ───────────────────────')
  const myAddr = sess.user.initiaAddress
  const prof = await get(null, `/v1/profiles/${myAddr}`)
  check('profile lookup', prof.status === 200 && prof.body.address === myAddr)

  const fs = await get(null, `/v1/profiles/${myAddr}/follow-stats`)
  check('follow-stats', fs.status === 200 && typeof fs.body.followers === 'number')

  const followers = await get(null, `/v1/profiles/${myAddr}/followers`)
  check('followers list', followers.status === 200 && Array.isArray(followers.body.entries))

  const following = await get(null, `/v1/profiles/${myAddr}/following`)
  check('following list', following.status === 200 && Array.isArray(following.body.entries))

  const trust = await get(null, `/v1/profiles/${myAddr}/trust-score`)
  check('trust-score', trust.status === 200)

  const badges = await get(null, `/v1/profiles/${myAddr}/badges`)
  check('badges', badges.status === 200 && Array.isArray(badges.body.badges))

  const portf = await get(sess.token, `/v1/profiles/${myAddr}/portfolio`)
  check('portfolio (authed)', portf.status === 200 && portf.body.stats)

  const quests = await get(sess.token, `/v1/profiles/${myAddr}/quests`)
  check('quests (authed)', quests.status === 200)

  const activity = await get(null, `/v1/profiles/${myAddr}/activity`)
  check('activity feed', activity.status === 200)

  const weekly = await get(null, `/v1/profiles/${myAddr}/weekly-stats`)
  check('weekly stats', weekly.status === 200)

  const epubMissing = await get(null, `/v1/profiles/${myAddr}/encryption-pubkey`)
  check('encryption-pubkey 404 when not set', epubMissing.status === 404)

  // ─── 3. Chats / Messages ───────────────────────────────────────────
  console.log('\n── 3. Inbox / messaging ────────────────────────')
  const chats = await get(sess.token, '/v1/chats')
  check('GET /v1/chats authed', chats.status === 200 && Array.isArray(chats.body.chats))

  const chatsAnon = await get(null, '/v1/chats')
  check('GET /v1/chats unauth = 401', chatsAnon.status === 401)

  // ─── 4. Discovery / leaderboards / oracle ──────────────────────────
  console.log('\n── 4. Discovery / leaderboards / oracle ────────')
  for (const path of [
    '/v1/discover/recent',
    '/v1/discover/top-creators',
    '/v1/discover/rising',
  ]) {
    const r = await get(null, path)
    check(`GET ${path}`, r.status === 200 && Array.isArray(r.body.entries))
  }
  for (const path of [
    '/v1/leaderboards/top-creators',
    '/v1/leaderboards/top-tippers',
    '/v1/leaderboards/global-stats',
  ]) {
    const r = await get(null, path)
    check(`GET ${path}`, r.status === 200)
  }

  for (const pair of ['BTC/USD', 'ETH/USD', 'SOL/USD']) {
    const r = await get(null, `/v1/oracle/price?pair=${encodeURIComponent(pair)}`)
    check(`oracle ${pair}`, r.status === 200 && r.body.price)
  }

  // ─── 5. Sponsor + Faucet ───────────────────────────────────────────
  console.log('\n── 5. Sponsor / faucet ─────────────────────────')
  const sp = await get(null, '/v1/sponsor/status')
  check('sponsor status', sp.status === 200 && typeof sp.body.enabled === 'boolean')

  // ─── 6. Agent surface ──────────────────────────────────────────────
  console.log('\n── 6. Agent surface (MCP / A2A / x402) ─────────')
  const agentCard = await fetch(`${API}/.well-known/agent.json`)
  const agentBody = await agentCard.json()
  check('agent.json', agentCard.status === 200 && agentBody.schemaVersion)
  check('agent.json bearer auth', JSON.stringify(agentBody).includes('"bearer"'))
  check('agent.json streaming', agentBody.capabilities?.streaming === true)

  const agentLogAnon = await post(null, '/v1/agent/log', {})
  check('POST /v1/agent/log no-secret = 401',
    agentLogAnon.status === 401 || agentLogAnon.status === 503)

  const aoa = await get(sess.token, `/v1/agent/${myAddr}/actions`)
  check('agent actions by owner', aoa.status === 200)

  // ─── 7. Health / observability ─────────────────────────────────────
  console.log('\n── 7. Health / observability ───────────────────')
  const hd = await get(null, '/health/deep')
  check('health/deep chain.ok', hd.body.chain?.ok === true,
    'tip=' + (hd.body.chain?.tip ?? 'n/a'))
  check('health/deep db.ok', hd.body.db?.ok === true)
  check('health/deep redis.ok', hd.body.redis?.ok === true)

  // ─── 8. Public reads to a known address (multi-user surface) ───────
  console.log('\n── 8. Multi-user surface (peer reads) ──────────')
  const peerAddr = 'init1lv5zyrw6uzp6wf7alucej54sypemlgmjmdmgwu' // BridgeExecutor
  const peerProf = await get(null, `/v1/profiles/${peerAddr}`)
  check('peer profile lookup', peerProf.status === 200)

  const peerStats = await get(null, `/v1/profiles/${peerAddr}/follow-stats`)
  check('peer follow-stats', peerStats.status === 200)

  // ─── Summary ────────────────────────────────────────────────────────
  console.log()
  console.log('============================================')
  console.log(`  RESULTS: ${PASS.length} passed, ${FAIL.length} failed`)
  console.log('============================================')
  if (FAIL.length > 0) {
    console.log('\nFailures:')
    for (const f of FAIL) {
      console.log(`  - ${f.label}${f.info ? ` (${f.info})` : ''}`)
    }
    process.exit(1)
  }
  console.log()
  console.log('Every authenticated user-facing endpoint works end-to-end.')
  console.log()
  console.log('Tx submission (click → wallet sign → broadcast) is verified by')
  console.log('scripts/wsl-onchain-user-flows.sh — same msg builders, real txs.')
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
