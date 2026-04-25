/**
 * Icon — single import surface for Phosphor icons.
 *
 * Why a wrapper: Phosphor exposes ~700 icons as named exports, which makes
 * bundle-cost discipline impossible if every component imports directly. We
 * re-export only the icons we actually use, with a consistent default size
 * (20) and weight (regular). To use a new icon, add it to the import block
 * below — that's the choke point that keeps the bundle small.
 *
 * Phosphor's "regular" weight matches the visual rhythm of the Apple-light
 * design language better than "bold" or "fill"; "fill" is reserved for
 * active sidebar items only.
 */
import {
  // Navigation
  House,
  ChatsCircle,
  PaperPlaneTilt,
  ChartLineUp,
  Sparkle,
  Gear,
  // Actions
  Plus,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle,
  X,
  Copy,
  Lightning,
  Eye,
  EyeSlash,
  // Money / objects
  CurrencyCircleDollar,
  Gift,
  Wallet,
  Receipt,
  // Status
  WarningCircle,
  Info,
  Spinner,
  // Identity
  User,
  At,
  ShieldCheck,
  // Mobile chrome
  List,
  // Outbound
  ArrowSquareOut,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'

export type IconName =
  | 'home'
  | 'chats'
  | 'send'
  | 'predict'
  | 'sparkle'
  | 'settings'
  | 'plus'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'check'
  | 'check-circle'
  | 'x'
  | 'copy'
  | 'lightning'
  | 'eye'
  | 'eye-slash'
  | 'dollar'
  | 'gift'
  | 'wallet'
  | 'receipt'
  | 'warning'
  | 'info'
  | 'spinner'
  | 'user'
  | 'at'
  | 'shield-check'
  | 'menu'
  | 'external'

const REGISTRY: Record<IconName, React.ComponentType<IconProps>> = {
  home: House,
  chats: ChatsCircle,
  send: PaperPlaneTilt,
  predict: ChartLineUp,
  sparkle: Sparkle,
  settings: Gear,
  plus: Plus,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  check: Check,
  'check-circle': CheckCircle,
  x: X,
  copy: Copy,
  lightning: Lightning,
  eye: Eye,
  'eye-slash': EyeSlash,
  dollar: CurrencyCircleDollar,
  gift: Gift,
  wallet: Wallet,
  receipt: Receipt,
  warning: WarningCircle,
  info: Info,
  spinner: Spinner,
  user: User,
  at: At,
  'shield-check': ShieldCheck,
  menu: List,
  external: ArrowSquareOut,
}

export interface IconRef {
  name: IconName
  /** px, default 20 */
  size?: number
  /** Phosphor weights — regular (default), bold, fill, duotone */
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
  /** className for color (text-ink, text-accent, etc.) */
  className?: string
}

export function Icon({ name, size = 20, weight = 'regular', className }: IconRef) {
  const Cmp = REGISTRY[name]
  return <Cmp size={size} weight={weight} className={className} />
}
