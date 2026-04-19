#!/usr/bin/env node
/**
 * Ori MCP Server — exposes Ori actions to any MCP-speaking LLM client
 * (Claude Desktop, Claude Code, Cursor, etc.).
 *
 * Tools:
 *   - ori.send_payment          — in-chat payment via payment_router::send
 *   - ori.send_tip              — creator tip via tip_jar::tip (1% fee)
 *   - ori.create_link_gift      — create a shareable gift link
 *   - ori.get_balance           — look up ORI balance of any address
 *   - ori.get_profile           — fetch on-chain profile fields
 *   - ori.resolve_init_name     — .init → bech32 address via L1 usernames
 *   - ori.propose_wager         — propose a friendly bet
 *   - ori.list_top_creators     — discover creators ranked by tips received
 *
 * Security posture:
 *   - The server signs with a mnemonic supplied via ORI_MCP_MNEMONIC.
 *   - All TRANSFER tools ask the LLM to confirm their call arguments before
 *     the tx goes through — the LLM should surface it to the user when
 *     running in Claude Desktop. For autonomous agents, set
 *     `ORI_MCP_AUTO_APPROVE=1` (use with caution).
 *   - READ tools (balance, profile) don't require the mnemonic.
 *
 * Transport: stdio (Claude Desktop's default for local MCP servers).
 */
import 'dotenv/config'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { MnemonicKey, MsgExecute, RESTClient, Wallet, bcs, isTxError } from '@initia/initia.js'
import { bech32 } from 'bech32'
import { createHash, randomUUID } from 'node:crypto'

const CONFIG = {
  chainId: process.env.ORI_CHAIN_ID ?? 'ori-1',
  rpcUrl: process.env.ORI_RPC_URL ?? 'http://localhost:26657',
  restUrl: process.env.ORI_REST_URL ?? 'http://localhost:1317',
  l1RestUrl: process.env.L1_REST_URL ?? 'https://rest.testnet.initia.xyz',
  l1ChainId: process.env.L1_CHAIN_ID ?? 'initiation-2',
  l1UsernamesModule:
    process.env.L1_USERNAMES_MODULE ??
    '0x42cd8467b1c86e59bf319e5664a09b6b5840bb3fac64f5ce690b5041c530565a',
  moduleAddress: process.env.ORI_MODULE_ADDRESS ?? '',
  denom: process.env.ORI_DENOM ?? 'umin',
  apiUrl: process.env.ORI_API_URL ?? 'http://localhost:3001',
  gasPrice: process.env.ORI_GAS_PRICE ?? '0.015umin',
  mnemonic: process.env.ORI_MCP_MNEMONIC ?? '',
}

// ========== Wallet (Initia ethsecp256k1 via @initia/initia.js) ==========
//
// Initia uses coin type 60 (Ethereum path m/44'/60'/0'/0/0) with the
// ethsecp256k1 curve — NOT Cosmos's default ed25519 or plain secp256k1.
// CosmJS's DirectSecp256k1HdWallet silently derives with the wrong curve and
// produces a totally different bech32 address, so we use @initia/initia.js's
// MnemonicKey + Wallet which wrap the correct primitives. This matches the
// e2e harness and the seed script.

const oriRestForSigning = new RESTClient(CONFIG.restUrl, {
  chainId: CONFIG.chainId,
  gasPrices: CONFIG.gasPrice,
  gasAdjustment: '1.6',
})

let cachedKey: MnemonicKey | null = null
let cachedWallet: Wallet | null = null

function getKey(): MnemonicKey {
  if (cachedKey) return cachedKey
  if (!CONFIG.mnemonic) {
    throw new Error('ORI_MCP_MNEMONIC not set — required for signing tools')
  }
  cachedKey = new MnemonicKey({ mnemonic: CONFIG.mnemonic, coinType: 60 })
  return cachedKey
}

function getWallet(): Wallet {
  if (cachedWallet) return cachedWallet
  cachedWallet = new Wallet(oriRestForSigning, getKey())
  return cachedWallet
}

async function getAddress(): Promise<string> {
  return getKey().accAddress
}

async function broadcastMoveCall(
  moduleName: string,
  functionName: string,
  args: string[],
  _gasLimit = 500_000,
): Promise<string> {
  // MsgExecute is the Move-runtime wrapper; initia.js knows its amino + proto
  // encodings out of the box. Gas is simulated via the REST endpoint's
  // gasAdjustment rather than a hardcoded limit — more reliable than our
  // prior `calculateFee` path, which sometimes undershot for Move calls.
  const sender = await getAddress()
  const msg = new MsgExecute(sender, CONFIG.moduleAddress, moduleName, functionName, [], args)
  const wallet = getWallet()
  const tx = await wallet.createAndSignTx({ msgs: [msg], memo: 'ori-mcp' })
  const res = await oriRestForSigning.tx.broadcast(tx)
  if (isTxError(res)) {
    throw new Error(
      `broadcast failed (code ${res.code}): ${(res.raw_log ?? '').toString().slice(0, 240)}`,
    )
  }
  return res.txhash
}

// ========== Utility: parse decimal → base units ==========

