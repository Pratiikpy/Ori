/**
 * Enum values that MUST stay in sync with Move contract constants.
 * If a Move enum changes, update here AND the contract at the same time.
 */

// ========== gift_packet::theme ==========
export const GIFT_THEME = {
  GENERIC: 0,
  BIRTHDAY: 1,
  THANKS: 2,
  CONGRATS: 3,
  CUSTOM: 4,
} as const
export type GiftTheme = (typeof GIFT_THEME)[keyof typeof GIFT_THEME]

// ========== gift_packet::mode ==========
export const GIFT_MODE = {
  DIRECT: 0,
  LINK: 1,
} as const
export type GiftMode = (typeof GIFT_MODE)[keyof typeof GIFT_MODE]

// ========== achievement_sbt::badge_type ==========
export const BADGE_TYPE = {
  EARLY_USER: 0,
  FIRST_PAYMENT: 1,
  FIRST_TIP: 2,
  FIRST_GIFT: 3,
  THIRTY_DAY_STREAK: 4,
} as const
export type BadgeType = (typeof BADGE_TYPE)[keyof typeof BADGE_TYPE]

export const BADGE_METADATA: Record<BadgeType, { name: string; description: string; emoji: string }> = {
  [BADGE_TYPE.EARLY_USER]: {
    name: 'Founding 100',
    description: 'Among the first 100 people to join Ori.',
    emoji: '🌱',
  },
  [BADGE_TYPE.FIRST_PAYMENT]: {
    name: 'First Payment',
    description: 'Sent your first payment inside a conversation.',
    emoji: '💸',
  },
  [BADGE_TYPE.FIRST_TIP]: {
    name: 'First Tip',
    description: 'Tipped a creator.',
    emoji: '☕',
  },
  [BADGE_TYPE.FIRST_GIFT]: {
    name: 'First Gift',
    description: 'Sent a gift-wrapped payment.',
    emoji: '🎁',
  },
  [BADGE_TYPE.THIRTY_DAY_STREAK]: {
    name: '30-Day Streak',
    description: 'Active in Ori for 30 consecutive days.',
    emoji: '🔥',
  },
}

// ========== wager_escrow::status ==========
export const WAGER_STATUS = {
  PENDING: 0,
  ACTIVE: 1,
  RESOLVED: 2,
  CANCELLED: 3,
} as const
export type WagerStatus = (typeof WAGER_STATUS)[keyof typeof WAGER_STATUS]

// ========== payment_router: platform fee ==========
/** 1% in basis points, matches Move constant. */
export const PLATFORM_FEE_BPS = 100
export const BPS_DENOMINATOR = 10_000

// ========== App-wide constants ==========
/** How long a chat ID is valid/stable — derived client-side from participant pair. */
export const CHAT_ID_LENGTH = 64
/** Max message ciphertext we accept, in bytes. */
export const MAX_CIPHERTEXT_BYTES = 8192
