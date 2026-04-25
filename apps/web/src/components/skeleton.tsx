import { cn } from '@/lib/cn'

/**
 * Reusable skeleton primitive. Use wherever a fetch is in flight and we want
 * to avoid layout shift on resolve. Prefer this over plain `Loading…` text.
 *
 * The `animate-pulse` drives the shimmer; the `bg-muted` matches our dark
 * theme so it reads as a placeholder rather than a broken element.
 */
export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...rest}
    />
  )
}
