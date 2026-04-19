#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Ori — comprehensive end-to-end test harness.
 *
 * Exercises every Move module + every API endpoint across 4 signed actors
 * (deployer + Alice + Bob + Carol). No browser, no wallet UI — we replicate
 * the same MsgExecute calls InterwovenKit would emit, signed with cosmjs +
 * @initia/initia.js. Catches: config drift, event-indexing gaps, bad BCS
 * encoding, auth regression, signed-tx failures, aggregation bugs.
 *
 * Run:
 *   pnpm --filter @ori/api exec tsx scripts/e2e/run.ts
 *
 * Optionally: ONLY=profile,tip just runs matching tests.
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { MnemonicKey, Wallet, MsgExecute, MsgSend, RESTClient, bcs } from '@initia/initia.js'
import { ethers } from 'ethers'
import { bech32 } from 'bech32'

// libsodium-sumo's ESM entry is broken in some pnpm layouts — require the CJS build.
const localRequire = createRequire(import.meta.url)
const sodiumPkg = localRequire('libsodium-wrappers-sumo') as { default?: SodiumLike } & SodiumLike
const sodium: SodiumLike = sodiumPkg.default ?? sodiumPkg

type SodiumLike = {
  ready: Promise<void>
  crypto_box_seed_keypair: (seed: Uint8Array) => { publicKey: Uint8Array; privateKey: Uint8Array }
  crypto_box_seal: (msg: Uint8Array, pk: Uint8Array) => Uint8Array
  crypto_box_seal_open: (ct: Uint8Array, pk: Uint8Array, sk: Uint8Array) => Uint8Array
  crypto_generichash: (out: number, input: Uint8Array, key: Uint8Array | null) => Uint8Array
}

// ================================================================
// Config
// ================================================================

const CHAIN_ID = process.env.ORI_CHAIN_ID ?? 'initiation-2'
const REST_URL = process.env.ORI_REST_URL ?? 'https://rest.testnet.initia.xyz'
const MODULE = (process.env.ORI_MODULE_ADDRESS ?? '0x1fe25fb6118e219739d8d37c964447d1ef0bebbc').toLowerCase()
const DENOM = process.env.ORI_DENOM ?? 'uinit'
const API = process.env.ORI_API_URL ?? 'http://localhost:3001'
const DEPLOYER_MNEMONIC = process.env.ORI_DEPLOYER_MNEMONIC!
if (!DEPLOYER_MNEMONIC) throw new Error('ORI_DEPLOYER_MNEMONIC required in env')

// Store in apps/api cwd — guaranteed path, no Windows URL-encoding gotchas.
const WALLETS_FILE = path.resolve(process.cwd(), '.ori-e2e-wallets.json')
const FUND_PER_WALLET = 3_000_000n // 3 INIT each
const EIP191_MSG = 'Sign in to Ori' // must match server's challenge string shape
const KEY_DERIVATION_MSG = 'ori.keystore.v2' // for X25519 keypair derivation

const rest = new RESTClient(REST_URL, { chainId: CHAIN_ID, gasPrices: `0.015${DENOM}`, gasAdjustment: '1.6' })
const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean)

// ================================================================
// Types + helpers
// ================================================================

type Actor = {
  name: string
  mnemonic: string
  key: MnemonicKey
  wallet: Wallet
  bech32: string
  hex: string
  /** Cached EIP-191 signature over the auth challenge. */
  session?: string
  /** Deterministic X25519 keypair derived from an EIP-191 signature. */
  x25519?: { publicKey: Uint8Array; privateKey: Uint8Array }
  ethers: ethers.HDNodeWallet
}

const PASS = '\x1b[32mPASS\x1b[0m'
const FAIL = '\x1b[31mFAIL\x1b[0m'
const SKIP = '\x1b[33mSKIP\x1b[0m'

type Result = { name: string; status: 'pass' | 'fail' | 'skip'; detail?: string; ms?: number }
const results: Result[] = []

async function step(name: string, fn: () => Promise<void>): Promise<void> {
  if (ONLY.length > 0 && !ONLY.some((o) => name.toLowerCase().includes(o))) {
    results.push({ name, status: 'skip' })
    console.log(`${SKIP}  ${name}`)
    return
  }
  const t0 = Date.now()
  try {
    await fn()
    const ms = Date.now() - t0
    results.push({ name, status: 'pass', ms })
    console.log(`${PASS}  ${name}  \x1b[90m${ms}ms\x1b[0m`)
  } catch (err) {
    const ms = Date.now() - t0
    const detail = err instanceof Error ? err.message : String(err)
    results.push({ name, status: 'fail', detail, ms })
    console.log(`${FAIL}  ${name}  \x1b[90m${ms}ms\x1b[0m\n        \x1b[31m${detail}\x1b[0m`)
  }
}

function bech32ToHexAddr(addr: string): string {
  const d = bech32.decode(addr)
  return '0x' + Buffer.from(bech32.fromWords(d.words)).toString('hex').toLowerCase()
}

/**
 * Canonicalize any address form (short hex, padded hex, bech32) to the
 * zero-padded 20-byte hex form so we can compare view-fn outputs against
 * `actor.hex` values.
 */
function canonHex(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('init1')) return bech32ToHexAddr(raw)
  let clean = raw.startsWith('0x') ? raw.slice(2) : raw
  clean = clean.replace(/^0+/, '') || '0'
  if (clean.length % 2 === 1) clean = '0' + clean
  if (clean.length > 40) clean = clean.slice(-40)
  return '0x' + clean.padStart(40, '0').toLowerCase()
}

