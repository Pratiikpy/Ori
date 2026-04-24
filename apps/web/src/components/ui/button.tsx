'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Common {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
  children?: ReactNode
}

type ButtonProps = Common &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }

type LinkProps = Common & {
  href: string
  target?: string
  rel?: string
  type?: undefined
  disabled?: boolean
  onClick?: undefined
}

export type UiButtonProps = ButtonProps | LinkProps

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-full ' +
  'transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] ' +
  'disabled:opacity-50 disabled:pointer-events-none select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright/60 focus-visible:ring-offset-0'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-accent-2 hover:-translate-y-px shadow-[0_6px_30px_-10px_rgba(108,123,255,0.55)]',
  secondary:
    'bg-transparent text-foreground border border-[var(--color-border-emphasis)] hover:bg-white/[0.035] hover:border-ink-3',
  ghost:
    'bg-transparent text-ink-2 hover:text-foreground hover:bg-white/[0.03]',
  danger:
    'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/20',
}

const sizes: Record<Size, string> = {
  sm: 'text-[12.5px] h-8 px-3.5',
  md: 'text-[13.5px] h-10 px-5',
  lg: 'text-[14.5px] h-12 px-7',
}

export const Button = forwardRef<HTMLButtonElement, UiButtonProps>(function Button(
  props,
  ref
) {
  const {
    variant = 'primary',
    size = 'md',
    loading,
    leftIcon,
    rightIcon,
    className,
    children,
    ...rest
  } = props as Common & Record<string, unknown>

  const classes = cn(base, variants[variant], sizes[size], className)
  const content = (
    <>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  )

  if ('href' in rest && typeof rest.href === 'string') {
    const { href, target, rel, disabled, ...anchor } = rest as LinkProps
    if (disabled) {
      return (
        <span className={cn(classes, 'pointer-events-none opacity-50')} aria-disabled>
          {content}
        </span>
      )
    }
    return (
      <Link href={href} target={target} rel={rel} className={classes} {...(anchor as object)}>
        {content}
      </Link>
    )
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={loading || (rest as ButtonProps).disabled}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  )
})
