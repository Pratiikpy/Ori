/**
 * Badge metadata — labels, icons, descriptions, and tier styling.
 *
 * Ordinals MUST match `ori::achievement_sbt` constants. If you add a new
 * badge_type in Move, add it here too. Frontend renders nothing for
 * unrecognized types (handled by `getBadgeMeta`'s fallback).
 *
 * Level semantics:
 *   0 = milestone (one-shot badge, no tier ring)
 *   1 = Bronze, 2 = Silver, 3 = Gold, 4 = Platinum
 */
import type { LucideIcon } from 'lucide-react'
import {
  Sparkles,
  Zap,
  Heart,
  Gift,
  Flame,
  Scale,
  HandCoins,
  Users,
  PackageOpen,
  Repeat,
  Trophy,
  Award,
  Crown,
  ChartPie,
  Split,
  UserPlus,
} from 'lucide-react'

export type BadgeMeta = {
  id: number
  label: string
  description: string
  Icon: LucideIcon
  /** Tailwind class for the accent color of this badge. */
  accent: string
  /** True if this badge is tiered (levels 1..4). */
  tiered: boolean
}

export const BADGE_META: Record<number, BadgeMeta> = {
  // ── Milestones (level 0) ─────────────────────────────
  0: {
    id: 0,
    label: 'Early User',
    description: 'One of the first to onboard to Ori.',
    Icon: Sparkles,
    accent: 'text-primary bg-primary/10 border-primary/30',
    tiered: false,
  },
  1: {
    id: 1,
    label: 'First Payment',
    description: 'Sent your first in-chat payment.',
    Icon: Zap,
    accent: 'text-success bg-success/10 border-success/30',
    tiered: false,
  },
  2: {
    id: 2,
    label: 'First Tip',
    description: 'Tipped a creator — 99% goes to them.',
    Icon: Heart,
    accent: 'text-[#ec4899] bg-[#ec4899]/10 border-[#ec4899]/30',
    tiered: false,
  },
  3: {
    id: 3,
    label: 'First Gift',
    description: 'Wrapped a payment as a gift packet.',
    Icon: Gift,
    accent: 'text-warning bg-warning/10 border-warning/30',
    tiered: false,
  },
  4: {
    id: 4,
    label: '30-Day Streak',
    description: 'Active on Ori for 30 days straight.',
    Icon: Flame,
    accent: 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/30',
    tiered: false,
  },
  5: {
    id: 5,
    label: 'First Wager',
    description: 'Proposed a friendly bet.',
    Icon: Scale,
    accent: 'text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/30',
    tiered: false,
  },
  6: {
    id: 6,
    label: 'First Request',
    description: 'Requested money in a conversation.',
    Icon: HandCoins,
    accent: 'text-warning bg-warning/10 border-warning/30',
    tiered: false,
  },
  7: {
    id: 7,
    label: 'First Split',
    description: 'Split a bill with friends.',
    Icon: Split,
    accent: 'text-accent bg-accent/10 border-accent/30',
    tiered: false,
  },
  8: {
    id: 8,
    label: 'First Claim',
    description: 'Claimed a gift link from a friend.',
    Icon: PackageOpen,
    accent: 'text-success bg-success/10 border-success/30',
    tiered: false,
  },
  9: {
    id: 9,
    label: 'First Sub',
    description: 'Subscribed to a creator.',
    Icon: Repeat,
    accent: 'text-primary bg-primary/10 border-primary/30',
    tiered: false,
  },
  10: {
    id: 10,
    label: 'Founding 100',
    description: 'One of the first 100 onboarded.',
    Icon: Crown,
    accent: 'text-warning bg-warning/10 border-warning/30',
    tiered: false,
  },
  11: {
    id: 11,
    label: 'Founding 1000',
    description: 'Onboarded before the 1,000-user mark.',
    Icon: Award,
    accent: 'text-warning bg-warning/10 border-warning/30',
    tiered: false,
  },

  // ── Tiered (levels 1..4) ─────────────────────────────
  20: {
    id: 20,
    label: 'Payments',
    description: 'Number of in-chat payments sent.',
    Icon: Zap,
    accent: 'text-success bg-success/10 border-success/30',
    tiered: true,
  },
  21: {
    id: 21,
    label: 'Tipper',
    description: 'Creators you have tipped.',
    Icon: Heart,
    accent: 'text-[#ec4899] bg-[#ec4899]/10 border-[#ec4899]/30',
    tiered: true,
  },
  22: {
    id: 22,
    label: 'Tip Magnet',
    description: 'Tips received from fans.',
    Icon: Trophy,
    accent: 'text-warning bg-warning/10 border-warning/30',
    tiered: true,
  },
  23: {
    id: 23,
    label: 'Gifter',
    description: 'Gifts sent.',
    Icon: Gift,
    accent: 'text-warning bg-warning/10 border-warning/30',
    tiered: true,
  },
  24: {
    id: 24,
    label: 'Claimer',
    description: 'Gift links claimed.',
    Icon: PackageOpen,
    accent: 'text-success bg-success/10 border-success/30',
    tiered: true,
  },
  25: {
    id: 25,
    label: 'Winner',
    description: 'Wagers won.',
    Icon: Trophy,
    accent: 'text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/30',
    tiered: true,
  },
  26: {
    id: 26,
    label: 'Splitter',
    description: 'Bills split.',
    Icon: ChartPie,
    accent: 'text-accent bg-accent/10 border-accent/30',
    tiered: true,
  },
  27: {
    id: 27,
    label: 'Recruiter',
    description: 'Friends onboarded via your links.',
    Icon: UserPlus,
    accent: 'text-primary bg-primary/10 border-primary/30',
    tiered: true,
  },
  28: {
    id: 28,
    label: 'Streak',
    description: 'Consecutive days active on Ori.',
    Icon: Flame,
    accent: 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/30',
    tiered: true,
  },
}

