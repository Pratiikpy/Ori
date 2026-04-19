/**
 * Achievement Issuer — watches on-chain events and mints soulbound badges.
 *
 * Source of truth for first-X detection:
 *   - Listens to `TipSent`, `PaymentSent`, `GiftCreated`, `WagerProposed`,
 *     `PaymentRequest`, `BatchPaymentSent` via EventListener's publication
 *     on `ori:event:*` Redis channels.
 *   - For each, if the actor doesn't yet have the corresponding milestone
 *     badge, sign and submit `award_milestone(recipient, BADGE_TYPE)`.
 *
 * Tiered badges (Bronze/Silver/Gold/Platinum for payment counts etc.) are
 * handled by a secondary cadence that queries aggregate counters from the
 * ProfileCache / event tables and calls `award_badge(..., level, uri)` when
 * a threshold is crossed.
 *
 * Idempotency:
 *   - Redis SET `issuer:minting:<addr>:<badgeType>:<level>` with a 5-minute
 *     TTL as in-flight lock — a spike of events can't spawn dupes.
 *   - On-chain `award_badge` aborts on dupes (E_ALREADY_AWARDED).
 */
import IORedis from 'ioredis'
import { bcs } from '@initia/initia.js'
import { config } from '../config.js'
import { getMoveSigner, sendMoveExecute, issuerAddress } from './moveSigner.js'
import { redis } from '../lib/redis.js'

/**
 * Keep in lockstep with `ori::achievement_sbt` constants. Changing here
 * without updating Move (or vice-versa) will silently misroute mints.
 */
export const BADGE_TYPE = {
  EARLY_USER: 0,
  FIRST_PAYMENT: 1,
  FIRST_TIP: 2,
  FIRST_GIFT: 3,
  THIRTY_DAY_STREAK: 4,
  FIRST_WAGER: 5,
  FIRST_REQUEST: 6,
  FIRST_SPLIT: 7,
  FIRST_CLAIM: 8,
  FIRST_SUB: 9,
  FOUNDING_100: 10,
  FOUNDING_1000: 11,

  PAYMENTS: 20,
  TIPS_GIVEN: 21,
  TIPS_RECEIVED: 22,
  GIFTS_SENT: 23,
  GIFTS_CLAIMED: 24,
  WAGERS_WON: 25,
  BILLS_SPLIT: 26,
  REFERRALS: 27,
  STREAK: 28,
} as const

export type BadgeType = (typeof BADGE_TYPE)[keyof typeof BADGE_TYPE]

const CHANNEL_PAYMENT = 'ori:event:payment'
const CHANNEL_TIP = 'ori:event:tip'
const CHANNEL_GIFT = 'ori:event:gift_created'
const CHANNEL_WAGER = 'ori:event:wager_proposed'
const CHANNEL_BATCH = 'ori:event:batch_payment'
const LOCK_TTL_SECONDS = 300

const ALL_CHANNELS = [CHANNEL_PAYMENT, CHANNEL_TIP, CHANNEL_GIFT, CHANNEL_WAGER, CHANNEL_BATCH] as const

export class AchievementIssuer {
  private running = false
  private subscriber: IORedis | null = null

  private constructor(private readonly issuerAddr: string) {}

  static async create(_mnemonic: string): Promise<AchievementIssuer> {
    await getMoveSigner()
    const addr = await issuerAddress()
    return new AchievementIssuer(addr)
  }

  start(): void {
    if (this.running) return
    this.running = true
    void this.run()
  }

  async stop(): Promise<void> {
    this.running = false
    if (this.subscriber) {
      try {
        await this.subscriber.unsubscribe(...ALL_CHANNELS)
      } catch {
        /* noop */
      }
      this.subscriber.disconnect()
      this.subscriber = null
    }
  }

  private async run(): Promise<void> {
    this.subscriber = new IORedis(config.REDIS_URL)
    await this.subscriber.subscribe(...ALL_CHANNELS)

    this.subscriber.on('message', (channel, raw) => {
      void this.handleMessage(channel, raw).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[issuer] handler error', err)
      })
    })
  }

  private async handleMessage(channel: string, raw: string): Promise<void> {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return
    }

    if (channel === CHANNEL_PAYMENT) {
      const from = String(data.from ?? '')
      if (!from.startsWith('init1')) return
      await this.maybeMintMilestone(from, BADGE_TYPE.FIRST_PAYMENT)
      return
    }
    if (channel === CHANNEL_TIP) {
      const tipper = String(data.tipper ?? '')
      const creator = String(data.creator ?? '')
      if (tipper.startsWith('init1')) {
        await this.maybeMintMilestone(tipper, BADGE_TYPE.FIRST_TIP)
      }
      if (creator.startsWith('init1')) {
        // No "first tip received" milestone — tiers in BADGE_TYPE.TIPS_RECEIVED
        // are handled by the counter-based tiered issuer.
      }
      return
    }
    if (channel === CHANNEL_GIFT) {
      const sender = String(data.sender ?? '')
      if (!sender.startsWith('init1')) return
      await this.maybeMintMilestone(sender, BADGE_TYPE.FIRST_GIFT)
      return
    }
    if (channel === CHANNEL_WAGER) {
      const proposer = String(data.proposer ?? '')
      if (!proposer.startsWith('init1')) return
      await this.maybeMintMilestone(proposer, BADGE_TYPE.FIRST_WAGER)
      return
    }
    if (channel === CHANNEL_BATCH) {
      const from = String(data.from ?? '')
      if (!from.startsWith('init1')) return
      await this.maybeMintMilestone(from, BADGE_TYPE.FIRST_SPLIT)
      return
    }
  }

  /**
   * Mint a milestone (level 0, no metadata URI). Uses `award_milestone` which
   * internally delegates to `award_badge(..., 0, "")`.
   */
  private async maybeMintMilestone(recipient: string, badgeType: BadgeType): Promise<void> {
    await this.maybeMintAt(recipient, badgeType, 0, '')
  }

  /**
   * Mint a specific (type, level). Public so the tiered issuer can use it.
   */
  async maybeMintAt(
    recipient: string,
    badgeType: BadgeType,
    level: number,
    metadataUri: string,
  ): Promise<void> {
    const lockKey = `issuer:minting:${recipient}:${badgeType}:${level}`
    const acquired = await redis.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX')
    if (!acquired) return

    try {
      if (level === 0 && metadataUri === '') {
        await sendMoveExecute(
          {
            moduleAddress: config.ORI_MODULE_ADDRESS,
            moduleName: 'achievement_sbt',
            functionName: 'award_milestone',
            typeArgs: [],
            args: [
              bcs.address().serialize(recipient).toBase64(),
              bcs.u8().serialize(badgeType).toBase64(),
            ],
          },
          300_000,
        )
        return
      }
      await sendMoveExecute(
        {
          moduleAddress: config.ORI_MODULE_ADDRESS,
          moduleName: 'achievement_sbt',
          functionName: 'award_badge',
          typeArgs: [],
          args: [
            bcs.address().serialize(recipient).toBase64(),
            bcs.u8().serialize(badgeType).toBase64(),
            bcs.u8().serialize(level).toBase64(),
            bcs.string().serialize(metadataUri).toBase64(),
          ],
        },
        300_000,
      )
    } catch (err) {
      const msg = (err as Error).message
      if (/E_ALREADY_AWARDED|80003/i.test(msg)) return
      // eslint-disable-next-line no-console
      console.warn('[issuer] mint failed', { recipient, badgeType, level, err: msg })
    }
  }

  getIssuerAddress(): string {
    return this.issuerAddr
  }
}
