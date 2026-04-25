/**
 * Navigation — Emergent 5-surface model.
 *
 *   Inbox    → /inbox     — chats + agent control room
 *   Money    → /money     — payments / gifts / streams / subs / paywalls / sponsor
 *   Play     → /play      — wagers / prediction markets / lucky pools
 *   Explore  → /explore   — leaderboards / discover / activity / oracle / squads
 *   Profile  → /profile   — identity / reputation / agent policy / settings
 *
 * Each surface lists every Move-module flow as a card with an "Open flow"
 * button, routing to the existing per-feature page (where the actual
 * contract calls live).
 */
import type { IconName } from '@/components/ui/icon'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  match: (path: string) => boolean
}

export const APP_NAV: NavItem[] = [
  { href: '/inbox',   label: 'Inbox',   icon: 'chats',    match: (p) => p === '/inbox'   || p.startsWith('/chats') || p.startsWith('/chat/') },
  { href: '/money',   label: 'Money',   icon: 'dollar',   match: (p) => p === '/money'   || p.startsWith('/send')  || p.startsWith('/gift')  || p.startsWith('/streams') || p.startsWith('/subscriptions') || p.startsWith('/paywall') },
  { href: '/play',    label: 'Play',    icon: 'predict',  match: (p) => p === '/play'    || p.startsWith('/predict') || p.startsWith('/lucky') },
  { href: '/explore', label: 'Explore', icon: 'eye',      match: (p) => p === '/explore' || p.startsWith('/discover') || p.startsWith('/creators') || p.startsWith('/squads') },
  { href: '/profile', label: 'Profile', icon: 'user',     match: (p) => p === '/profile' || p === '/today' || p === '/settings' || p === '/portfolio' || p.startsWith('/agent/') || p.startsWith('/[identifier]') },
]

// Kept for legacy imports — older sidebar code references MORE_NAV.
export const MORE_NAV: NavItem[] = []
