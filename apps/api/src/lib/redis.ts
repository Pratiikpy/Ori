import IORedis from 'ioredis'
import { config } from '../config.js'

export const redis = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
})

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[redis] error:', err.message)
})

/**
 * Presence TTL helpers — each heartbeat refreshes the key for 30s.
 */
const PRESENCE_TTL_SECONDS = 30

export async function setPresence(initiaAddress: string): Promise<void> {
  await redis.set(
    `presence:${initiaAddress}`,
    JSON.stringify({ status: 'online', ts: Date.now() }),
    'EX',
    PRESENCE_TTL_SECONDS,
  )
}

export async function clearPresence(initiaAddress: string): Promise<void> {
  await redis.del(`presence:${initiaAddress}`)
}

export async function isOnline(initiaAddress: string): Promise<boolean> {
  const v = await redis.get(`presence:${initiaAddress}`)
  return v !== null
}
