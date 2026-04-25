/**
 * Single source of truth for the signed-in app navigation.
 *
 * Both the desktop sidebar and the mobile drawer render from this list, so
 * adding a route is a one-line change. Order matters — it's what users see.
 *
 * MORE_NAV holds secondary features (paywalls, gift, prediction markets,
 * squads, etc.) — surfaced under a collapsible "More" section so the primary
 * 6 items stay scannable.
 */
import type { IconName } from '@/components/ui/icon'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  /** Predicate over pathname so nested routes light up the right item */
  match: (path: string) => boolean
}

export const APP_NAV: NavItem[] = [
  {
    href: '/today',
    label: 'Today',
    icon: 'home',
    match: (p) => p === '/today',
  },
  {
    href: '/chats',
    label: 'Chats',
    icon: 'chats',
    match: (p) => p === '/chats' || p.startsWith('/chat/'),
  },
  {
    href: '/send',
    label: 'Send',
    icon: 'send',
    match: (p) => p.startsWith('/send'),
  },
  {
    href: '/predict',
    label: 'Predict',
    icon: 'predict',
    match: (p) => p.startsWith('/predict'),
  },
  {
    href: '/ask',
    label: 'Ask Claude',
    icon: 'sparkle',
    match: (p) => p.startsWith('/ask'),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: 'settings',
    match: (p) => p.startsWith('/settings'),
  },
]

/**
 * Secondary feature surfaces. Rendered in a "More" group below the primary
 * nav. Order roughly matches the demo flow.
 */
export const MORE_NAV: NavItem[] = [
  {
    href: '/portfolio',
    label: 'Portfolio',
    icon: 'wallet',
    match: (p) => p.startsWith('/portfolio'),
  },
  {
    href: '/discover',
    label: 'Discover',
    icon: 'eye',
    match: (p) => p.startsWith('/discover'),
  },
  {
    href: '/creators',
    label: 'Creators',
    icon: 'user',
    match: (p) => p.startsWith('/creators'),
  },
  {
    href: '/paywall/mine',
    label: 'Paywalls',
    icon: 'shield-check',
    match: (p) => p.startsWith('/paywall'),
  },
  {
    href: '/gift',
    label: 'Gift cards',
    icon: 'gift',
    match: (p) => p.startsWith('/gift'),
  },
  {
    href: '/streams',
    label: 'Streams',
    icon: 'lightning',
    match: (p) => p.startsWith('/streams'),
  },
  {
    href: '/subscriptions',
    label: 'Subscriptions',
    icon: 'receipt',
    match: (p) => p.startsWith('/subscriptions'),
  },
  {
    href: '/squads',
    label: 'Squads',
    icon: 'user',
    match: (p) => p.startsWith('/squads'),
  },
  {
    href: '/lucky',
    label: 'Lucky',
    icon: 'sparkle',
    match: (p) => p.startsWith('/lucky'),
  },
  {
    href: '/system',
    label: 'System',
    icon: 'info',
    match: (p) => p.startsWith('/system'),
  },
]
