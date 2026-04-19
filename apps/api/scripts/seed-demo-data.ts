#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Ori — demo seed script.
 *
 * Populates the freshly-deployed rollup with believable demo data so the UI
 * doesn't show empty Discover, empty Activity, and empty Leaderboards during
 * video recording.
 *
 * What it creates (all idempotent — safe to re-run):
 *   - 6 synthetic actors (Alice, Bob, Carol, Dave, Eve, Frank) with saved
 *     mnemonics, each funded from the deployer
 *   - 6 on-chain profiles with bios + links
 *   - ~24 peer-to-peer payments (varied amounts, varied memos) — populates
 *     Activity Feed + chat history + bill-split candidates
 *   - ~10 creator tips — populates Top Tippers + Top Creators leaderboards
 *   - 2 paywalls (one markdown article, one JSON API proxy) — gives us real
 *     /paywall/1 and /paywall/2 to demo x402 + the agent purchase flow
 *   - 1 oracle wager on BITCOIN/USD (deadline 1h from now) — shows Slinky
 *     integration in the wagers feed
 *   - A handful of milestone SBT badges (First Payment, First Tip, etc.)
 *
 * Usage:
 *   # from repo root, inside WSL
 *   bash scripts/wsl-run-seed.sh
 *
 * The wrapper script sets ORI_CHAIN_ID / ORI_REST_URL / ORI_MODULE_ADDRESS
 * and exports the deployer mnemonic from ~/.weave/config.json, then runs this
 * via tsx. Running directly also works if the env is already set.
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import {
  MnemonicKey,
  Wallet,
  MsgExecute,
  MsgSend,
  RESTClient,
  bcs,
} from '@initia/initia.js'
import { ethers } from 'ethers'
import { bech32 } from 'bech32'

// ================================================================
// Config
// ================================================================

const CHAIN_ID = process.env.ORI_CHAIN_ID ?? 'ori-1'
const REST_URL = process.env.ORI_REST_URL ?? 'http://localhost:1317'
const MODULE = (process.env.ORI_MODULE_ADDRESS ?? '').toLowerCase()
const DENOM = process.env.ORI_DENOM ?? 'umin'
const DEPLOYER_MNEMONIC = process.env.ORI_DEPLOYER_MNEMONIC ?? ''

if (!MODULE) {
  console.error('ORI_MODULE_ADDRESS required (the deployed @ori hex address)')
  process.exit(1)
}
if (!DEPLOYER_MNEMONIC) {
  console.error('ORI_DEPLOYER_MNEMONIC required (24-word mnemonic of the funded deployer)')
  process.exit(1)
}

const rest = new RESTClient(REST_URL, {
  chainId: CHAIN_ID,
  gasPrices: `0.015${DENOM}`,
  gasAdjustment: '1.6',
})

// Where we persist the generated mnemonics so re-runs reuse the same
// addresses (stable /Alice.init, /Bob.init, etc. for demos).
const WALLETS_FILE = path.resolve(process.cwd(), '.ori-seed-wallets.json')

const FUND_PER_WALLET = 200_000_000n // 200 INIT each — plenty for dozens of txs

const ACTOR_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'] as const
type ActorName = (typeof ACTOR_NAMES)[number]

// ================================================================
// Types
// ================================================================

type Actor = {
  name: string
  mnemonic: string
  key: MnemonicKey
  wallet: Wallet
  bech32: string
  hex: string
}

// ================================================================
// Helpers
// ================================================================

function bech32ToHexAddr(addr: string): string {
  const d = bech32.decode(addr)
  return '0x' + Buffer.from(bech32.fromWords(d.words)).toString('hex').toLowerCase()
}

async function makeActor(name: string, mnemonic: string): Promise<Actor> {
  const key = new MnemonicKey({ mnemonic, coinType: 60 })
  const wallet = new Wallet(rest, key)
  const bech = key.accAddress
  return { name, mnemonic, key, wallet, bech32: bech, hex: bech32ToHexAddr(bech) }
}

type StoredWallets = Record<ActorName, string>

function loadOrGenerateMnemonics(): StoredWallets {
  if (fs.existsSync(WALLETS_FILE)) {
    return JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf8')) as StoredWallets
  }
  const generated = Object.fromEntries(
    ACTOR_NAMES.map((n) => [n, ethers.Wallet.createRandom().mnemonic!.phrase]),
  ) as StoredWallets
  fs.mkdirSync(path.dirname(WALLETS_FILE), { recursive: true })
  fs.writeFileSync(WALLETS_FILE, JSON.stringify(generated, null, 2))
  console.log(`  Generated fresh seed mnemonics -> ${WALLETS_FILE}`)
  return generated
}

