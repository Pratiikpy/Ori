/**
 * Ori's thin client over Initia RPC + REST.
 *
 * Used for:
 *   - Querying Move view functions (profile, badges, etc.) on the Ori rollup
 *   - Resolving .init usernames via the L1 usernames module
 *   - Polling for on-chain events that drive server-side logic
 *     (badge auto-minting, OBS tip overlays, payment-link claim confirmation)
 *
 * We use @initia/initia.js RESTClient + raw JSON-RPC for tx-level polling.
 */
import { RESTClient, bcs } from '@initia/initia.js'
import { config } from '../config.js'

/** REST client for the Ori rollup. */
export const oriRest = new RESTClient(config.ORI_REST_URL, {
  chainId: config.CHAIN_ID,
})

/** REST client for Initia L1 (where .init usernames live). */
export const l1Rest = new RESTClient(config.L1_REST_URL, {
  chainId: config.L1_CHAIN_ID,
})

/**
 * Resolve a .init name to its address via the L1 usernames module.
 * Returns null if the name isn't registered.
 *
 * Ref: initia-docs/developers/developer-guides/integrating-initia-apps/usernames.mdx
 */
export async function resolveInitName(name: string): Promise<string | null> {
  try {
    const result = await l1Rest.move.view(
      config.L1_USERNAMES_MODULE,
      'usernames',
      'get_address_from_name',
      [],
      [bcs.string().serialize(name).toBase64()],
    )
    // The result.data is the Option<address>. Empty option → null.
    if (!result.data || result.data === 'null' || result.data === '[]') return null
    const parsed = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
    if (!parsed || !parsed.vec || parsed.vec.length === 0) return null
    return String(parsed.vec[0])
  } catch {
    return null
  }
}

/**
 * Reverse-resolve: address → .init name. Returns null if none registered.
 */
export async function resolveAddressToName(address: string): Promise<string | null> {
  try {
    const result = await l1Rest.move.view(
      config.L1_USERNAMES_MODULE,
      'usernames',
      'get_name_from_address',
      [],
      [bcs.address().serialize(address).toBase64()],
    )
    if (!result.data || result.data === 'null') return null
    const parsed = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
    if (!parsed || !parsed.vec || parsed.vec.length === 0) return null
    return String(parsed.vec[0])
  } catch {
    return null
  }
}

/**
 * Fetch a user's profile from the Ori rollup's profile_registry module.
 */
export async function getProfileOnChain(address: string): Promise<unknown | null> {
  try {
    const result = await oriRest.move.view(
      config.ORI_MODULE_ADDRESS,
      'profile_registry',
      'get_profile',
      [],
      [bcs.address().serialize(address).toBase64()],
    )
    return result.data
  } catch {
    return null
  }
}

/**
 * Fetch a user's achievement badges (SBTs) from the Ori rollup.
 * Returns [] if the user has no badges yet. Each Badge has `badge_type` and
 * `minted_at` fields matching the Move resource layout.
 */
export type OnChainBadge = {
  badge_type: number
  level: number
  metadata_uri: string
  minted_at: string
}

export async function getBadgesOnChain(address: string): Promise<OnChainBadge[]> {
  try {
    const result = await oriRest.move.view(
      config.ORI_MODULE_ADDRESS,
      'achievement_sbt',
      'get_badges',
      [],
      [bcs.address().serialize(address).toBase64()],
    )
    const parsed = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((b) => {
        if (!b || typeof b !== 'object') return null
        const obj = b as Record<string, unknown>
        const bt = Number(obj.badge_type ?? obj.badgeType ?? -1)
        const lvl = Number(obj.level ?? 0)
        const uri = String(obj.metadata_uri ?? obj.metadataUri ?? '')
        const ts = String(obj.minted_at ?? obj.mintedAt ?? '0')
        if (!Number.isFinite(bt) || bt < 0) return null
        return { badge_type: bt, level: lvl, metadata_uri: uri, minted_at: ts }
      })
      .filter((x): x is OnChainBadge => x !== null)
  } catch {
    return []
  }
}

/**
 * Fetch a user's encryption pubkey from the Ori rollup.
 * Returns empty bytes if not set.
 */
export async function getEncryptionPubkey(address: string): Promise<Uint8Array> {
  try {
    const result = await oriRest.move.view(
      config.ORI_MODULE_ADDRESS,
      'profile_registry',
      'get_encryption_pubkey',
      [],
      [bcs.address().serialize(address).toBase64()],
    )
    if (typeof result.data === 'string') {
      // hex-encoded or JSON-encoded bytes
      const stripped = result.data.replace(/^"(.*)"$/, '$1')
      if (stripped.startsWith('0x')) {
        return Uint8Array.from(Buffer.from(stripped.slice(2), 'hex'))
      }
    }
    return new Uint8Array(0)
  } catch {
    return new Uint8Array(0)
  }
}