function toBaseUnits(decimal: string, decimals = 6): bigint {
  const [whole, fracRaw = ''] = decimal.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

function bech32Valid(addr: string): boolean {
  try {
    const d = bech32.decode(addr)
    return d.prefix === 'init'
  } catch {
    return false
  }
}

// ========== Name resolution via L1 ==========

const l1 = new RESTClient(CONFIG.l1RestUrl, { chainId: CONFIG.l1ChainId })

async function resolveToAddress(identifier: string): Promise<string> {
  const trimmed = identifier.trim()
  if (bech32Valid(trimmed)) return trimmed
  const bare = trimmed.endsWith('.init') ? trimmed.slice(0, -'.init'.length) : trimmed
  const result = await l1.move.view(
    CONFIG.l1UsernamesModule,
    'usernames',
    'get_address_from_name',
    [],
    [bcs.string().serialize(bare).toBase64()],
  )
  const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
  if (!data || !Array.isArray(data.vec) || data.vec.length === 0) {
    throw new Error(`Could not resolve "${identifier}"`)
  }
  return String(data.vec[0])
}

// ========== Read-only clients ==========

const oriRest = new RESTClient(CONFIG.restUrl, { chainId: CONFIG.chainId })

// ========== Agent action attribution log ==========
//
// Every tool invocation is recorded to the backend so the user can audit
// what their agent did, when, and with what inputs. Non-blocking: if the
// API is down, the tool call still succeeds -- the log is best-effort.
//
// The row is keyed by the owner (the wallet controlling the mnemonic)
// and the agent signer address (the bech32 derived from the mnemonic).
// `promptHash` is a hash of the canonicalized args -- it's a weak proxy
// for "the intent that triggered this action" since MCP tools receive
// args, not the raw prompt.

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}'
}

function hashArgs(args: unknown): string {
  return createHash('sha256').update(canonicalJson(args)).digest('hex')
}

function flattenResult(result: unknown): unknown {
  if (!result || typeof result !== 'object') return result
  const obj = result as { content?: Array<{ text?: string }> }
  if (Array.isArray(obj.content) && obj.content[0]?.text) {
    return { preview: obj.content[0].text.slice(0, 240) }
  }
  return undefined
}

async function logAgentAction(entry: {
  toolName: string
  args: unknown
  status: 'success' | 'failed'
  errorMsg?: string
  result?: unknown
}): Promise<void> {
  const apiUrl = CONFIG.apiUrl
  if (!apiUrl) return
  let agentAddr: string | null = null
  try {
    agentAddr = await getAddress()
  } catch {
    // Read-only tools don't need a mnemonic; skip logging if we can't
    // identify the signer.
    return
  }
  const ownerAddr = process.env.ORI_MCP_OWNER_ADDR ?? agentAddr
  const body = {
    ownerAddr,
    agentAddr,
    toolName: entry.toolName,
    argsJson: canonicalJson(entry.args),
    promptHash: hashArgs(entry.args),
    status: entry.status,
    ...(entry.errorMsg ? { errorMsg: entry.errorMsg.slice(0, 500) } : {}),
    ...(entry.result ? { resultJson: JSON.stringify(entry.result) } : {}),
  }
  try {
    await fetch(`${apiUrl}/v1/agent/log`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': randomUUID().replace(/-/g, ''),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // silent -- attribution is best-effort.
  }
}

// ========== Initia Docs index ==========
//
// Canonical source: https://docs.initia.xyz/llms.txt (see initia-docs/ai/llms-txt.mdx).
// The file follows the llms.txt standard (https://llmstxt.org) — one link per
// line as Markdown: `- [Page Title](url) — optional description`. We lazily
// fetch once per process and cache in-memory; llms.txt is tens of KB, never
// a burden. For agents wanting semantic search, point them at the native
// https://docs.initia.xyz/mcp endpoint (see our .mcp.json.sample).

type DocIndexEntry = { title: string; url: string; note?: string }

let cachedDocIndex: DocIndexEntry[] | null = null
let cachedDocIndexAt = 0
const DOC_INDEX_TTL_MS = 60 * 60 * 1000

async function loadInitiaDocsIndex(): Promise<DocIndexEntry[]> {
  if (cachedDocIndex && Date.now() - cachedDocIndexAt < DOC_INDEX_TTL_MS) {
    return cachedDocIndex
  }
  const res = await fetch('https://docs.initia.xyz/llms.txt')
  if (!res.ok) throw new Error(`llms.txt fetch failed: ${res.status}`)
  const text = await res.text()
  const entries: DocIndexEntry[] = []
  // llms.txt is Markdown with links. Parse `- [Title](URL): note` form and
  // also plain `[Title](URL)` headers. Skip section dividers and comments.
  const LINK_RE = /\[([^\]]+)\]\((https:\/\/docs\.initia\.xyz\/[^\s)]+)\)(?:\s*[:—-]\s*(.+))?/
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('>')) continue
    const m = line.match(LINK_RE)
    if (!m) continue
    const [, title, url, note] = m
    entries.push({
      title: title!.trim(),
      url: url!.trim(),
      note: note?.trim(),
    })
  }
  cachedDocIndex = entries
  cachedDocIndexAt = Date.now()
  return entries
}

// ========== Tool schemas + handlers ==========