function mx(sender: string, module: string, fn: string, args: string[]): MsgExecute {
  return new MsgExecute(sender, MODULE, module, fn, [], args)
}

async function broadcast(actor: Actor, msgs: (MsgExecute | MsgSend)[], memo = ''): Promise<string> {
  // Retry-on-sequence-race. One rollup node + rapid back-to-back tx can
  // briefly have stale sequence numbers between simulate and broadcast.
  for (let i = 0; i < 4; i++) {
    try {
      const tx = await actor.wallet.createAndSignTx({ msgs: msgs as never, memo })
      const res = await rest.tx.broadcast(tx)
      if (res.code !== 0) {
        const log = res.raw_log?.slice(0, 280) ?? ''
        // Treat "already exists" style errors as idempotent success.
        if (/already exists|E_ALREADY|E_PROFILE_EXISTS/i.test(log)) {
          return res.txhash
        }
        throw new Error(`tx ${res.txhash} failed code=${res.code}: ${log}`)
      }
      return res.txhash
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!/sequence|ECONNRESET|status 5\d\d/i.test(msg) || i === 3) throw err
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw new Error('broadcast: exhausted retries')
}

async function balance(addr: string): Promise<bigint> {
  const res = await fetch(`${REST_URL}/cosmos/bank/v1beta1/balances/${addr}/by_denom?denom=${DENOM}`)
  if (!res.ok) return 0n
  const body = (await res.json()) as { balance?: { amount?: string } }
  return BigInt(body.balance?.amount ?? '0')
}

// ================================================================
// Setup — actors + funding
// ================================================================

async function setup(): Promise<{ D: Actor; actors: Record<ActorName, Actor> }> {
  const stored = loadOrGenerateMnemonics()
  const D = await makeActor('Deployer', DEPLOYER_MNEMONIC)
  const actors = {} as Record<ActorName, Actor>
  for (const n of ACTOR_NAMES) {
    actors[n] = await makeActor(n, stored[n])
  }

  console.log('\n== Actors ==')
  console.log(`  Deployer: ${D.bech32}`)
  for (const n of ACTOR_NAMES) {
    console.log(`  ${n.padEnd(6)}: ${actors[n].bech32}`)
  }

  // Fund any under-funded actor from deployer (bank MsgSend).
  const needs: Array<{ a: Actor; missing: bigint }> = []
  for (const n of ACTOR_NAMES) {
    const have = await balance(actors[n].bech32)
    if (have < FUND_PER_WALLET) {
      needs.push({ a: actors[n], missing: FUND_PER_WALLET - have })
    }
  }
  if (needs.length > 0) {
    const msgs = needs.map(
      (n) => new MsgSend(D.bech32, n.a.bech32, { [DENOM]: n.missing.toString() }),
    )
    const h = await broadcast(D, msgs, 'ori-seed-fund')
    console.log(`  Funded ${needs.length} actor(s) tx=${h}`)
    await new Promise((r) => setTimeout(r, 2500))
  } else {
    console.log('  All actors already funded, skipping')
  }
  return { D, actors }
}

// ================================================================
// Profiles
// ================================================================

const BIOS: Record<ActorName, { bio: string; links: string[]; labels: string[] }> = {
  Alice: {
    bio: 'Designer + tiny gardener. DM me memes.',
    links: ['https://alice.example/'],
    labels: ['portfolio'],
  },
  Bob: {
    bio: 'Writing long-form essays about crypto UX. Paywalled drops weekly.',
    links: ['https://bob.example/'],
    labels: ['newsletter'],
  },
  Carol: {
    bio: 'Streaming Initia dev sessions. Tips welcome ⚡',
    links: ['https://twitch.tv/carol', 'https://carol.example/'],
    labels: ['twitch', 'homepage'],
  },
  Dave: {
    bio: 'Making a prediction market for climate milestones.',
    links: ['https://dave.example/'],
    labels: ['project'],
  },
  Eve: {
    bio: 'Audio engineer. Usually behind the mic.',
    links: [],
    labels: [],
  },
  Frank: {
    bio: 'Founder — building tools that make crypto invisible.',
    links: ['https://frank.example/', 'https://twitter.com/frank'],
    labels: ['site', 'x'],
  },
}

async function seedProfiles(actors: Record<ActorName, Actor>): Promise<void> {
  console.log('\n== Profiles ==')
  for (const n of ACTOR_NAMES) {
    const a = actors[n]
    const bio = BIOS[n]
    const msg = mx(a.bech32, 'profile_registry', 'create_profile', [
      bcs.string().serialize(bio.bio).toBase64(),
      bcs.string().serialize('').toBase64(), // avatar_url — empty, gradient avatar will render
      bcs.vector(bcs.string()).serialize(bio.links).toBase64(),
      bcs.vector(bcs.string()).serialize(bio.labels).toBase64(),
    ])
    try {
      const h = await broadcast(a, [msg], `ori-seed-profile-${n}`)
      console.log(`  ${n.padEnd(6)} -> ${h.slice(0, 12)}…`)
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err)
      if (/E_PROFILE_EXISTS|already/i.test(m)) {
        console.log(`  ${n.padEnd(6)} already exists, skipping`)
      } else {
        throw err
      }
    }
  }
}

