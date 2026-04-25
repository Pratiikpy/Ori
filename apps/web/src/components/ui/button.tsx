'use client'

/**
 * Button — the canonical pill button.
 *
 * Three variants, one shape (rounded-full), one height system (sm = h-9,
 * md = h-12, lg = h-14). Every CTA in the app uses this — never raw
 * `<button class="bg-...">`. That uniformity is what carries the design.
 *
 * Variants:
 *   primary    — black (#1D1D1F) on light. The Apple-style hero CTA.
 *   secondary  — black/5 wash with ink text. Default action.
 *   ghost      — text-only, no surface. For tertiary "link" actions.
 *   accent     — Apple-blue (#007AFF). For active state / confirmation
 *                / destructive-alternative actions.
 *   danger     — muted red on white. Reserved for destructive ops.
 *
 * Active-press scale is 0.97 (subtle, iOS-native feel). Hover lifts -1px
 * for desktop pointer; mobile gets the active-scale only.
 */
import * as React from 'react'
import Link from 'next/link'
import { Icon, type IconName } from './icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
type Size = 'sm' | 'md' | 'lg'

// Icon props accept either IconName (new system) OR ReactNode (legacy callers
// pass JSX like <Sparkles />). Aliases `leftIcon` / `rightIcon` are kept for
// backwards compat with the legacy pages restored from /_legacy.
//
// `href` makes the Button polymorphic — render as a Next <Link> when set, so
// legacy callsites like <Button href="/paywall/new">New paywall</Button> keep
// working. External hrefs (http*) still go through Link.
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leadingIcon?: IconName | React.ReactNode
  trailingIcon?: IconName | React.ReactNode
  /** @deprecated alias for leadingIcon — keeps legacy pages building */
  leftIcon?: IconName | React.ReactNode
  /** @deprecated alias for trailingIcon — keeps legacy pages building */
  rightIcon?: IconName | React.ReactNode
  fullWidth?: boolean
  /** When set, renders as a Next.js Link instead of a <button> */
  href?: string
  /** native button type, when not rendering as link */
  type?: 'button' | 'submit' | 'reset'
  /** anchor target — only meaningful when href is set */
  target?: string
  /** anchor rel — only meaningful when href is set */
  rel?: string
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-[#1D1D1F] text-white hover:bg-black active:bg-black active:scale-[0.97]',
  secondary:
    'bg-black/5 text-ink hover:bg-black/10 active:bg-black/15 active:scale-[0.97]',
  ghost:
    'bg-transparent text-ink-2 hover:text-ink hover:bg-black/5 active:scale-[0.97]',
  accent:
    'bg-[#007AFF] text-white hover:bg-[#0066CC] active:scale-[0.97]',
  danger:
    'bg-[#B91C1C] text-white hover:bg-[#991818] active:scale-[0.97]',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-9  px-4 text-[13px] gap-1.5',
  md: 'h-12 px-6 text-[14px] gap-2',
  lg: 'h-14 px-7 text-[15px] gap-2.5',
}

function renderIcon(slot: IconName | React.ReactNode | undefined) {
  if (!slot) return null
  if (typeof slot === 'string') return <Icon name={slot as IconName} size={16} />
  return <span className="inline-flex">{slot}</span>
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leadingIcon,
  trailingIcon,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  href,
  target,
  rel,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading
  const lead = leadingIcon ?? leftIcon
  const trail = trailingIcon ?? rightIcon
  const cls = [
    'inline-flex items-center justify-center rounded-full font-medium',
    'transition-[background-color,transform,opacity] duration-150',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
    'will-change-transform cursor-pointer',
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      {loading ? (
        <Icon name="spinner" size={16} className="animate-spin" />
      ) : (
        renderIcon(lead)
      )}
      <span>{children}</span>
      {!loading && renderIcon(trail)}
    </>
  )

  // Polymorphic: render as Link when href is provided
  if (href && !isDisabled) {
    const isExternal = /^https?:\/\//.test(href) || target === '_blank'
    if (isExternal) {
      return (
        <a
          href={href}
          target={target ?? '_blank'}
          rel={rel ?? 'noopener noreferrer'}
          className={cls}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {inner}
        </a>
      )
    }
    return (
      <Link
        href={href}
        target={target}
        rel={rel}
        className={cls}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cls}
      {...rest}
    >
      {inner}
    </button>
  )
}