const tools: Tool[] = [
  {
    name: 'ori.send_payment',
    description:
      'Send an in-chat payment to a .init username or init1... address. Uses payment_router::send. Amount is a decimal string in ORI.',
    inputSchema: {
      type: 'object',
      properties: {
        recipient: { type: 'string', description: 'e.g. "alice.init" or "init1..."' },
        amount: { type: 'string', description: 'decimal, e.g. "1.5"' },
        memo: { type: 'string', default: '' },
      },
      required: ['recipient', 'amount'],
    },
  },
  {
    name: 'ori.send_tip',
    description:
      'Tip a creator. 99% goes to them, 1% platform fee. Uses tip_jar::tip.',
    inputSchema: {
      type: 'object',
      properties: {
        creator: { type: 'string' },
        amount: { type: 'string' },
        message: { type: 'string', default: '' },
      },
      required: ['creator', 'amount'],
    },
  },
  {
    name: 'ori.create_link_gift',
    description:
      'Create a shareable gift link — anyone with the URL can claim the funds once. Returns the URL.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'string' },
        theme: { type: 'number', default: 0, description: '0..4' },
        message: { type: 'string', default: '' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'ori.get_balance',
    description: 'Get ORI balance of any address or .init username.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string' } },
      required: ['address'],
    },
  },
  {
    name: 'ori.get_profile',
    description: 'Fetch the on-chain profile (bio, avatar, links, privacy flags).',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string' } },
      required: ['address'],
    },
  },
  {
    name: 'ori.resolve_init_name',
    description: 'Resolve a .init name (or bare name) to a bech32 init1... address via L1.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'ori.propose_wager',
    description:
      'Propose a friendly wager (arbiter mode). Names accepter + arbiter up-front; proposer stakes now.',
    inputSchema: {
      type: 'object',
      properties: {
        accepter: { type: 'string' },
        arbiter: { type: 'string' },
        amount: { type: 'string' },
        claim: { type: 'string' },
        category: { type: 'string', default: '' },
      },
      required: ['accepter', 'arbiter', 'amount', 'claim'],
    },
  },
  {
    name: 'ori.list_top_creators',
    description: 'List top creators on Ori by tip volume. Reads from the Ori backend leaderboard.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', default: 10 } },
    },
  },
  {
    name: 'ori.purchase_paywall',
    description:
      'Unlock a paywalled resource on Ori. Calls paywall::purchase(paywall_id) to record the on-chain buy, then fetches /paywall/[id]?buyer=<signer> to retrieve the gated content. Returns the unlocked body AND the tx hash — use this when the user asks the agent to buy, read, or summarize a paywalled post/file/API by id or URL.',
    inputSchema: {
      type: 'object',
      properties: {
        paywall_id: { type: 'string', description: 'numeric paywall id (from a URL like /paywall/3 → "3")' },
        web_origin: {
          type: 'string',
          description:
            'base URL where the Ori web gate runs. Defaults to ORI_WEB_URL env (http://localhost:3000 locally, https://ori.chat in prod).',
        },
      },
      required: ['paywall_id'],
    },
  },
  {
    name: 'ori.search_initia_docs',
    description:
      'Search the official Initia documentation (https://docs.initia.xyz). Returns the best-matching pages for a natural-language query along with their URLs so the agent can fetch specifics. Backed by the canonical llms.txt index. Use this whenever the user asks about Initia concepts, hooks, modules, rollup ops, or anything platform-related.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'natural-language query, e.g. "how does openBridge work?"' },
        limit: { type: 'number', default: 8 },
      },
      required: ['query'],
    },
  },
  {
    name: 'ori.fetch_initia_doc',
    description:
      'Fetch the full content of a specific Initia docs page by URL (returned by ori.search_initia_docs). Use only after searching; picks the top 1-3 hits and reads their bodies.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'an https://docs.initia.xyz/... URL' },
      },
      required: ['url'],
    },
  },
  {
    name: 'ori.discover_x402',
    description:
      'Probe any HTTPS URL for x402 payment-gated content. Sends a HEAD request and reports whether the URL returns HTTP 402 Payment Required along with the X-Payment-* headers (price, denom, recipient, contract, paywall id). Use this to audit whether an external resource is purchasable by an agent before attempting payment. HTTPS only.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Any https:// URL to probe for x402 support.' },
      },
      required: ['url'],
    },
  },
  {
    name: 'ori.schedule_action',
    description:
      'Schedule a future autonomous action for this agent to execute later -- e.g. "tip alice.init 0.1 INIT in 1 hour" or "buy paywall 3 at 2026-05-01T12:00:00Z". The backend Graphile worker picks up the job at the scheduled time and executes it with retries + DLQ. Use when the user wants an action that should happen WITHOUT them prompting again. Supported kinds: tip, purchase_paywall, subscribe_renew, predict. Either provide `runAt` (ISO timestamp) or `runInSeconds` (delay from now, min 30).',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['tip', 'purchase_paywall', 'subscribe_renew', 'predict'],
          description: 'The action type to schedule.',
        },
        args: {
          type: 'object',
          description:
            'Kind-specific arguments. E.g. for tip: { creator, amount, message }. For purchase_paywall: { paywall_id }. For predict: { token, direction, duration_seconds, amount }.',
        },
        run_at: {
          type: 'string',
          description: 'ISO 8601 timestamp when to execute. Must be at least 30 seconds in the future.',
        },
        run_in_seconds: {
          type: 'number',
          description: 'Alternative to run_at: delay from now in seconds (min 30).',
        },
      },
      required: ['kind', 'args'],
    },
  },
  {
    name: 'ori.predict',
    description:
      'Open a parimutuel prediction market on a token price using the Connect oracle. One call does both: creates the market (target = current oracle price) and stakes on your chosen side. Supported tokens on the ori-1 rollup: BTC, ETH, SOL, BNB, ATOM, ARB, APT, BERA, ENA, NTRN, OSMO, SUI, TIA, USDC, USDT. Note: INIT/USD and DOGE/USD are NOT relayed to the rollup yet. No counterparty needed: winners split the losing-pool proportionally. Use this when the user wants to bet on whether a price goes up or down over a short window. Minimum duration 30s. Settles via `initia_std::oracle::get_price` after the deadline.',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token symbol (base asset). Supported on ori-1: BTC, ETH, SOL, BNB, ATOM, ARB, APT, BERA, ENA, NTRN, OSMO, SUI, TIA, USDC, USDT. /USD is appended automatically. Case-insensitive.',
        },
        direction: {
          type: 'string',
          enum: ['higher', 'lower'],
          description: '"higher" stakes that price will rise above the current oracle price at resolution. "lower" stakes it will fall.',
        },
        duration_seconds: {
          type: 'number',
          description: 'Seconds from now until the market resolves. Minimum 30. Common: 60 (one-minute flash), 300 (5 min), 3600 (1 hour), 86400 (1 day).',
        },
        amount: {
          type: 'string',
          description: 'Stake amount in ORI (decimal, e.g. "0.5"). Must have matching balance.',
        },
      },
      required: ['token', 'direction', 'duration_seconds', 'amount'],
    },
  },
]