async function api<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json')
  if (init?.token) headers.set('Authorization', `Bearer ${init.token}`)
  const res = await fetch(`${API}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} — ${text.slice(0, 200)}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

async function waitFor<T>(
  fn: () => Promise<T>,
  check: (v: T) => boolean,
  timeoutMs = 45_000,
  tag = '',
): Promise<T> {
  const start = Date.now()
  let lastErr: unknown
  while (Date.now() - start < timeoutMs) {
    try {
      const v = await fn()
      if (check(v)) return v
    } catch (e) {
      lastErr = e
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  const msg = lastErr instanceof Error ? lastErr.message : ''
  throw new Error(`waitFor timeout${tag ? ' (' + tag + ')' : ''}: ${msg}`)
}

function assertEq<T>(actual: T, expected: T, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`assertEq ${label}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`)
  }
}

function assertTrue(cond: boolean, label: string): void {
  if (!cond) throw new Error(`assertTrue ${label} failed`)
}

// ================================================================
// Wallet setup
// ================================================================

type StoredWallets = Record<'alice' | 'bob' | 'carol', string>

function loadOrGenerateMnemonics(): StoredWallets {
  if (fs.existsSync(WALLETS_FILE)) {
    return JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf8')) as StoredWallets
  }
  const generated: StoredWallets = {
    alice: ethers.Wallet.createRandom().mnemonic!.phrase,
    bob: ethers.Wallet.createRandom().mnemonic!.phrase,
    carol: ethers.Wallet.createRandom().mnemonic!.phrase,
  }
  fs.mkdirSync(path.dirname(WALLETS_FILE), { recursive: true })
  fs.writeFileSync(WALLETS_FILE, JSON.stringify(generated, null, 2))
  console.log(`  Generated + saved fresh mnemonics to ${WALLETS_FILE}`)
  return generated
}

async function makeActor(name: string, mnemonic: string): Promise<Actor> {
  // Initia uses Ethereum-style HD path (coin 60) because it's an ethsecp256k1 chain.
  const key = new MnemonicKey({ mnemonic, coinType: 60 })
  const wallet = new Wallet(rest, key)
  const bech32 = key.accAddress
  const hex = bech32ToHexAddr(bech32)
  const ethWallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0/0")
  return { name, mnemonic, key, wallet, bech32, hex, ethers: ethWallet }
}

async function deriveX25519(actor: Actor): Promise<void> {
  if (actor.x25519) return
  // Sign a deterministic message with EIP-191 (personal_sign). Pipe through
  // BLAKE2b-256 → crypto_box_seed_keypair. Identical to keystore.ts so
  // the browser + this harness produce the same X25519 pubkey.
  const sigHex = await actor.ethers.signMessage(KEY_DERIVATION_MSG)
  const sig = Buffer.from(sigHex.replace(/^0x/, ''), 'hex')
  const seed = sodium.crypto_generichash(32, sig, null)
  const kp = sodium.crypto_box_seed_keypair(seed)
  actor.x25519 = { publicKey: kp.publicKey, privateKey: kp.privateKey }
}

async function broadcast(actor: Actor, msgs: MsgExecute[] | [MsgSend] | MsgExecute[], memo = ''): Promise<string> {
  // Public RPC occasionally throws HTTP 500 on create/sign (simulate) or
  // broadcast — typically sequence races or transient gateway errors.
  // Retry a handful of times with backoff before giving up.
  const attempts = 5
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const tx = await actor.wallet.createAndSignTx({ msgs: msgs as never, memo })
      const res = await rest.tx.broadcast(tx)
      if (res.code !== 0) {
        throw new Error(`tx ${res.txhash} failed code=${res.code}: ${res.raw_log?.slice(0, 300) ?? ''}`)
      }
      return res.txhash
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      // Pull the REST node's error body (axios stashes it on err.response).
      const ax = err as { response?: { status?: number; data?: unknown } }
      const body = ax.response?.data
        ? JSON.stringify(ax.response.data).slice(0, 300)
        : ''
      if (body) lastErr = new Error(`${msg} | body=${body}`)
      const retryable =
        /status code 5\d\d|ETIMEDOUT|ECONNRESET|socket hang up|sequence|account sequence/i.test(msg) &&
        // don't retry Move aborts reported as 500 by the node
        !/abort|VM error|execution failed|code=\d/i.test(body)
      if (!retryable) throw lastErr
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

function mx(sender: string, moduleName: string, fn: string, args: string[]): MsgExecute {
  return new MsgExecute(sender, MODULE, moduleName, fn, [], args)
}

// ================================================================
// Auth helper
// ================================================================

async function authSession(actor: Actor): Promise<string> {
  if (actor.session) return actor.session
  // 1. request challenge
  const ch = await api<{ nonce: string; challenge: string; expiresAt: string }>(
    '/v1/auth/challenge',
    { method: 'POST', body: JSON.stringify({ initiaAddress: actor.bech32 }) },
  )
  // 2. sign via EIP-191
  const signature = await actor.ethers.signMessage(ch.challenge)
  // 3. verify
  const verified = await api<{ token: string; user: unknown }>('/v1/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      initiaAddress: actor.bech32,
      hexAddress: actor.hex,
      nonce: ch.nonce,
      signature,
    }),
  })
  actor.session = verified.token
  return verified.token
}

// ================================================================
// Setup
// ================================================================

let D: Actor, A: Actor, B: Actor, C: Actor
const encoderLivesTracker = new Map<string, boolean>() // per-actor encryption pubkey set

async function setup(): Promise<void> {
  await sodium.ready
  const stored = loadOrGenerateMnemonics()
  D = await makeActor('Deployer', DEPLOYER_MNEMONIC)
  A = await makeActor('Alice', stored.alice)
  B = await makeActor('Bob', stored.bob)
  C = await makeActor('Carol', stored.carol)

  console.log('\n=== Actors ===')
  for (const a of [D, A, B, C]) {
    console.log(`  ${a.name.padEnd(8)} ${a.bech32}`)
  }

  // Derive X25519 keypairs
  for (const a of [D, A, B, C]) await deriveX25519(a)
}

async function balance(addr: string): Promise<bigint> {
  const res = await fetch(`${REST_URL}/cosmos/bank/v1beta1/balances/${addr}/by_denom?denom=${DENOM}`)
  if (!res.ok) return 0n
  const body = (await res.json()) as { balance?: { amount?: string } }
  return BigInt(body.balance?.amount ?? '0')
}

async function fundWallets(): Promise<void> {
  const targets = [A, B, C]
  const needs: Array<{ a: Actor; missing: bigint }> = []
  for (const t of targets) {
    const have = await balance(t.bech32)
    if (have < FUND_PER_WALLET) {
      needs.push({ a: t, missing: FUND_PER_WALLET - have })
    }
  }
  if (needs.length === 0) {
    console.log('  all sub-wallets already funded')
    return
  }
  // Batch send via one tx from deployer.
  const msgs = needs.map(
    (n) => new MsgSend(D.bech32, n.a.bech32, { [DENOM]: n.missing.toString() }),
  )
  const tx = await D.wallet.createAndSignTx({ msgs, memo: 'ori-e2e-fund' })
  const res = await rest.tx.broadcast(tx)
  if (res.code !== 0) throw new Error(`funding failed: ${res.raw_log}`)
  console.log(`  funded ${needs.length} wallet(s) tx=${res.txhash}`)
  await new Promise((r) => setTimeout(r, 3000))
}

// ================================================================
// Chain read helpers
// ================================================================

async function view<T = unknown>(
  moduleName: string,
  fn: string,
  args: string[] = [],
): Promise<T> {
  const res = await rest.move.view(MODULE, moduleName, fn, [], args)
  const raw = (res as { data?: unknown }).data
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as T
    }
  }
  return raw as T
}

// ================================================================
// Tests
// ================================================================

async function runTests(): Promise<void> {
  // ---------- Infrastructure ----------
  await step('infra.api-health', async () => {
    const h = await api<{ status: string }>('/health')
    if (!h || typeof h !== 'object') throw new Error('no health payload')
  })

  await step('infra.rpc-latest-block', async () => {
    const r = await fetch(`${REST_URL}/cosmos/base/tendermint/v1beta1/blocks/latest`)
    if (!r.ok) throw new Error(`RPC status ${r.status}`)
  })

  // ---------- Chain read: all 16 resources ----------
  for (const [mod, fn, expectTruthy] of [
    ['profile_registry', 'total_profiles', false],
    ['tip_jar', 'total_volume', false],
    ['tip_jar', 'total_tips_count', false],
    ['follow_graph', 'total_edges', false],
    ['payment_stream', 'vault_address', true],
    ['gift_packet', 'vault_address', true],
    ['gift_group', 'vault_address', true],
    ['wager_escrow', 'vault_address', true],
    ['subscription_vault', 'vault_address', true],
    ['subscription_vault', 'total_subscribers', false],
    ['lucky_pool', 'vault_address', true],
    ['paywall', 'total_sales', false],
    ['gift_box_catalog', 'total_boxes', false],
    ['merchant_registry', 'total_merchants', false],
    ['achievement_sbt', 'total_awarded', false],
    ['squads', 'total_squads', false],
  ] as const) {
    await step(`view.${mod}.${fn}`, async () => {
      const v = await view<unknown>(mod, fn)
      if (expectTruthy && !v) throw new Error('expected truthy')
    })
  }

  // ---------- Fund sub-wallets ----------
  await step('setup.fund-wallets', async () => {
    await fundWallets()
    for (const a of [A, B, C]) {
      const bal = await balance(a.bech32)
      if (bal < FUND_PER_WALLET / 2n) {
        throw new Error(`${a.name} underfunded: ${bal}`)
      }
    }
  })

  // ---------- Auth (EIP-191) ----------
  for (const a of [D, A, B, C]) {
    await step(`auth.${a.name.toLowerCase()}`, async () => {
      const token = await authSession(a)
      if (!token) throw new Error('no token')
      const me = await api<{ user: { initiaAddress: string } }>('/v1/auth/me', { token })
      assertEq(me.user.initiaAddress, a.bech32, 'me.initiaAddress')
    })
  }

  // ---------- Profile: create + all updaters for all 4 ----------
  for (const a of [D, A, B, C]) {
    await step(`profile.create.${a.name.toLowerCase()}`, async () => {
      const exists = await view<boolean>('profile_registry', 'profile_exists', [
        bcs.address().serialize(a.bech32).toBase64(),
      ])
      if (exists === true) return
      const bio = `I am ${a.name}`
      const avatar = `https://avatar/${a.name.toLowerCase()}.png`
      const links = [`https://x.com/${a.name.toLowerCase()}`]
      const labels = ['X']
      const msg = mx(a.bech32, 'profile_registry', 'create_profile', [
        bcs.string().serialize(bio).toBase64(),
        bcs.string().serialize(avatar).toBase64(),
        bcs.vector(bcs.string()).serialize(links).toBase64(),
        bcs.vector(bcs.string()).serialize(labels).toBase64(),
      ])
      await broadcast(a, [msg])
      const now = await view<boolean>('profile_registry', 'profile_exists', [
        bcs.address().serialize(a.bech32).toBase64(),
      ])
      assertTrue(now === true, 'profile_exists after create')
    })
  }

  await step('profile.update-bio.alice', async () => {
    await broadcast(A, [
      mx(A.bech32, 'profile_registry', 'update_bio', [
        bcs.string().serialize('Creator on Ori').toBase64(),
      ]),
    ])
  })

  await step('profile.update-privacy.alice', async () => {
    await broadcast(A, [
      mx(A.bech32, 'profile_registry', 'update_privacy', [
        bcs.bool().serialize(false).toBase64(),
        bcs.bool().serialize(false).toBase64(),
        bcs.bool().serialize(false).toBase64(),
      ]),
    ])
  })

  await step('profile.set-slug.alice', async () => {
    const slug = 'alice' + Math.random().toString(36).slice(2, 6)
    await broadcast(A, [
      mx(A.bech32, 'profile_registry', 'set_slug', [
        bcs.string().serialize(slug).toBase64(),
      ]),
    ])
    const got = await view<string>('profile_registry', 'get_slug', [
      bcs.address().serialize(A.bech32).toBase64(),
    ])
    assertEq(got, slug, 'get_slug')
  })

  await step('profile.update-theme.alice', async () => {
    await broadcast(A, [
      mx(A.bech32, 'profile_registry', 'update_theme', [
        bcs.string().serialize('{"accent":"#ec4899"}').toBase64(),
      ]),
    ])
  })

  // ---------- Encryption pubkeys ----------
  for (const a of [D, A, B, C]) {
    await step(`profile.set-encryption-pubkey.${a.name.toLowerCase()}`, async () => {
      const pk = a.x25519!.publicKey
      const already = await view<number[]>('profile_registry', 'get_encryption_pubkey', [
        bcs.address().serialize(a.bech32).toBase64(),
      ])
      if (Array.isArray(already) && already.length === 32) return // idempotent
      await broadcast(a, [
        mx(a.bech32, 'profile_registry', 'set_encryption_pubkey', [
          bcs.vector(bcs.u8()).serialize(Array.from(pk)).toBase64(),
        ]),
      ])
      encoderLivesTracker.set(a.bech32, true)
    })
  }

  // ---------- API read of profile cache ----------
  await step('api.profile.get.alice', async () => {
    const p = await waitFor(
      () => api<{ address: string; bio: string }>(`/v1/profiles/${A.bech32}`),
      (v) => typeof v.bio === 'string',
      30_000,
      'alice profile cache',
    )
    if (!p.bio.length) throw new Error('bio empty after update')
  })

  // ---------- Payment router: direct send + batch send ----------
  await step('payment.send.deployer-to-alice', async () => {
    const msg = mx(D.bech32, 'payment_router', 'send', [
      bcs.address().serialize(A.bech32).toBase64(),
      bcs.string().serialize(DENOM).toBase64(),
      bcs.u64().serialize('1234').toBase64(),
      bcs.string().serialize('test payment').toBase64(),
      bcs.string().serialize('chat-e2e-1').toBase64(),
    ])
    await broadcast(D, [msg])
  })

  await step('payment.batch_send.deployer-to-all', async () => {
    const recips = [A.bech32, B.bech32, C.bech32]
    const amounts = ['500', '500', '500']
    const memos = ['a', 'b', 'c']
    const msg = mx(D.bech32, 'payment_router', 'batch_send', [
      bcs.vector(bcs.address()).serialize(recips).toBase64(),
      bcs.vector(bcs.u64()).serialize(amounts).toBase64(),
      bcs.vector(bcs.string()).serialize(memos).toBase64(),
      bcs.string().serialize(DENOM).toBase64(),
      bcs.string().serialize('batch-e2e').toBase64(),
    ])
    await broadcast(D, [msg])
  })

  await step('api.activity.alice-shows-payment', async () => {
    await waitFor(
      () => api<{ entries: Array<{ kind: string; amount: string }> }>(`/v1/profiles/${A.bech32}/activity`),
      (v) => v.entries.some((e) => e.kind === 'payment' && e.amount === '1234'),
      60_000,
      'activity indexed',
    )
  })

  // ---------- Tip jar: multiple tippers to Alice ----------
  await step('tip.bob-tips-alice', async () => {
    await broadcast(B, [
      mx(B.bech32, 'tip_jar', 'tip', [
        bcs.address().serialize(A.bech32).toBase64(),
        bcs.string().serialize(DENOM).toBase64(),
        bcs.u64().serialize('100000').toBase64(),
        bcs.string().serialize('gg').toBase64(),
      ]),
    ])
  })

  await step('tip.carol-tips-alice', async () => {
    await broadcast(C, [
      mx(C.bech32, 'tip_jar', 'tip', [
        bcs.address().serialize(A.bech32).toBase64(),
        bcs.string().serialize(DENOM).toBase64(),
        bcs.u64().serialize('50000').toBase64(),
        bcs.string().serialize('nice').toBase64(),
      ]),
    ])
  })

  await step('tip.deployer-tips-alice', async () => {
    // Deployer spends heavily on funding + gifts + wagers + streams etc.
    // Skip (not fail) if balance is too low to safely tip.
    const bal = await balance(D.bech32)
    if (bal < 300_000n) {
      console.log(`        \x1b[33m(deployer bal ${bal} uinit — skipping tip)\x1b[0m`)
      return
    }
    await broadcast(D, [
      mx(D.bech32, 'tip_jar', 'tip', [
        bcs.address().serialize(A.bech32).toBase64(),
        bcs.string().serialize(DENOM).toBase64(),
        bcs.u64().serialize('200000').toBase64(),
        bcs.string().serialize('sponsor').toBase64(),
      ]),
    ])
  })

  await step('api.leaderboard.top-creators-has-alice', async () => {
    await waitFor(
      () => api<{ entries: Array<{ address: string; tipsReceivedVolume: string }> }>(
        '/v1/leaderboards/top-creators?limit=10',
      ),
      (v) => v.entries.some((e) => e.address === A.bech32),
      45_000,
      'alice on leaderboard',
    )
  })

  await step('api.top-tippers-for-alice', async () => {
    const res = await waitFor(
      () => api<{ entries: Array<{ address: string }> }>(`/v1/profiles/${A.bech32}/top-tippers?limit=10`),
      (v) => v.entries.some((e) => e.address === B.bech32) && v.entries.some((e) => e.address === C.bech32),
      60_000,
      'bob + carol in top tippers',
    )
    assertTrue(
      res.entries.some((e) => e.address === B.bech32) && res.entries.some((e) => e.address === C.bech32),
      'top tippers include Bob, Carol',
    )
  })

  await step('view.tip_jar.recent_tips-alice', async () => {
    const list = await view<unknown>('tip_jar', 'get_recent_tips', [
      bcs.address().serialize(A.bech32).toBase64(),
      bcs.u64().serialize('0').toBase64(),
      bcs.u64().serialize('10').toBase64(),
    ])
    assertTrue(Array.isArray(list) && (list as unknown[]).length >= 3, 'recent tips count >= 3')
  })

  // ---------- Follow graph ----------
  async function ensureFollows(from: Actor, target: Actor): Promise<void> {
    const already = await view<boolean>('follow_graph', 'is_following', [
      bcs.address().serialize(from.bech32).toBase64(),
      bcs.address().serialize(target.bech32).toBase64(),
    ])
    if (already === true) {
      // Already following on-chain from a prior run. Backend may have been
      // truncated and missed the original event. Unfollow + refollow so the
      // event listener indexes a fresh Followed row for this run.
      await broadcast(from, [
        mx(from.bech32, 'follow_graph', 'unfollow', [bcs.address().serialize(target.bech32).toBase64()]),
      ])
    }
    await broadcast(from, [
      mx(from.bech32, 'follow_graph', 'follow', [bcs.address().serialize(target.bech32).toBase64()]),
    ])
  }

  await step('follow.alice-follows-bob', () => ensureFollows(A, B))
  await step('follow.bob-follows-alice', () => ensureFollows(B, A))
  await step('follow.carol-follows-alice', () => ensureFollows(C, A))

  await step('api.follow-stats.alice', async () => {
    const st = await waitFor(
      () => api<{ followers: number; following: number }>(`/v1/profiles/${A.bech32}/follow-stats`),
      (v) => v.followers >= 2,
      45_000,
      'alice follower count',
    )
    assertTrue(st.followers >= 2, 'alice followers >= 2')
  })

  await step('api.followers-list.alice', async () => {
    const res = await api<{ entries: Array<{ address: string }> }>(
      `/v1/profiles/${A.bech32}/followers?limit=50`,
    )
    assertTrue(
      res.entries.some((e) => e.address === B.bech32) &&
        res.entries.some((e) => e.address === C.bech32),
      'alice followers include Bob and Carol',
    )
  })

  await step('api.follows.check.mutual', async () => {
    const r1 = await api<{ following: boolean }>(
      `/v1/follows/check?from=${A.bech32}&to=${B.bech32}`,
    )
    assertEq(r1.following, true, 'alice follows bob')
  })

  await step('follow.unfollow.alice-unfollows-bob', async () => {
    await broadcast(A, [
      mx(A.bech32, 'follow_graph', 'unfollow', [bcs.address().serialize(B.bech32).toBase64()]),
    ])
    await waitFor(
      () => api<{ following: boolean }>(`/v1/follows/check?from=${A.bech32}&to=${B.bech32}`),
      (v) => v.following === false,
      30_000,
      'unfollow indexed',
    )
  })

  // ---------- Gift packet: directed + link ----------
  await step('gift.directed.deployer-to-alice', async () => {
    const msg = mx(D.bech32, 'gift_packet', 'create_directed_gift', [
      bcs.address().serialize(A.bech32).toBase64(),
      bcs.string().serialize(DENOM).toBase64(),
      bcs.u64().serialize('5000').toBase64(),
      bcs.u8().serialize(1).toBase64(),
      bcs.string().serialize('happy bday').toBase64(),
      bcs.u64().serialize('0').toBase64(),
    ])
    await broadcast(D, [msg])
  })

  let directedGiftId = 0
  await step('gift.directed.alice-claims', async () => {
    // Find the latest directed gift ID for Alice. Simpler: scan IDs 1..20.
    let found = 0
    for (let id = 1; id <= 30; id++) {
      try {
        const summary = await view<unknown[]>('gift_packet', 'get_gift_summary', [
          bcs.u64().serialize(id.toString()).toBase64(),
        ])
        // summary = (sender, recipient, amount, denom, theme, mode, claimed, reclaimed, expires_at)
        if (
          Array.isArray(summary) &&
          canonHex(summary[1] as string) === A.hex &&
          summary[6] === false &&
          summary[7] === false &&
          Number(summary[5]) === 0 /* MODE_DIRECT */ &&
          Number(summary[2]) === 5000 /* freshly created */
        ) {
          found = id
          break
        }
      } catch {
        /* gift doesn't exist at this id */
      }
    }
    if (!found) throw new Error('no claimable directed gift found')
    directedGiftId = found
    await broadcast(A, [
      mx(A.bech32, 'gift_packet', 'claim_directed_gift', [
        bcs.u64().serialize(found.toString()).toBase64(),
      ]),
    ])
  })

  let linkSecret: Uint8Array
  await step('gift.link.deployer-creates', async () => {
    linkSecret = crypto.randomBytes(32)
    const hash = crypto.createHash('sha256').update(Buffer.from(linkSecret)).digest()
    await broadcast(D, [
      mx(D.bech32, 'gift_packet', 'create_link_gift', [
        bcs.string().serialize(DENOM).toBase64(),
        bcs.u64().serialize('3000').toBase64(),
        bcs.u8().serialize(2).toBase64(),
        bcs.string().serialize('for whoever').toBase64(),
        bcs.vector(bcs.u8()).serialize(Array.from(hash)).toBase64(),
        bcs.u64().serialize('0').toBase64(),
      ]),
    ])
  })

  await step('gift.link.bob-claims', async () => {
    // Find matching LINK-mode gift
    let found = 0
    for (let id = 1; id <= 40; id++) {
      try {
        const summary = await view<unknown[]>('gift_packet', 'get_gift_summary', [
          bcs.u64().serialize(id.toString()).toBase64(),
        ])
        if (
          Array.isArray(summary) &&
          summary[6] === false &&
          summary[7] === false &&
          Number(summary[5]) === 1 /* MODE_LINK */
        ) {
          found = id
          break
        }
      } catch {
        /* not present */
      }
    }
    if (!found) throw new Error('no claimable link gift found')
    await broadcast(B, [
      mx(B.bech32, 'gift_packet', 'claim_link_gift', [
        bcs.u64().serialize(found.toString()).toBase64(),
        bcs.vector(bcs.u8()).serialize(Array.from(linkSecret)).toBase64(),
      ]),
    ])
  })

  // ---------- Gift group (multi-slot) ----------
  let groupGiftId = 0
  await step('gift.group.deployer-creates-3-slots', async () => {
    const base = crypto.randomBytes(32)
    // hash(secret || slot_index_u64_le) for each slot
    const hashes = [0n, 1n, 2n].map((idx) => {
      const buf = Buffer.alloc(40)
      base.copy(buf, 0)
      buf.writeBigUInt64LE(idx, 32)
      return crypto.createHash('sha256').update(buf).digest()
    })
    ;(globalThis as unknown as { __groupSecret: Uint8Array }).__groupSecret = base
    await broadcast(D, [
      mx(D.bech32, 'gift_group', 'create_group_gift', [
        bcs.string().serialize(DENOM).toBase64(),
        bcs.u64().serialize('3000').toBase64(),
        bcs.u64().serialize('3').toBase64(),
        bcs.u8().serialize(0).toBase64(),
        bcs.string().serialize('3-way').toBase64(),
        bcs.vector(bcs.vector(bcs.u8())).serialize(hashes.map((h) => Array.from(h))).toBase64(),
        bcs.u64().serialize('0').toBase64(),
      ]),
    ])
    // Find the latest group gift by scanning down — id increments per create,
    // so previous runs accumulate earlier IDs. Take the highest unclaimed one
    // where sender == deployer and slots_claimed == 0.
    for (let id = 30; id >= 1; id--) {
      try {
        const s = await view<unknown[]>('gift_group', 'get_group_summary', [
          bcs.u64().serialize(id.toString()).toBase64(),
        ])
        if (Array.isArray(s) && canonHex(s[0] as string) === D.hex && Number(s[4]) === 0) {
          groupGiftId = id
          break
        }
      } catch {
        /* not present at this id */
      }
    }
    if (!groupGiftId) throw new Error('group gift not found')
  })

  await step('gift.group.3-wallets-claim-slots', async () => {
    const base = (globalThis as unknown as { __groupSecret: Uint8Array }).__groupSecret
    const claims: Array<[Actor, bigint]> = [
      [A, 0n],
      [B, 1n],
      [C, 2n],
    ]
    for (const [actor, idx] of claims) {
      await broadcast(actor, [
        mx(actor.bech32, 'gift_group', 'claim_group_slot', [
          bcs.u64().serialize(groupGiftId.toString()).toBase64(),
          bcs.u64().serialize(idx.toString()).toBase64(),
          bcs.vector(bcs.u8()).serialize(Array.from(base)).toBase64(),
        ]),
      ])
    }
    const summary = await view<unknown[]>('gift_group', 'get_group_summary', [
      bcs.u64().serialize(groupGiftId.toString()).toBase64(),
    ])
    // index 4 is slots_claimed
    assertTrue(Number((summary as unknown[])[4]) === 3, 'all 3 slots claimed')
  })

  // ---------- Wager: arbiter mode ----------
  await step('wager.arbiter.alice-proposes-vs-bob', async () => {
    await broadcast(A, [
      mx(A.bech32, 'wager_escrow', 'propose_wager', [
        bcs.address().serialize(B.bech32).toBase64(),
        bcs.address().serialize(C.bech32).toBase64(),
        bcs.string().serialize(DENOM).toBase64(),
        bcs.u64().serialize('1000').toBase64(),
        bcs.string().serialize('alice wins the race').toBase64(),
      ]),
    ])
  })

  // Wager IDs persist across runs. Scan for the latest active one between A and B.
  async function findWagerId(mode: number, proposer: string, accepter: string): Promise<number> {
    for (let id = 40; id >= 1; id--) {
      try {
        const w = await view<Record<string, unknown>>('wager_escrow', 'get_wager', [
          bcs.u64().serialize(id.toString()).toBase64(),
        ])
        if (!w) continue
        if (
          canonHex(w.proposer as string) === canonHex(proposer) &&
          canonHex(w.accepter as string) === canonHex(accepter) &&
          Number(w.mode ?? 0) === mode
        ) {
          return id
        }
      } catch {
        /* not found */
      }
    }
    return 0
  }

  let arbiterWagerId = 0
  await step('wager.arbiter.bob-accepts', async () => {
    const wid = await findWagerId(0, A.hex, B.hex)
    if (!wid) throw new Error('wager not found')
    arbiterWagerId = wid
    await broadcast(B, [
      mx(B.bech32, 'wager_escrow', 'accept_wager', [
        bcs.u64().serialize(wid.toString()).toBase64(),
      ]),
    ])
  })

  await step('wager.arbiter.carol-resolves-alice-wins', async () => {
    await broadcast(C, [
      mx(C.bech32, 'wager_escrow', 'resolve_wager', [
        bcs.u64().serialize(arbiterWagerId.toString()).toBase64(),
        bcs.address().serialize(A.bech32).toBase64(),
      ]),
    ])
  })

  // ---------- Wager: PvP mode ----------
  await step('wager.pvp.alice-proposes-vs-bob', async () => {
    await broadcast(A, [
      mx(A.bech32, 'wager_escrow', 'propose_pvp_wager', [
        bcs.address().serialize(B.bech32).toBase64(),
        bcs.string().serialize(DENOM).toBase64(),
        bcs.u64().serialize('500').toBase64(),
        bcs.string().serialize('chess match').toBase64(),
        bcs.string().serialize('games').toBase64(),
        bcs.u64().serialize('600').toBase64(),
      ]),
    ])
  })

  let pvpWagerId = 0
  await step('wager.pvp.bob-accepts', async () => {
    const wid = await findWagerId(1, A.hex, B.hex)
    if (!wid) throw new Error('pvp wager not found')
    pvpWagerId = wid
    await broadcast(B, [
      mx(B.bech32, 'wager_escrow', 'accept_wager', [
        bcs.u64().serialize(wid.toString()).toBase64(),
      ]),
    ])
  })

  await step('wager.pvp.bob-concedes', async () => {
    await broadcast(B, [
      mx(B.bech32, 'wager_escrow', 'concede', [
        bcs.u64().serialize(pvpWagerId.toString()).toBase64(),
      ]),
    ])
  })

  // ---------- Achievement SBT ----------
  await step('sbt.award-milestone.alice-first-tip', async () => {
    const hasAlready = await view<boolean>('achievement_sbt', 'has_badge', [
      bcs.address().serialize(A.bech32).toBase64(),
      bcs.u8().serialize(2).toBase64(),
      bcs.u8().serialize(0).toBase64(),
    ])
    if (hasAlready === true) return
    await broadcast(D, [
      mx(D.bech32, 'achievement_sbt', 'award_milestone', [
        bcs.address().serialize(A.bech32).toBase64(),
        bcs.u8().serialize(2).toBase64(),
      ]),
    ])
    const has = await view<boolean>('achievement_sbt', 'has_badge', [
      bcs.address().serialize(A.bech32).toBase64(),
      bcs.u8().serialize(2).toBase64(),
      bcs.u8().serialize(0).toBase64(),
    ])
    assertTrue(has === true, 'has_badge FIRST_TIP')
  })

  await step('sbt.award-tier.alice-payments-bronze', async () => {
    const hasAlready = await view<boolean>('achievement_sbt', 'has_badge', [
      bcs.address().serialize(A.bech32).toBase64(),
      bcs.u8().serialize(20).toBase64(),
      bcs.u8().serialize(1).toBase64(),
    ])
    if (hasAlready === true) return
    await broadcast(D, [
      mx(D.bech32, 'achievement_sbt', 'award_badge', [
        bcs.address().serialize(A.bech32).toBase64(),
        bcs.u8().serialize(20).toBase64(),
        bcs.u8().serialize(1).toBase64(),
        bcs.string().serialize('ipfs://bronze.json').toBase64(),
      ]),
    ])
    const lvl = await view<number>('achievement_sbt', 'max_level_for', [
      bcs.address().serialize(A.bech32).toBase64(),
      bcs.u8().serialize(20).toBase64(),
    ])
    assertTrue(Number(lvl) >= 1, 'max_level_for >= 1')
  })

  await step('api.badges.alice', async () => {
    const r = await waitFor(
      () => api<{ badges: Array<{ badgeType: number }> }>(`/v1/profiles/${A.bech32}/badges`),
      (v) => v.badges.length >= 2,
      30_000,
      'alice badges',
    )
    assertTrue(r.badges.length >= 2, 'alice has >= 2 badges')
  })

  // ---------- Subscription vault ----------
  await step('sub.alice-registers-plan', async () => {
    await broadcast(A, [
      mx(A.bech32, 'subscription_vault', 'register_plan', [
        bcs.u64().serialize('10000').toBase64(),
        bcs.u64().serialize('3600').toBase64(), // 1 hour period (MIN_PERIOD_SECONDS)
        bcs.string().serialize(DENOM).toBase64(),
      ]),
    ])
    const exists = await view<boolean>('subscription_vault', 'plan_exists', [
      bcs.address().serialize(A.bech32).toBase64(),
    ])
    assertTrue(exists === true, 'plan_exists')
  })

  await step('sub.bob-subscribes-3-periods', async () => {
    await broadcast(B, [
      mx(B.bech32, 'subscription_vault', 'subscribe', [
        bcs.address().serialize(A.bech32).toBase64(),
        bcs.u64().serialize('3').toBase64(),
      ]),
    ])
    const exists = await view<boolean>('subscription_vault', 'subscription_exists', [
      bcs.address().serialize(B.bech32).toBase64(),
      bcs.address().serialize(A.bech32).toBase64(),
    ])
    assertTrue(exists === true, 'subscription_exists')
  })

  await step('sub.bob-cancels', async () => {
    await broadcast(B, [
      mx(B.bech32, 'subscription_vault', 'cancel_subscription', [
        bcs.address().serialize(A.bech32).toBase64(),
      ]),
    ])
    const exists = await view<boolean>('subscription_vault', 'subscription_exists', [
      bcs.address().serialize(B.bech32).toBase64(),
      bcs.address().serialize(A.bech32).toBase64(),
    ])
    assertTrue(exists === false, 'subscription removed')
  })

  // ---------- Payment stream ----------
  let streamId = 0
  await step('stream.alice-opens-to-bob', async () => {
    await broadcast(A, [
      mx(A.bech32, 'payment_stream', 'open_stream', [
        bcs.address().serialize(B.bech32).toBase64(),
        bcs.u64().serialize('10').toBase64(),
        bcs.u64().serialize('60').toBase64(),
        bcs.string().serialize(DENOM).toBase64(),
      ]),
    ])
    // Scan high→low for latest open alice→bob stream.
    for (let id = 50; id >= 1; id--) {
      try {
        const s = await view<unknown[]>('payment_stream', 'get_stream', [
          bcs.u64().serialize(id.toString()).toBase64(),
        ])
        if (Array.isArray(s) && canonHex(s[0] as string) === A.hex && canonHex(s[1] as string) === B.hex && s[8] === false) {
          streamId = id
          break
        }
      } catch {
        /* noop */
      }
    }
    if (!streamId) throw new Error('stream not found')
  })

  await step('stream.wait-then-bob-withdraws', async () => {
    // Wait 12s so at least 100 uinit have accrued (rate 10 uinit/sec)
    await new Promise((r) => setTimeout(r, 12_000))
    await broadcast(B, [
      mx(B.bech32, 'payment_stream', 'withdraw_accrued', [
        bcs.u64().serialize(streamId.toString()).toBase64(),
      ]),
    ])
  })

  await step('stream.alice-closes', async () => {
    await broadcast(A, [
      mx(A.bech32, 'payment_stream', 'close_stream', [
        bcs.u64().serialize(streamId.toString()).toBase64(),
      ]),
    ])
  })

  // ---------- Paywall ----------
  let paywallId = 0
  await step('paywall.alice-creates', async () => {
    await broadcast(A, [
      mx(A.bech32, 'paywall', 'create_paywall', [
        bcs.string().serialize('My guide').toBase64(),
        bcs.string().serialize('ipfs://guide.md').toBase64(),
        bcs.u64().serialize('5000').toBase64(),
        bcs.string().serialize(DENOM).toBase64(),
      ]),
    ])
    // Scan high→low for latest active paywall owned by Alice.
    for (let id = 50; id >= 1; id--) {
      try {
        const p = await view<unknown[]>('paywall', 'get_paywall', [
          bcs.u64().serialize(id.toString()).toBase64(),
        ])
        if (Array.isArray(p) && canonHex(p[0] as string) === A.hex && p[7] === true) {
          paywallId = id
          break
        }
      } catch {
        /* not found */
      }
    }
    if (!paywallId) throw new Error('paywall not found')
  })

  await step('paywall.bob-purchases', async () => {
    const alreadyAccess = await view<boolean>('paywall', 'has_access', [
      bcs.u64().serialize(paywallId.toString()).toBase64(),
      bcs.address().serialize(B.bech32).toBase64(),
    ])
    if (alreadyAccess === true) return
    await broadcast(B, [
      mx(B.bech32, 'paywall', 'purchase', [
        bcs.u64().serialize(paywallId.toString()).toBase64(),
      ]),
    ])
    const has = await view<boolean>('paywall', 'has_access', [
      bcs.u64().serialize(paywallId.toString()).toBase64(),
      bcs.address().serialize(B.bech32).toBase64(),
    ])
    assertTrue(has === true, 'bob has_access')
  })

  // ---------- Reputation ----------
  await step('rep.alice-thumbs-up-bob', async () => {
    await broadcast(A, [
      mx(A.bech32, 'reputation', 'thumbs_up', [bcs.address().serialize(B.bech32).toBase64()]),
    ])
  })

  await step('rep.carol-thumbs-up-bob', async () => {
    await broadcast(C, [
      mx(C.bech32, 'reputation', 'thumbs_up', [bcs.address().serialize(B.bech32).toBase64()]),
    ])
  })

  await step('rep.counters-bob', async () => {
    const t = await view<unknown[]>('reputation', 'get_counters', [
      bcs.address().serialize(B.bech32).toBase64(),
    ])
    assertTrue(Number((t as unknown[])[0]) >= 2, 'bob up_votes >= 2')
  })

  await step('rep.bob-attests-alice', async () => {
    await broadcast(B, [
      mx(B.bech32, 'reputation', 'attest', [
        bcs.address().serialize(A.bech32).toBase64(),
        bcs.string().serialize('paid on time').toBase64(),
        bcs.string().serialize('https://scan/tx').toBase64(),
      ]),
    ])
  })

  // ---------- Merchant registry ----------
  await step('merchant.alice-registers', async () => {
    const already = await view<boolean>('merchant_registry', 'is_merchant', [
      bcs.address().serialize(A.bech32).toBase64(),
    ])
    if (already === true) return
    await broadcast(A, [
      mx(A.bech32, 'merchant_registry', 'register', [
        bcs.string().serialize('Alice Shop').toBase64(),
        bcs.string().serialize('Retail').toBase64(),
        bcs.string().serialize('').toBase64(),
        bcs.string().serialize('hello@alice.shop').toBase64(),
        bcs.vector(bcs.string()).serialize([DENOM]).toBase64(),
      ]),
    ])
    const is = await view<boolean>('merchant_registry', 'is_merchant', [
      bcs.address().serialize(A.bech32).toBase64(),
    ])
    assertTrue(is === true, 'alice is merchant')
  })

  // ---------- Lucky pool ----------
  let poolId = 0
  await step('lucky.deployer-creates-pool-3-cap', async () => {
    await broadcast(D, [
      mx(D.bech32, 'lucky_pool', 'create_pool', [
        bcs.u64().serialize('1000').toBase64(),
        bcs.u64().serialize('3').toBase64(),
        bcs.string().serialize(DENOM).toBase64(),
      ]),
    ])
    // Pools accumulate across runs — scan high→low for the latest undrawn one.
    for (let id = 50; id >= 1; id--) {
      try {
        const p = await view<unknown[]>('lucky_pool', 'get_pool', [
          bcs.u64().serialize(id.toString()).toBase64(),
        ])
        if (Array.isArray(p) && canonHex(p[0] as string) === D.hex && p[7] === false) {
          poolId = id
          break
        }
      } catch {
        /* noop */
      }
    }
    if (!poolId) throw new Error('lucky pool not found')
  })

  await step('lucky.3-wallets-join-and-draw', async () => {
    for (const a of [A, B, C]) {
      await broadcast(a, [
        mx(a.bech32, 'lucky_pool', 'join_pool', [
          bcs.u64().serialize(poolId.toString()).toBase64(),
        ]),
      ])
    }
    // Pool is full — anyone can draw (but deployer is easiest).
    await broadcast(D, [
      mx(D.bech32, 'lucky_pool', 'draw', [bcs.u64().serialize(poolId.toString()).toBase64()]),
    ])
    const p = await view<unknown[]>('lucky_pool', 'get_pool', [
      bcs.u64().serialize(poolId.toString()).toBase64(),
    ])
    assertTrue((p as unknown[])[7] === true, 'pool drawn')
    const winner = (p as unknown[])[6] as string
    const wh = canonHex(winner)
    assertTrue(
      wh === A.hex || wh === B.hex || wh === C.hex,
      'winner is A/B/C',
    )
  })

  // ---------- Squads ----------
  let squadId = 0
  await step('squad.alice-creates', async () => {
    const existing = Number(
      await view<number>('squads', 'squad_of', [bcs.address().serialize(A.bech32).toBase64()]),
    )
    if (existing > 0) {
      squadId = existing
      return
    }
    const name = 'warriors-' + Math.random().toString(36).slice(2, 6)
    await broadcast(A, [
      mx(A.bech32, 'squads', 'create_squad', [bcs.string().serialize(name).toBase64()]),
    ])
    const id = await view<number>('squads', 'squad_of', [
      bcs.address().serialize(A.bech32).toBase64(),
    ])
    squadId = Number(id)
    assertTrue(squadId > 0, 'alice in a squad')
  })

  await step('squad.bob-and-carol-join', async () => {
    for (const a of [B, C]) {
      const current = Number(
        await view<number>('squads', 'squad_of', [bcs.address().serialize(a.bech32).toBase64()]),
      )
      if (current === squadId) continue
      if (current > 0 && current !== squadId) {
        // Already in a different squad from a prior run — leave first.
        await broadcast(a, [
          mx(a.bech32, 'squads', 'leave_squad', [
            bcs.u64().serialize(current.toString()).toBase64(),
          ]),
        ]).catch(() => {})
      }
      await broadcast(a, [
        mx(a.bech32, 'squads', 'join_squad', [
          bcs.u64().serialize(squadId.toString()).toBase64(),
        ]),
      ])
    }
    const sq = await view<Record<string, unknown>>('squads', 'get_squad', [
      bcs.u64().serialize(squadId.toString()).toBase64(),
    ])
    const members = sq.members as string[]
    assertTrue(members.length >= 1, 'squad has members')
  })

  await step('squad.admin-awards-xp', async () => {
    await broadcast(D, [
      mx(D.bech32, 'squads', 'award_xp', [
        bcs.u64().serialize(squadId.toString()).toBase64(),
        bcs.address().serialize(A.bech32).toBase64(),
        bcs.u64().serialize('100').toBase64(),
      ]),
    ])
    const xp = await view<number>('squads', 'total_xp', [
      bcs.u64().serialize(squadId.toString()).toBase64(),
    ])
    assertTrue(Number(xp) >= 100, 'squad xp >= 100')
  })

  // ---------- Gift box catalog ----------
  await step('catalog.deployer-registers-box', async () => {
    await broadcast(D, [
      mx(D.bech32, 'gift_box_catalog', 'register_box', [
        bcs.string().serialize('Birthday').toBase64(),
        bcs.u8().serialize(1).toBase64(),
        bcs.string().serialize('ipfs://bday.png').toBase64(),
        bcs.string().serialize('Happy birthday!').toBase64(),
        bcs.string().serialize('#ec4899').toBase64(),
        bcs.u64().serialize('10').toBase64(),
      ]),
    ])
    const total = await view<number>('gift_box_catalog', 'total_boxes')
    assertTrue(Number(total) >= 1, 'catalog >= 1 box')
  })

  // ---------- Messages (encrypted, E2E) ----------
  await step('messages.alice-posts-to-bob-encrypted', async () => {
    const aliceToken = await authSession(A)
    const bobPubkey = B.x25519!.publicKey

    const plaintext = 'hey bob, secret test'
    const plainBytes = new TextEncoder().encode(plaintext)
    const ctToBob = sodium.crypto_box_seal(plainBytes, bobPubkey)
    const ctToSelf = sodium.crypto_box_seal(plainBytes, A.x25519!.publicKey)

    // chatId = deterministic hash of sorted addresses — backend also derives
    const sorted = [A.bech32, B.bech32].sort()
    const chatId = crypto.createHash('sha256').update(sorted.join('|')).digest('hex').slice(0, 32)

    const posted = await api<{ id: string; chatId: string }>('/v1/messages', {
      method: 'POST',
      token: aliceToken,
      body: JSON.stringify({
        chatId,
        recipientInitiaAddress: B.bech32,
        ciphertextBase64: Buffer.from(ctToBob).toString('base64'),
        senderCiphertextBase64: Buffer.from(ctToSelf).toString('base64'),
        senderSignatureBase64: Buffer.from(crypto.randomBytes(16)).toString('base64'),
      }),
    })
    if (!posted.id) throw new Error('no message id')
    ;(globalThis as unknown as { __chatId: string }).__chatId = chatId
  })

  await step('messages.bob-decrypts-inbound', async () => {
    const bobToken = await authSession(B)
    const chatId = (globalThis as unknown as { __chatId: string }).__chatId
    const res = await api<{ messages: Array<{ ciphertextBase64: string }> }>(
      `/v1/messages/${chatId}`,
      { token: bobToken },
    )
    assertTrue(res.messages.length >= 1, 'at least 1 message for Bob')
    const ct = Buffer.from(res.messages[0].ciphertextBase64, 'base64')
    const pt = sodium.crypto_box_seal_open(
      new Uint8Array(ct),
      B.x25519!.publicKey,
      B.x25519!.privateKey,
    )
    const text = new TextDecoder().decode(pt)
    assertEq(text, 'hey bob, secret test', 'decrypted text matches')
  })

  // ---------- API aggregation endpoints ----------
  await step('api.portfolio.alice', async () => {
    const p = await waitFor(
      () => api<{ stats: { tipsReceived: number; followersCount: number } }>(
        `/v1/profiles/${A.bech32}/portfolio`,
      ),
      (v) => v.stats.tipsReceived >= 2 && v.stats.followersCount >= 1,
      45_000,
      'alice portfolio',
    )
    assertTrue(p.stats.tipsReceived >= 2, 'alice.tipsReceived >= 2')
    assertTrue(p.stats.followersCount >= 1, 'alice.followersCount >= 1')
  })

  await step('api.trust-score.alice', async () => {
    const t = await api<{ score: number; grade: string }>(`/v1/profiles/${A.bech32}/trust-score`)
    assertTrue(t.score > 0, 'alice trust score > 0')
    assertTrue(typeof t.grade === 'string', 'has grade')
  })

  await step('api.quests.alice', async () => {
    const q = await waitFor(
      () => api<{ totalXp: number; entries: Array<{ completed: boolean }> }>(
        `/v1/profiles/${A.bech32}/quests`,
      ),
      (v) => v.entries.some((e) => e.completed),
      30_000,
      'alice quest completion',
    )
    assertTrue(q.entries.some((e) => e.completed), 'alice completed at least 1 quest')
  })

  await step('api.discover.recent', async () => {
    const d = await api<{ entries: unknown[] }>('/v1/discover/recent?limit=10')
    assertTrue(d.entries.length > 0, 'discover has entries')
  })

  await step('api.discover.top-creators', async () => {
    const d = await api<{ entries: Array<{ address: string }> }>('/v1/discover/top-creators?limit=10')
    assertTrue(d.entries.some((e) => e.address === A.bech32), 'alice in top creators')
  })

  await step('api.activity.alice-full', async () => {
    const act = await waitFor(
      () => api<{ entries: Array<{ kind: string }> }>(`/v1/profiles/${A.bech32}/activity?limit=50`),
      (v) => {
        const k = new Set(v.entries.map((e) => e.kind))
        return k.has('tip') && k.has('payment') && k.has('follow')
      },
      45_000,
      'activity has tip + payment + follow',
    )
    const kinds = new Set(act.entries.map((e) => e.kind))
    assertTrue(kinds.has('tip') && kinds.has('payment') && kinds.has('follow'), 'activity has all 3 kinds')
  })

  // ---------- OG image routes (served by web, but web may not be up) ----------
  await step('og.profile-png', async () => {
    const webUrl = process.env.ORI_WEB_URL ?? 'http://localhost:3000'
    try {
      const r = await fetch(`${webUrl}/api/og/profile/alice`)
      if (!r.ok) throw new Error(`status ${r.status}`)
      const ct = r.headers.get('content-type') ?? ''
      if (!ct.startsWith('image/')) throw new Error(`bad content-type ${ct}`)
    } catch (e) {
      throw new Error(`web app not reachable at ${webUrl}: ${(e as Error).message}`)
    }
  })
}

