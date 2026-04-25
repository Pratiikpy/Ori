import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article'
  interactive?: boolean
  children: ReactNode
}

export function Card({
  as: Tag = 'div',
  interactive,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        'bg-white/[0.022] border border-[var(--color-border-strong)] rounded-2xl',
        interactive && 'panel-hover cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'px-6 pt-5 pb-4 border-b border-[var(--color-border)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3',
        className
      )}
    >
      {children}
    </div>
  )
}