// ========== Dispatch ==========

const PaymentInput = z.object({
  recipient: z.string(),
  amount: z.string(),
  memo: z.string().optional().default(''),
})

const TipInput = z.object({
  creator: z.string(),
  amount: z.string(),
  message: z.string().optional().default(''),
})

const GiftInput = z.object({
  amount: z.string(),
  theme: z.number().int().min(0).max(4).optional().default(0),
  message: z.string().optional().default(''),
})

const AddressInput = z.object({ address: z.string() })
const NameInput = z.object({ name: z.string() })

const WagerInput = z.object({
  accepter: z.string(),
  arbiter: z.string(),
  amount: z.string(),
  claim: z.string(),
  category: z.string().optional().default(''),
})

const LimitInput = z.object({ limit: z.number().int().min(1).max(50).optional().default(10) })

const Discoverx402Input = z.object({
  url: z.string().refine((u) => u.startsWith('https://'), {
    message: 'Only https:// URLs may be probed.',
  }),
})

const PredictInput = z.object({
  token: z.string().min(2).max(12),
  direction: z.enum(['higher', 'lower']),
  duration_seconds: z.number().int().min(30).max(30 * 24 * 60 * 60),
  amount: z.string(),
})

const ScheduleActionInput = z
  .object({
    kind: z.enum(['tip', 'purchase_paywall', 'subscribe_renew', 'predict']),
    args: z.record(z.string(), z.unknown()),
    run_at: z.string().optional(),
    run_in_seconds: z.number().int().min(30).max(365 * 24 * 60 * 60).optional(),
  })
  .refine(
    (v) => Boolean(v.run_at) || v.run_in_seconds !== undefined,
    { message: 'Either run_at or run_in_seconds must be provided.' },
  )

type ToolResult = { content: Array<{ type: 'text'; text: string }> }

