/**
 * Profile routes.
 *
 *   GET  /v1/profiles/:address  → canonical profile merged from on-chain + cache
 *   POST /v1/profiles/encryption-pubkey  → backend cache of on-chain pubkey (Bearer)
 *
 * The on-chain profile_registry module is authoritative. The cache here is a
 * read-through convenience so we don't hit the Move view function on every
 * profile load.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { getBadgesOnChain, getProfileOnChain, resolveAddressToName } from '../lib/initiaClient.js'
import { bech32 } from 'bech32'

const AddressParam = z.string().regex(/^init1[a-z0-9]+$/)

const PubkeyBody = z.object({
  pubkeyBase64: z.string().min(1).max(128),
})

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  // ─── GET /v1/profiles/:address ───
  app.get('/v1/profiles/:address', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const address = parsed.data

    let cache = await prisma.profileCache.findUnique({ where: { address } })

    // Refresh cache if stale (> 60s) or missing.
    const isStale = !cache || Date.now() - cache.cachedAt.getTime() > 60_000
    if (isStale) {
      try {
        const onchain = await getProfileOnChain(address)
        const initName = cache?.initName ?? (await resolveAddressToName(address).catch(() => null))
        const next = coerceOnChainProfile(onchain)
        cache = await prisma.profileCache.upsert({
          where: { address },
          update: {
            initName,
            bio: next.bio,
            avatarUrl: next.avatarUrl,
            linksJson: next.links,
            hideBalance: next.hideBalance,
            hideActivity: next.hideActivity,
            whitelistOnly: next.whitelistOnly,
            cachedAt: new Date(),
          },
          create: {
            address,
            initName,
            bio: next.bio,
            avatarUrl: next.avatarUrl,
            linksJson: next.links,
            hideBalance: next.hideBalance,
            hideActivity: next.hideActivity,
            whitelistOnly: next.whitelistOnly,
          },
        })
      } catch (err) {
        request.log.warn({ err, address }, 'profile cache refresh failed')
        if (!cache) {
          await reply.status(404).send({ error: 'PROFILE_NOT_FOUND' })
          return
        }
      }
    }

    await reply.send({
      address,
      initName: cache!.initName,
      bio: cache!.bio,
      avatarUrl: cache!.avatarUrl,
      links: cache!.linksJson ?? [],
      hideBalance: cache!.hideBalance,
      hideActivity: cache!.hideActivity,
      whitelistOnly: cache!.whitelistOnly,
    })
  })

  // ─── POST /v1/profiles/encryption-pubkey ───
  app.post(
    '/v1/profiles/encryption-pubkey',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = PubkeyBody.safeParse(request.body)
      if (!parsed.success) {
        await reply.status(400).send({ error: 'VALIDATION_ERROR', issues: parsed.error.issues })
        return
      }
      const user = request.user!
      const pubkey = Buffer.from(parsed.data.pubkeyBase64, 'base64')
      if (pubkey.length !== 32) {
        await reply.status(400).send({ error: 'PUBKEY_INVALID_LENGTH' })
        return
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { encryptionPubkey: pubkey },
      })
      await reply.status(204).send()
    },
  )

  // ─── GET /v1/profiles/:address/badges ───
  app.get('/v1/profiles/:address/badges', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const badges = await getBadgesOnChain(parsed.data)
    await reply.send({
      address: parsed.data,
      badges: badges.map((b) => ({
        badgeType: b.badge_type,
        level: b.level,
        metadataUri: b.metadata_uri,
        mintedAt: new Date(Number(b.minted_at) * 1000).toISOString(),
      })),
    })
  })

  // ─── GET /v1/profiles/:address/encryption-pubkey ───
  app.get('/v1/profiles/:address/encryption-pubkey', async (request, reply) => {
    const parsed = AddressParam.safeParse((request.params as { address: string }).address)
    if (!parsed.success) {
      await reply.status(400).send({ error: 'INVALID_ADDRESS' })
      return
    }
    const address = parsed.data

    // Try DB cache first, fall back to on-chain view fn.
    const user = await prisma.user.findUnique({ where: { initiaAddress: address } })
    if (user?.encryptionPubkey) {
      await reply.send({ pubkeyBase64: Buffer.from(user.encryptionPubkey).toString('base64') })
      return
    }
    // Fallback: dig on-chain.
    try {
      const result = await getProfileOnChain(address)
      const pubkey = extractPubkeyFromOnChain(result)
      if (pubkey && pubkey.length === 32) {
        await prisma.user
          .upsert({
            where: { initiaAddress: address },
            update: { encryptionPubkey: Buffer.from(pubkey) },
            create: {
              initiaAddress: address,
              hexAddress: bech32HexLower(address),
              encryptionPubkey: Buffer.from(pubkey),
            },
          })
          .catch(() => {
            /* best-effort cache write */
          })
        await reply.send({ pubkeyBase64: Buffer.from(pubkey).toString('base64') })
        return
      }
    } catch (err) {
      request.log.warn({ err, address }, 'failed to fetch on-chain pubkey')
    }
    await reply.status(404).send({ error: 'PUBKEY_NOT_SET' })
  })
}

// ---- helpers ----

function coerceOnChainProfile(raw: unknown): {
  bio: string
  avatarUrl: string
  links: Array<{ label: string; url: string }>
  hideBalance: boolean
  hideActivity: boolean
  whitelistOnly: boolean
} {
  const emptyDefault = {
    bio: '',
    avatarUrl: '',
    links: [] as Array<{ label: string; url: string }>,
    hideBalance: false,
    hideActivity: false,
    whitelistOnly: false,
  }
  if (!raw) return emptyDefault
  const data = typeof raw === 'string' ? safeParseJson(raw) : raw
  if (!data || typeof data !== 'object') return emptyDefault
  const obj = data as Record<string, unknown>
  const labels = Array.isArray(obj.link_labels) ? (obj.link_labels as string[]) : []
  const urls = Array.isArray(obj.links) ? (obj.links as string[]) : []
  const links = urls.map((url, i) => ({ label: labels[i] ?? url, url }))
  return {
    bio: typeof obj.bio === 'string' ? obj.bio : '',
    avatarUrl: typeof obj.avatar_url === 'string' ? obj.avatar_url : '',
    links,
    hideBalance: Boolean(obj.hide_balance),
    hideActivity: Boolean(obj.hide_activity),
    whitelistOnly: Boolean(obj.whitelist_only_messages),
  }
}

function extractPubkeyFromOnChain(raw: unknown): Uint8Array | null {
  if (!raw) return null
  const data = typeof raw === 'string' ? safeParseJson(raw) : raw
  if (!data || typeof data !== 'object') return null
  const arr = (data as { encryption_pubkey?: unknown }).encryption_pubkey
  if (!Array.isArray(arr)) return null
  return Uint8Array.from(arr.map((n) => Number(n) & 0xff))
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function bech32HexLower(address: string): string {
  const decoded = bech32.decode(address)
  const bytes = bech32.fromWords(decoded.words)
  return '0x' + Buffer.from(bytes).toString('hex').toLowerCase()
}
