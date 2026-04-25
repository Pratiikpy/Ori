/**
 * Barrel export for all UI primitives.
 * Pages should import from `@/components/ui`, never from individual files —
 * keeps refactors centered here.
 */

// New Apple-light primitives
export { Avatar } from './avatar'
export { Button, type ButtonProps } from './button'
export { EmptyState, type EmptyStateProps } from './empty-state'
export { Eyebrow } from './eyebrow'
export { GlassCard, type GlassCardProps } from './glass-card'
export { Icon, type IconName, type IconRef } from './icon'
export { Input, type InputProps } from './input'
export { PageHeader, type PageHeaderProps } from './page-header'

// Restored legacy primitives — used by /gift, /paywall, /portfolio, /squads,
// /streams, /lucky, /create, /agent/[address], /[identifier], etc.
// Don't re-export `Input` from './field' — name clash with the new Input above.
export { Card, CardHeader, CardBody, CardFooter } from './card'
export { Chip } from './chip'
export { Field, Textarea } from './field'
export { OSWindow } from './os-window'
export { Pill } from './pill'
export { Reveal, Serif } from './reveal'
export { SectionHead } from './section-head'
export { Stat, StatRibbon } from './stat'
export { VerifiedBadge } from './verified-badge'