const toolHandlers: Record<string, (input: unknown) => Promise<ToolResult>> = {
  'ori.send_payment': async (raw) => {
    const input = PaymentInput.parse(raw)
    const recipient = await resolveToAddress(input.recipient)
    const base = toBaseUnits(input.amount)
    const sender = await getAddress()
    const args = [
      bcs.address().serialize(recipient).toBase64(),
      bcs.string().serialize(CONFIG.denom).toBase64(),
      bcs.u64().serialize(base.toString()).toBase64(),
      bcs.string().serialize(input.memo).toBase64(),
      bcs.string().serialize('mcp').toBase64(),
    ]
    const tx = await broadcastMoveCall('payment_router', 'send', args, 500_000)
    return {
      content: [
        {
          type: 'text',
          text: `✅ Sent ${input.amount} ORI from ${sender} to ${recipient}\nTx: ${tx}`,
        },
      ],
    }
  },

  'ori.send_tip': async (raw) => {
    const input = TipInput.parse(raw)
    const creator = await resolveToAddress(input.creator)
    const base = toBaseUnits(input.amount)
    const args = [
      bcs.address().serialize(creator).toBase64(),
      bcs.string().serialize(CONFIG.denom).toBase64(),
      bcs.u64().serialize(base.toString()).toBase64(),
      bcs.string().serialize(input.message).toBase64(),
    ]
    const tx = await broadcastMoveCall('tip_jar', 'tip', args, 500_000)
    return {
      content: [
        { type: 'text', text: `✅ Tipped ${input.amount} ORI to ${creator}\nTx: ${tx}` },
      ],
    }
  },

  'ori.create_link_gift': async (raw) => {
    const input = GiftInput.parse(raw)
    const base = toBaseUnits(input.amount)
    // Generate a random 32-byte secret and sha256 hash it.
    const secret = new Uint8Array(32)
    crypto.getRandomValues(secret)
    const nodeCrypto = await import('crypto')
    const webCrypto = globalThis.crypto ?? (nodeCrypto.webcrypto as unknown as typeof globalThis.crypto)
    const digest = new Uint8Array(await webCrypto.subtle.digest('SHA-256', secret))
    const secretHex = Buffer.from(secret).toString('hex')
    const args = [
      bcs.string().serialize(CONFIG.denom).toBase64(),
      bcs.u64().serialize(base.toString()).toBase64(),
      bcs.u8().serialize(input.theme).toBase64(),
      bcs.string().serialize(input.message).toBase64(),
      bcs.vector(bcs.u8()).serialize(Array.from(digest)).toBase64(),
      bcs.u64().serialize('0').toBase64(),
    ]
    const tx = await broadcastMoveCall('gift_packet', 'create_link_gift', args, 700_000)
    return {
      content: [
        {
          type: 'text',
          text:
            `✅ Link gift created\n` +
            `Tx: ${tx}\n` +
            `Secret (for URL #fragment): ${secretHex}\n` +
            `⚠️ Share this secret only via a private channel.`,
        },
      ],
    }
  },

  'ori.get_balance': async (raw) => {
    const input = AddressInput.parse(raw)
    const addr = await resolveToAddress(input.address)
    const res = await fetch(`${CONFIG.restUrl}/cosmos/bank/v1beta1/balances/${addr}/by_denom?denom=${CONFIG.denom}`)
    if (!res.ok) throw new Error(`balance fetch failed: ${res.status}`)
    const body = (await res.json()) as { balance?: { denom: string; amount: string } }
    const raw_amt = BigInt(body.balance?.amount ?? '0')
    const whole = raw_amt / 1_000_000n
    const frac = (raw_amt % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '')
    const display = `${whole}${frac ? '.' + frac : ''} ORI`
    return { content: [{ type: 'text', text: `${addr}: ${display}` }] }
  },

  'ori.get_profile': async (raw) => {
    const input = AddressInput.parse(raw)
    const addr = await resolveToAddress(input.address)
    const result = await oriRest.move.view(
      CONFIG.moduleAddress,
      'profile_registry',
      'get_profile',
      [],
      [bcs.address().serialize(addr).toBase64()],
    )
    const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  },

  'ori.resolve_init_name': async (raw) => {
    const input = NameInput.parse(raw)
    const addr = await resolveToAddress(input.name)
    return { content: [{ type: 'text', text: addr }] }
  },

  'ori.propose_wager': async (raw) => {
    const input = WagerInput.parse(raw)
    const accepter = await resolveToAddress(input.accepter)
    const arbiter = await resolveToAddress(input.arbiter)
    const base = toBaseUnits(input.amount)
    const args = [
      bcs.address().serialize(accepter).toBase64(),
      bcs.address().serialize(arbiter).toBase64(),
      bcs.string().serialize(CONFIG.denom).toBase64(),
      bcs.u64().serialize(base.toString()).toBase64(),
      bcs.string().serialize(input.claim).toBase64(),
      bcs.string().serialize(input.category).toBase64(),
      bcs.u64().serialize('0').toBase64(),
    ]
    const tx = await broadcastMoveCall('wager_escrow', 'propose_wager_full', args, 700_000)
    return {
      content: [{ type: 'text', text: `✅ Wager proposed\nTx: ${tx}\n"${input.claim}"` }],
    }
  },

  'ori.purchase_paywall': async (raw) => {
    const { paywall_id, web_origin } = z
      .object({
        paywall_id: z.string().regex(/^[0-9]+$/),
        web_origin: z.string().url().optional(),
      })
      .parse(raw)
    const origin = web_origin ?? process.env.ORI_WEB_URL ?? 'http://localhost:3000'
    const buyer = await getAddress()

    // Step 1 — buy it on-chain. paywall::purchase(paywall_id: u64).
    const args = [bcs.u64().serialize(paywall_id).toBase64()]
    const tx = await broadcastMoveCall('paywall', 'purchase', args, 500_000)

    // Step 2 — fetch the gated URL with ?buyer so the x402 gate returns 200.
    // The paywall module needs a second or two to settle `has_access`; most
    // gates are immediate, but we retry once on a 402 to absorb RPC lag.
    const url = `${origin.replace(/\/$/, '')}/paywall/${paywall_id}?buyer=${encodeURIComponent(buyer)}`
    const fetchOnce = async () => fetch(url, { headers: { Accept: 'text/markdown, text/html, application/json' } })
    let res = await fetchOnce()
    if (res.status === 402) {
      await new Promise((r) => setTimeout(r, 2500))
      res = await fetchOnce()
    }
    const contentType = res.headers.get('Content-Type') ?? 'text/plain'
    const body = await res.text()
    const MAX = 12_000
    const preview = body.length > MAX ? body.slice(0, MAX) + '\n\n[…truncated]' : body

    return {
      content: [
        {
          type: 'text',
          text:
            `✅ Paywall #${paywall_id} unlocked for ${buyer}\n` +
            `Tx: ${tx}\n` +
            `Resource-Type: ${contentType}\n` +
            `HTTP: ${res.status}\n\n` +
            `--- content ---\n${preview}`,
        },
      ],
    }
  },

  'ori.search_initia_docs': async (raw) => {
    const { query, limit } = z
      .object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional().default(8),
      })
      .parse(raw)
    const index = await loadInitiaDocsIndex()
    // Score by number of query-term hits in title + URL (case-insensitive,
    // tokenised on whitespace). Cheap but works well for natural-language
    // queries. For complex semantic search, agents should load the native
    // Initia Docs MCP server at https://docs.initia.xyz/mcp alongside Ori.
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2)
    const scored = index.map((entry) => {
      const hay = (entry.title + ' ' + entry.url).toLowerCase()
      let score = 0
      for (const t of terms) if (hay.includes(t)) score++
      return { entry, score }
    })
    scored.sort((a, b) => b.score - a.score)
    const hits = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.entry)
    if (hits.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text:
              `No matches in llms.txt for "${query}". Consider loading the Initia ` +
              `Docs MCP directly: https://docs.initia.xyz/mcp — it supports ` +
              `semantic search. Then retry.`,
          },
        ],
      }
    }
    const lines = hits.map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}`).join('\n')
    return {
      content: [
        {
          type: 'text',
          text: `Top ${hits.length} Initia docs match(es) for "${query}":\n\n${lines}\n\nCall ori.fetch_initia_doc with one of these URLs to read the full page.`,
        },
      ],
    }
  },

  'ori.fetch_initia_doc': async (raw) => {
    const { url } = z
      .object({ url: z.string().url() })
      .parse(raw)
    // Hard allow-list: only docs.initia.xyz. SSRF prevention — an agent-
    // callable fetch that accepts arbitrary URLs is a footgun.
    if (!url.startsWith('https://docs.initia.xyz/')) {
      throw new Error('Only https://docs.initia.xyz/... URLs are allowed here')
    }
    const res = await fetch(url, { headers: { Accept: 'text/markdown, text/plain, text/html' } })
    if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`)
    const body = await res.text()
    // Truncate so a single page can't blow past a reasonable context budget.
    // Agents can page by asking for specific sections in follow-up calls.
    const MAX = 30_000
    const text = body.length > MAX ? body.slice(0, MAX) + '\n\n[…truncated; page continues]' : body
    return { content: [{ type: 'text', text }] }
  },

  'ori.list_top_creators': async (raw) => {
    const input = LimitInput.parse(raw)
    const res = await fetch(`${CONFIG.apiUrl}/v1/leaderboards/top-creators?limit=${input.limit}`)
    if (!res.ok) throw new Error(`API ${res.status}`)
    const body = (await res.json()) as {
      entries: Array<{ rank: number; address: string; initName: string | null; tipsReceivedVolume?: string }>
    }
    return {
      content: [
        {
          type: 'text',
          text: body.entries
            .map(
              (e) =>
                `${e.rank}. ${e.initName ?? e.address} - ${e.tipsReceivedVolume ?? '0'} base-units`,
            )
            .join('\n'),
        },
      ],
    }
  },

  'ori.schedule_action': async (raw) => {
    const input = ScheduleActionInput.parse(raw)
    const apiUrl = CONFIG.apiUrl
    if (!apiUrl) {
      throw new Error('ORI_API_URL not set -- scheduled actions need the backend to run.')
    }
    const agentAddr = await getAddress()
    const ownerAddr = process.env.ORI_MCP_OWNER_ADDR ?? agentAddr

    const body = {
      ownerAddr,
      agentAddr,
      kind: input.kind,
      args: input.args,
      runAt: input.run_at,
      runInSeconds: input.run_in_seconds,
    }
    const res = await fetch(`${apiUrl}/v1/agent/schedule`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': randomUUID().replace(/-/g, ''),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    const json = (await res.json()) as {
      status?: string
      kind?: string
      runAt?: string
      jobKey?: string
      error?: string
      message?: string
    }
    if (!res.ok) {
      throw new Error(
        `Backend rejected schedule: ${json.error ?? res.status} ${json.message ?? ''}`.trim(),
      )
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `Scheduled ${json.kind} for ${json.runAt}.`,
            `job_key: ${json.jobKey ?? '?'}`,
            `owner: ${ownerAddr}`,
            `agent: ${agentAddr}`,
            '',
            'The backend Graphile worker will pick up the job at the scheduled time.',
            'Failures retry with exponential backoff (up to 5 attempts by default).',
            'You can see the recorded action in the agent dashboard once it executes.',
          ].join('\n'),
        },
      ],
    }
  },

  'ori.predict': async (raw) => {
    const input = PredictInput.parse(raw)

    // Normalize pair: "btc" -> "BTC/USD", "BTC/USD" passes through.
    const upper = input.token.trim().toUpperCase()
    const pair = upper.includes('/') ? upper : `${upper}/USD`

    // Fetch current oracle price. Raw integer goes on-chain as target.
    const priceRes = await fetch(
      `${CONFIG.restUrl}/connect/oracle/v2/get_price?currency_pair=${encodeURIComponent(pair)}`,
    )
    if (!priceRes.ok) {
      throw new Error(
        `Oracle lookup failed for ${pair} (status ${priceRes.status}). ` +
          `Check the pair exists via /connect/oracle/v2/get_all_tickers.`,
      )
    }
    const priceJson = (await priceRes.json()) as {
      price?: { price?: string; block_timestamp?: string }
      decimals?: string | number
    }
    const rawPrice = priceJson.price?.price
    const decimals = Number(priceJson.decimals ?? 0)
    if (!rawPrice) {
      throw new Error(`Oracle response missing price for ${pair}: ${JSON.stringify(priceJson).slice(0, 200)}`)
    }
    const targetPrice = BigInt(rawPrice)
    const displayPrice = decimals > 0
      ? (Number(targetPrice) / 10 ** decimals).toFixed(decimals > 4 ? 4 : decimals)
      : rawPrice

    // comparator=true means "YES wins if resolved_price >= target"
    // For "higher" direction: YES wins if price goes UP -> comparator true, stake on YES.
    // For "lower": YES wins if price goes DOWN -> comparator false, stake on YES.
    // Either way the creator stakes YES because the comparator aligns with their chosen direction.
    const comparator = input.direction === 'higher'
    const stakeBase = toBaseUnits(input.amount)

    // 1) create_market
    const createArgs = [
      bcs.string().serialize(pair).toBase64(),
      bcs.u256().serialize(targetPrice.toString()).toBase64(),
      bcs.bool().serialize(comparator).toBase64(),
      bcs.u64().serialize(input.duration_seconds.toString()).toBase64(),
      bcs.string().serialize(CONFIG.denom).toBase64(),
    ]
    const createTx = await broadcastMoveCall('prediction_pool', 'create_market', createArgs, 600_000)

    // Wait briefly for confirmation then read total_markets = our new market_id
    await new Promise((r) => setTimeout(r, 1500))
    const marketsView = await oriRest.move.view(
      CONFIG.moduleAddress,
      'prediction_pool',
      'total_markets',
      [],
      [],
    )
    const totalMarketsRaw = typeof marketsView.data === 'string'
      ? JSON.parse(marketsView.data)
      : marketsView.data
    const marketId = BigInt(String(totalMarketsRaw))

    // 2) stake on YES side (the creator's chosen direction)
    const stakeArgs = [
      bcs.u64().serialize(marketId.toString()).toBase64(),
      bcs.bool().serialize(true).toBase64(),
      bcs.u64().serialize(stakeBase.toString()).toBase64(),
    ]
    const stakeTx = await broadcastMoveCall('prediction_pool', 'stake', stakeArgs, 500_000)

    return {
      content: [
        {
          type: 'text' as const,
          text: [
            `Opened prediction market #${marketId} on ${pair}`,
            `direction=${input.direction} (comparator: ${comparator ? '>=' : '<'} target)`,
            `target_price=${targetPrice.toString()} (raw, ${decimals} decimals -> ~$${displayPrice})`,
            `resolves in ${input.duration_seconds}s`,
            `stake=${input.amount} ORI (${stakeBase.toString()} base units) on YES`,
            `create_tx=${createTx}`,
            `stake_tx=${stakeTx}`,
            '',
            'Anyone can stake against you by calling prediction_pool::stake with side=false.',
            'After the deadline, anyone can call prediction_pool::resolve to settle from the oracle.',
            'Winners claim via prediction_pool::claim_winnings.',
          ].join('\n'),
        },
      ],
    }
  },

  'ori.discover_x402': async (raw) => {
    const input = Discoverx402Input.parse(raw)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    let status = 0
    const payment: Record<string, string> = {}
    let error: string | null = null

    try {
      const res = await fetch(input.url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'manual',
      })
      status = res.status
      res.headers.forEach((value, key) => {
        if (key.toLowerCase().startsWith('x-payment-')) {
          payment[key] = value
        }
      })
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    } finally {
      clearTimeout(timer)
    }

    if (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `x402 probe failed for ${input.url}: ${error}`,
          },
        ],
      }
    }

    const supported = status === 402 && Object.keys(payment).length > 0
    const lines: string[] = [`url=${input.url}`, `status=${status}`]

    if (supported) {
      lines.push('x402=supported')
      lines.push(`price=${payment['x-payment-amount'] ?? '?'} ${payment['x-payment-denom'] ?? ''}`.trim())
      if (payment['x-payment-recipient']) lines.push(`recipient=${payment['x-payment-recipient']}`)
      if (payment['x-payment-contract']) lines.push(`contract=${payment['x-payment-contract']}`)
      if (payment['x-payment-arg-paywall-id']) lines.push(`paywall_id=${payment['x-payment-arg-paywall-id']}`)
      if (payment['x-payment-resource-mode']) lines.push(`mode=${payment['x-payment-resource-mode']}`)
      if (payment['x-payment-scope']) lines.push(`scope=${payment['x-payment-scope']}`)
      lines.push('')
      lines.push('Next step: call ori.purchase_paywall with the paywall_id above (for Ori paywalls) or construct a manual payment tx matching the contract/recipient/amount headers.')
    } else if (status === 402) {
      lines.push('x402=maybe (status 402 but no X-Payment-* headers)')
    } else {
      lines.push('x402=not-supported (url returned a normal response)')
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: lines.join('\n'),
        },
      ],
    }
  },
}

