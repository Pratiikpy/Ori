/**
 * Resolve an arbitrary identifier (either `.init` name or bech32 address)
 * to its canonical `init1…` address + display name.
 *
 * The Usernames Move module lives on Initia L1 — NOT on the Ori rollup.
 * We always query L1_REST_URL here (via chain-config.ts). Using the rollup
 * REST would silently return empty results on any deployed build.
 */
import { RESTClient, bcs } from '@initia/initia.js'
import { L1_CHAIN_ID, L1_REST_URL } from './chain-config'

const L1_USERNAMES_MODULE =
  process.env.NEXT_PUBLIC_L1_USERNAMES_MODULE ??
  '0x42cd8467b1c86e59bf319e5664a09b6b5840bb3fac64f5ce690b5041c530565a'

const l1 = new RESTClient(L1_REST_URL, { chainId: L1_CHAIN_ID })

export type Resolved = {
  initiaAddress: string
  initName: string | null
}

function stripInit(name: string): string {
  return name.endsWith('.init') ? name.slice(0, -'.init'.length) : name
}

function parseMoveOption(raw: unknown): string | null {
  if (!raw) return null
  const data = typeof raw === 'string' ? safeJson(raw) : raw
  if (!data || typeof data !== 'object') return null
  const obj = data as { vec?: unknown[] }
  if (!Array.isArray(obj.vec) || obj.vec.length === 0) return null
  return String(obj.vec[0])
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export async function resolveName(name: string): Promise<string | null> {
  const bare = stripInit(name)
  const res = await l1.move.view(
    L1_USERNAMES_MODULE,
    'usernames',
    'get_address_from_name',
    [],
    [bcs.string().serialize(bare).toBase64()],
  )
  return parseMoveOption(res.data)
}

export async function reverseResolve(address: string): Promise<string | null> {
  const res = await l1.move.view(
    L1_USERNAMES_MODULE,
    'usernames',
    'get_name_from_address',
    [],
    [bcs.address().serialize(address).toBase64()],
  )
  return parseMoveOption(res.data)
}

/**
 * Canonicalize a user-provided identifier.
 * - "alice.init" → resolves on L1
 * - "alice"      → treated as ".init" name
 * - "init1..."   → kept as-is; reverse-resolve the display name
 */
export async function resolve(identifier: string): Promise<Resolved | null> {
  const trimmed = identifier.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('init1')) {
    const name = await reverseResolve(trimmed).catch(() => null)
    return { initiaAddress: trimmed, initName: name }
  }

  const addr = await resolveName(trimmed)
  if (!addr) return null
  return { initiaAddress: addr, initName: stripInit(trimmed) }
}