export const LEVEL_LABEL: Record<number, string> = {
  0: '',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
}

export const LEVEL_RING: Record<number, string> = {
  0: '',
  1: 'ring-1 ring-[#cd7f32]',
  2: 'ring-1 ring-[#c0c0c0]',
  3: 'ring-2 ring-[#ffd700]',
  4: 'ring-2 ring-[#7ad9f7] ring-offset-1 ring-offset-background',
}

export function getBadgeMeta(badgeType: number): BadgeMeta {
  return (
    BADGE_META[badgeType] ?? {
      id: badgeType,
      label: `Badge #${badgeType}`,
      description: 'A rare Ori badge.',
      Icon: Sparkles,
      accent: 'text-muted-foreground bg-muted border-border',
      tiered: false,
    }
  )
}

export function allBadgeMeta(): BadgeMeta[] {
  return Object.values(BADGE_META).sort((a, b) => a.id - b.id)
}

/**
 * Tier thresholds by badge type. Used by the backend tiered-issuer to decide
 * when to mint a new level given an aggregate counter. Kept in the frontend
 * too for display ("3/10 toward Silver").
 */
export const TIER_THRESHOLDS: Record<number, { bronze: number; silver: number; gold: number; platinum: number }> = {
  20: { bronze: 1, silver: 10, gold: 50, platinum: 250 },   // Payments
  21: { bronze: 1, silver: 10, gold: 50, platinum: 250 },   // Tipper
  22: { bronze: 1, silver: 10, gold: 100, platinum: 1000 }, // Tip Magnet
  23: { bronze: 1, silver: 5, gold: 25, platinum: 100 },    // Gifter
  24: { bronze: 1, silver: 5, gold: 25, platinum: 100 },    // Claimer
  25: { bronze: 1, silver: 5, gold: 25, platinum: 100 },    // Winner
  26: { bronze: 1, silver: 5, gold: 25, platinum: 100 },    // Splitter
  27: { bronze: 1, silver: 5, gold: 25, platinum: 100 },    // Recruiter
  28: { bronze: 7, silver: 30, gold: 100, platinum: 365 },  // Streak (days)
}

export function thresholdFor(badgeType: number, level: number): number | null {
  const t = TIER_THRESHOLDS[badgeType]
  if (!t) return null
  if (level === 1) return t.bronze
  if (level === 2) return t.silver
  if (level === 3) return t.gold
  if (level === 4) return t.platinum
  return null
}