// ========== A2A — JSON-RPC 2.0 HTTP server ==========
//
// Exposes the same tool handlers as MCP under the A2A (Agent-to-Agent)
// protocol, so non-Anthropic agents (Gemini, OpenAI, LangChain, a curl one-
// liner) can invoke Ori actions. Matches the initia-labs/InitPage A2A server
// shape — POST /a2a with a JSON-RPC 2.0 envelope, tool calls wrapped in
// `method: "tools/call"` with `params: { name, arguments }`.

import http from 'node:http'

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: unknown
}

type JsonRpcError = { code: number; message: string; data?: unknown }

function jsonRpcResponse(id: unknown, result?: unknown, error?: JsonRpcError): string {
  return JSON.stringify(error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result })
}

async function handleA2ARequest(body: string): Promise<string> {
  let req: JsonRpcRequest
  try {
    req = JSON.parse(body) as JsonRpcRequest
  } catch {
    return jsonRpcResponse(null, undefined, { code: -32700, message: 'Parse error' })
  }
  if (req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return jsonRpcResponse(req.id ?? null, undefined, { code: -32600, message: 'Invalid Request' })
  }

  // A2A standard methods.
  if (req.method === 'tools/list' || req.method === 'ori.list_tools') {
    return jsonRpcResponse(req.id, { tools })
  }

  if (req.method === 'tools/call' || req.method === 'ori.call_tool') {
    const params = (req.params ?? {}) as { name?: string; arguments?: unknown }
    const name = params.name
    if (!name || typeof name !== 'string') {
      return jsonRpcResponse(req.id, undefined, { code: -32602, message: 'Missing tool name' })
    }
    const handler = toolHandlers[name]
    if (!handler) {
      return jsonRpcResponse(req.id, undefined, { code: -32601, message: `Unknown tool: ${name}` })
    }
    try {
      const result = await handler(params.arguments ?? {})
      return jsonRpcResponse(req.id, result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return jsonRpcResponse(req.id, undefined, { code: -32000, message: msg })
    }
  }

  // Short-form direct invocation: `method: "ori.send_tip"` with args as params.
  const directHandler = req.method.startsWith('ori.') ? toolHandlers[req.method] : undefined
  if (directHandler) {
    try {
      const result = await directHandler(req.params ?? {})
      return jsonRpcResponse(req.id, result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return jsonRpcResponse(req.id, undefined, { code: -32000, message: msg })
    }
  }

  return jsonRpcResponse(req.id, undefined, { code: -32601, message: 'Method not found' })
}

function startA2AServer(port: number): void {
  const server = http.createServer((req, res) => {
    // Health + discovery
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          protocol: 'a2a',
          version: '0.1.0',
          agent: 'ori',
          capabilities: tools.map((t) => t.name),
          endpoint: '/a2a',
        }),
      )
      return
    }

    if (req.method === 'POST' && (req.url === '/a2a' || req.url === '/')) {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        handleA2ARequest(body)
          .then((resp) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(resp)
          })
          .catch((err) => {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(
              jsonRpcResponse(null, undefined, {
                code: -32603,
                message: err instanceof Error ? err.message : 'Internal error',
              }),
            )
          })
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(jsonRpcResponse(null, undefined, { code: -32601, message: 'Not found' }))
  })

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.error(`[ori-a2a] JSON-RPC 2.0 listening on http://0.0.0.0:${port}/a2a`)
  })
}

