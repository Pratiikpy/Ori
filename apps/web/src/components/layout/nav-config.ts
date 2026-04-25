/**
 * Single source of truth for the signed-in app navigation.
 *
 * Both the desktop sidebar and the mobile drawer render from this list, so
 * adding a route is a one-line change. Order matters — it's what users see.
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
