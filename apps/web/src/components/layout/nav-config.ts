/**
 * Navigation — Emergent 5-surface model.
 *
 *   Inbox    → /inbox     — chats + agent control room
 *   Money    → /money     — payments / gifts / streams / subs / paywalls / sponsor
 *   Play     → /play      — wagers / prediction markets / lucky pools
 *   Explore  → /explore   — leaderboards / discover / activity / oracle / squads
 *   Profile  → /profile   — identity / reputation / agent policy / settings
 *
 * `icon` is narrowed to the 5 surface keys — the new sidebar/mobile-nav
 * use inline-SVG glyphs keyed by these strings (not the broader Phosphor
 * IconName from `@/components/ui/icon`).
 */

export type SurfaceIcon = 'inbox' | 'money' | 'play' | 'explore' | 'profile'

export interface NavItem {
  href: string
  label: string
  icon: SurfaceIcon
  match: (path: string) => boolean
}

export const APP_NAV: NavItem[] = [
  { href: '/inbox',   label: 'Inbox',   icon: 'inbox',   match: (p) => p === '/inbox'   || p.startsWith('/chats') || p.startsWith('/chat/') },
  { href: '/money',   label: 'Money',   icon: 'money',   match: (p) => p === '/money'   || p.startsWith('/send')  || p.startsWith('/gift')  || p.startsWith('/streams') || p.startsWith('/subscriptions') || p.startsWith('/paywall') },
  { href: '/play',    label: 'Play',    icon: 'play',    match: (p) => p === '/play'    || p.startsWith('/predict') || p.startsWith('/lucky') },
  { href: '/explore', label: 'Explore', icon: 'explore', match: (p) => p === '/explore' || p.startsWith('/discover') || p.startsWith('/creators') || p.startsWith('/squads') },
  { href: '/profile', label: 'Profile', icon: 'profile', match: (p) => p === '/profile' || p === '/today' || p === '/settings' || p === '/portfolio' || p.startsWith('/agent/') || p.startsWith('/[identifier]') },
]

/** Kept for legacy imports — older sidebar code references MORE_NAV. */
export const MORE_NAV: NavItem[] = []