// ================================================================
// Payments
// ================================================================

// (sender, recipient, amountInBaseUnits, memo)
type PaymentSpec = [ActorName, ActorName, number, string]

const PAYMENTS: PaymentSpec[] = [
  ['Alice', 'Bob', 5_000_000, 'for the essay on UX'],
  ['Bob', 'Alice', 500_000, 'coffee'],
  ['Carol', 'Alice', 2_000_000, 'loved the logo work'],
  ['Dave', 'Carol', 1_500_000, 'stream was fire'],
  ['Frank', 'Bob', 10_000_000, 'patron drop'],
  ['Eve', 'Carol', 800_000, 'thanks for the co-stream'],
  ['Alice', 'Dave', 300_000, ''],
  ['Bob', 'Carol', 1_200_000, ''],
  ['Frank', 'Alice', 4_000_000, 'advance for mockups'],
  ['Carol', 'Eve', 700_000, 'mixing pass'],
  ['Dave', 'Alice', 200_000, ''],
  ['Eve', 'Bob', 150_000, 'read the post'],
  ['Alice', 'Frank', 2_500_000, ''],
  ['Carol', 'Dave', 600_000, 'beta access'],
  ['Bob', 'Dave', 400_000, 'research grant'],
  ['Frank', 'Carol', 6_000_000, 'sustaining sponsor'],
  ['Alice', 'Eve', 350_000, ''],
  ['Eve', 'Frank', 1_000_000, ''],
  ['Dave', 'Bob', 750_000, 'monthly reader'],
  ['Carol', 'Frank', 2_000_000, ''],
  ['Frank', 'Eve', 1_500_000, 'audio post'],
  ['Bob', 'Frank', 500_000, ''],
  ['Alice', 'Carol', 900_000, 'late tip'],
  ['Dave', 'Eve', 250_000, ''],
]

async function seedPayments(actors: Record<ActorName, Actor>): Promise<void> {
  console.log('\n== Payments ==')
  for (const [from, to, amount, memo] of PAYMENTS) {
    const fromA = actors[from]
    const toA = actors[to]
    // chat_id: deterministic sort-then-hash of both bech32s, keeps the
    // same chat thread across messages from either direction. Sha-256 first
    // 32 hex chars is plenty of entropy for a demo.
    const sorted = [fromA.bech32, toA.bech32].sort().join('|')
    const chatId =
      'chat-' +
      (await import('node:crypto')).createHash('sha256').update(sorted).digest('hex').slice(0, 16)
    const msg = mx(fromA.bech32, 'payment_router', 'send', [
      bcs.address().serialize(toA.bech32).toBase64(),
      bcs.string().serialize(DENOM).toBase64(),
      bcs.u64().serialize(amount.toString()).toBase64(),
      bcs.string().serialize(memo).toBase64(),
      bcs.string().serialize(chatId).toBase64(),
    ])
    try {
      const h = await broadcast(fromA, [msg], `ori-seed-pay-${from}-${to}`)
      console.log(`  ${from.padEnd(5)} -> ${to.padEnd(5)} ${(amount / 1e6).toFixed(3).padStart(7)} INIT  ${h.slice(0, 12)}…`)
    } catch (err) {
      console.warn(`  ${from} -> ${to} FAILED: ${err instanceof Error ? err.message.slice(0, 100) : err}`)
    }
    // Small pause between txs from the same sender to keep sequence sane.
    await new Promise((r) => setTimeout(r, 500))
  }
}