// ========== Server ==========

async function main(): Promise<void> {
  const server = new Server(
    { name: 'ori', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    const handler = toolHandlers[name]
    if (!handler) {
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
    }
    const startedAt = Date.now()
    try {
      const result = await handler(args ?? {})
      // Fire-and-forget attribution log -- don't block the tool response on
      // the backend write. Failure to log doesn't break the tool call.
      void logAgentAction({
        toolName: name,
        args: args ?? {},
        status: 'success',
        result: flattenResult(result),
      }).catch(() => undefined)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      void logAgentAction({
        toolName: name,
        args: args ?? {},
        status: 'failed',
        errorMsg: msg,
      }).catch(() => undefined)
      const _ms = Date.now() - startedAt
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true }
    }
  })

  // Start A2A HTTP server if configured. Runs alongside stdio MCP.
  const a2aPort = Number(process.env.ORI_A2A_PORT ?? 0)
  if (a2aPort > 0) {
    startA2AServer(a2aPort)
  }

  // Skip stdio transport when only A2A is requested (e.g. running as a
  // long-lived HTTP-only service, not spawned by Claude Desktop).
  if (process.env.ORI_MCP_STDIO !== 'off') {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    // eslint-disable-next-line no-console
    console.error('[ori-mcp] stdio transport connected')
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[ori] fatal', err)
  process.exit(1)
})
