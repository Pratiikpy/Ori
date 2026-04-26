import { cn } from '@/lib/cn'

/**
 * Reusable skeleton primitive. Use wherever a fetch is in flight and we
 * want to avoid layout shift on resolve. Prefer this over plain
 * `Loading…` text.
 *
 * Style choice: rounded-none + a subtle black/6% pulse, matching the
 * brutalist Swiss aesthetic the rest of the app uses (sharp borders, no
 * radii). Replaces three inconsistent inline skeleton styles that lived
 * across Money / Play / Explore — the audit flagged that mismatch as a
 * polish leak.
 */
export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-none bg-black/[.06]', className)}
      data-testid="skeleton"
      {...rest}
    />
  )
}

/**
 * Multi-line text placeholder. The last line shrinks to 2/3 width to
 * read like a real paragraph rather than a uniform block.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)} data-testid="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

/** Card-shaped placeholder for grids of fetch-bound articles. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn('border border-black/10 bg-white p-5', className)}
      data-testid="skeleton-card"
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-6 w-2/3" />
      <SkeletonText lines={2} className="mt-4" />
    </div>
  )
}