// ================================================================
// Tips — populates tip-jar leaderboards
// ================================================================

type TipSpec = [ActorName, ActorName, number, string]

const TIPS: TipSpec[] = [
  ['Alice', 'Carol', 5_000_000, 'best dev stream on Initia'],
  ['Dave', 'Carol', 3_000_000, 'keep going!'],
  ['Frank', 'Carol', 15_000_000, 'sustaining tip'],
  ['Eve', 'Carol', 1_500_000, 'thx for the co-stream'],
  ['Bob', 'Alice', 2_000_000, 'loved the mockups'],
  ['Dave', 'Alice', 1_000_000, 'sick design'],
  ['Frank', 'Bob', 8_000_000, 'monthly patron'],
  ['Carol', 'Bob', 2_500_000, 'deep post, kept me reading'],
  ['Eve', 'Bob', 1_200_000, ''],
  ['Alice', 'Frank', 3_000_000, 'thanks for the hire'],
]

async function seedTips(actors: Record<ActorName, Actor>): Promise<void> {
  console.log('\n== Tips ==')
  for (const [from, to, amount, message] of TIPS) {
    const fromA = actors[from]
    const toA = actors[to]
    const msg = mx(fromA.bech32, 'tip_jar', 'tip', [
      bcs.address().serialize(toA.bech32).toBase64(),
      bcs.string().serialize(DENOM).toBase64(),
      bcs.u64().serialize(amount.toString()).toBase64(),
      bcs.string().serialize(message).toBase64(),
    ])
    try {
      const h = await broadcast(fromA, [msg], `ori-seed-tip-${from}-${to}`)
      console.log(`  ${from.padEnd(5)} ~> ${to.padEnd(5)} ${(amount / 1e6).toFixed(3).padStart(7)} INIT  ${h.slice(0, 12)}…`)
    } catch (err) {
      console.warn(`  ${from} ~> ${to} FAILED: ${err instanceof Error ? err.message.slice(0, 100) : err}`)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

// ================================================================
// Paywalls — 2 variants showcasing the polymorphic x402 handler
// ================================================================

const PAYWALLS: Array<{ creator: ActorName; title: string; resourceUri: string; priceUmin: number }> = [
  {
    // Mode: article (default) — plain markdown hosted publicly. Represents
    // Bob's long-form essay.
    creator: 'Bob',
    title: 'Why crypto UX is bad (and what to fix first)',
    resourceUri:
      'https://raw.githubusercontent.com/jlengstorf/dev-cheatsheet/main/README.md',
    priceUmin: 1_000_000, // 1 INIT
  },
  {
    // Mode: api — JSON API proxy. Agents can pay once and then have
    // sustained access to a data feed. Represents a paid data product.
    creator: 'Dave',
    title: 'Live BTC+ETH price feed (JSON)',
    resourceUri: 'api:https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
    priceUmin: 500_000, // 0.5 INIT
  },
]

async function seedPaywalls(actors: Record<ActorName, Actor>): Promise<void> {
  console.log('\n== Paywalls ==')
  for (const p of PAYWALLS) {
    const a = actors[p.creator]
    const msg = mx(a.bech32, 'paywall', 'create_paywall', [
      bcs.string().serialize(p.title).toBase64(),
      bcs.string().serialize(p.resourceUri).toBase64(),
      bcs.u64().serialize(p.priceUmin.toString()).toBase64(),
      bcs.string().serialize(DENOM).toBase64(),
    ])
    try {
      const h = await broadcast(a, [msg], `ori-seed-paywall-${p.creator}`)
      console.log(`  ${p.creator} :: "${p.title}" @ ${(p.priceUmin / 1e6).toFixed(2)} INIT  ${h.slice(0, 12)}…`)
    } catch (err) {
      console.warn(`  paywall create FAILED: ${err instanceof Error ? err.message.slice(0, 120) : err}`)
    }
    await new Promise((r) => setTimeout(r, 600))
  }
}

// ================================================================
// Oracle wager (BITCOIN/USD)
// ================================================================

async function seedOracleWager(actors: Record<ActorName, Actor>): Promise<void> {
  console.log('\n== Oracle wager ==')
  const proposer = actors.Alice
  const accepter = actors.Frank
  const stakeUmin = 1_000_000 // 1 INIT each
  // Slinky publishes oracle prices as u256 with per-pair decimals. We use a
  // round number here ($100k BTC) — the resolution path reads actual decimals
  // back from oracle::get_price so the absolute magnitude here is demo-only.
  const targetPrice = 10000000000000000000000n // 1e22 — "BTC ≥ this" claim
  // The contract expects a DURATION (seconds from now), validated by
  // validate_deadline() against MIN/MAX — 5 min to 180 days. We pass 24h so
  // the wager shows up in the feed with plenty of runway.
  const deadlineSecs = 24 * 60 * 60 // 1 day

  const msg = mx(proposer.bech32, 'wager_escrow', 'propose_oracle_wager', [
    bcs.address().serialize(accepter.bech32).toBase64(),
    bcs.string().serialize(DENOM).toBase64(),
    bcs.u64().serialize(stakeUmin.toString()).toBase64(),
    bcs.string().serialize('BTC >= $100k within the hour').toBase64(),
    bcs.string().serialize('price').toBase64(),
    bcs.u64().serialize(deadlineSecs.toString()).toBase64(),
    bcs.string().serialize('BITCOIN/USD').toBase64(),
    bcs.u256().serialize(targetPrice.toString()).toBase64(),
    bcs.bool().serialize(true).toBase64(), // proposer_wins_above: Alice bets YES (>=)
  ])
  try {
    const h = await broadcast(proposer, [msg], 'ori-seed-oracle-wager')
    console.log(`  Alice (YES) vs Frank (NO) on BTC>=$100k  ${h.slice(0, 12)}…`)
  } catch (err) {
    console.warn(`  oracle wager FAILED: ${err instanceof Error ? err.message.slice(0, 180) : err}`)
  }
}

// ================================================================
// Achievement badges (deployer is the issuer)
// ================================================================

const BADGE_AWARDS: Array<{ recipient: ActorName; badgeType: number; label: string }> = [
  { recipient: 'Alice', badgeType: 0, label: 'Early User' },
  { recipient: 'Bob', badgeType: 0, label: 'Early User' },
  { recipient: 'Carol', badgeType: 0, label: 'Early User' },
  { recipient: 'Dave', badgeType: 1, label: 'First Payment' },
  { recipient: 'Eve', badgeType: 1, label: 'First Payment' },
  { recipient: 'Carol', badgeType: 2, label: 'First Tip Received' },
  { recipient: 'Bob', badgeType: 2, label: 'First Tip Received' },
  { recipient: 'Frank', badgeType: 10, label: 'Founding 100' },
]

async function seedBadges(D: Actor, actors: Record<ActorName, Actor>): Promise<void> {
  console.log('\n== Achievement badges ==')
  for (const b of BADGE_AWARDS) {
    const recipient = actors[b.recipient]
    const msg = mx(D.bech32, 'achievement_sbt', 'award_milestone', [
      bcs.address().serialize(recipient.bech32).toBase64(),
      bcs.u8().serialize(b.badgeType).toBase64(),
    ])
    try {
      const h = await broadcast(D, [msg], `ori-seed-badge-${b.recipient}-${b.badgeType}`)
      console.log(`  ${b.recipient.padEnd(6)} <- ${b.label}  ${h.slice(0, 12)}…`)
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err)
      if (/E_ALREADY|already/i.test(m)) {
        console.log(`  ${b.recipient.padEnd(6)} <- ${b.label}  (already held)`)
      } else {
        console.warn(`  ${b.recipient} badge FAILED: ${m.slice(0, 120)}`)
      }
    }
    await new Promise((r) => setTimeout(r, 400))
  }
}

// ================================================================
// Main
// ================================================================

async function main(): Promise<void> {
  console.log(`\nOri seed script`)
  console.log(`  chain   = ${CHAIN_ID}`)
  console.log(`  rest    = ${REST_URL}`)
  console.log(`  module  = ${MODULE}`)
  console.log(`  denom   = ${DENOM}`)

  const { D, actors } = await setup()
  await seedProfiles(actors)
  await seedPayments(actors)
  await seedTips(actors)
  await seedPaywalls(actors)
  await seedOracleWager(actors)
  await seedBadges(D, actors)

  console.log('\n✅ Seed complete. The rollup now has believable demo activity.')
  console.log(`   Wallets stashed at ${WALLETS_FILE} — reuse on next run.`)
  console.log(`   Paywalls created at /paywall/1 and /paywall/2 (approximately — check on-chain for exact ids).`)
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
