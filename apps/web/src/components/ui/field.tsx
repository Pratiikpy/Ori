'use client'

import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">
          {label}
        </span>
      )}
      {children}
      {error && (
        <span className="mt-1.5 block text-[12px] text-[var(--color-danger)]">
          {error}
        </span>
      )}
      {!error && hint && (
        <span className="mt-1.5 block text-[12px] text-ink-3">{hint}</span>
      )}
    </label>
  )
}

const inputBase =
  'w-full bg-white/[0.03] border border-[var(--color-border-strong)] rounded-xl ' +
  'px-4 py-3 text-[14px] text-foreground placeholder:text-ink-4 ' +
  'transition focus:outline-none focus:border-primary/60 focus:bg-white/[0.045] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...rest} />
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputBase, 'resize-none min-h-[84px]', className)}
      {...rest}
    />
  )
}