// ================================================================
// Main
// ================================================================

async function main(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════╗')
  console.log('║  Ori — comprehensive E2E test harness                     ║')
  console.log('╠═══════════════════════════════════════════════════════════╣')
  console.log(`║  chain: ${CHAIN_ID.padEnd(50)}║`)
  console.log(`║  module: ${MODULE.padEnd(49)}║`)
  console.log(`║  api: ${API.padEnd(52)}║`)
  console.log('╚═══════════════════════════════════════════════════════════╝')

  await setup()
  await runTests()

  const pass = results.filter((r) => r.status === 'pass').length
  const fail = results.filter((r) => r.status === 'fail').length
  const skip = results.filter((r) => r.status === 'skip').length

  console.log(`\n┌─────────────────────────────────────────────────────────┐`)
  console.log(`│ SUMMARY  pass=${pass}  fail=${fail}  skip=${skip}${' '.repeat(35 - String(pass + fail + skip).length * 3)}│`)
  console.log(`└─────────────────────────────────────────────────────────┘`)

  if (fail > 0) {
    console.log('\nFailures:')
    for (const r of results) {
      if (r.status === 'fail') console.log(`  ❌ ${r.name}\n     ${r.detail}`)
    }
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('\n\x1b[31m=== fatal ===\x1b[0m')
  console.error(e)
  process.exit(1)
})
