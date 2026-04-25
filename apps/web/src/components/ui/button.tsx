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
import { Icon, type IconName } from './icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leadingIcon?: IconName
  trailingIcon?: IconName
  fullWidth?: boolean
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

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leadingIcon,
  trailingIcon,
  fullWidth,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type="button"
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center rounded-full font-medium',
        'transition-[background-color,transform,opacity] duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'will-change-transform',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <Icon name="spinner" size={16} className="animate-spin" />
      ) : leadingIcon ? (
        <Icon name={leadingIcon} size={16} />
      ) : null}
      <span>{children}</span>
      {!loading && trailingIcon ? <Icon name={trailingIcon} size={16} /> : null}
    </button>
  )
}
