'use client'

/**
 * Shared implementation for /{id}/followers and /{id}/following pages.
 *
 * The only difference between modes is which endpoint is paginated; the list
 * shape and rendering are identical.
 */
import { useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { useResolve } from '@/hooks/use-resolve'
import {
  getFollowers,
  getFollowing,
  type FollowListPage as FollowListPageT,
} from '@/lib/api'

type Mode = 'followers' | 'following'

export function FollowListPage({ mode }: { mode: Mode }) {
  const { identifier } = useParams<{ identifier: string }>()
  const decoded = useMemo(() => decodeURIComponent(identifier ?? ''), [identifier])
  const { data: resolved } = useResolve(decoded)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['follow-list', mode, resolved?.initiaAddress],
    queryFn: ({ pageParam }) => {
      const fn = mode === 'followers' ? getFollowers : getFollowing
      return fn(resolved!.initiaAddress, { cursor: pageParam as string | undefined, limit: 50 })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: FollowListPageT) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(resolved?.initiaAddress),
    staleTime: 30_000,
  })

  const entries = data?.pages.flatMap((p) => p.entries) ?? []
  const title = mode === 'followers' ? 'Followers' : 'Following'

  return (
    <AppShell title={title} hideNav>
      <div className="border-b border-border px-4 h-12 flex items-center gap-2">
        <Link
          href={`/${encodeURIComponent(decoded)}`}
          aria-label="Back"
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <span className="font-medium">
          {resolved?.initName ?? decoded}
          <span className="text-muted-foreground"> · {title}</span>
        </span>
      </div>

      <div className="max-w-md mx-auto w-full px-4 py-4 space-y-2">
        {isLoading && (
          <div className="text-xs text-muted-foreground">Reading the social graph…</div>
        )}
        {!isLoading && entries.length === 0 && (
          <div className="text-xs text-muted-foreground">
            {mode === 'followers'
              ? 'No followers yet. Share your .init handle — it doubles as a payment address.'
              : 'Not following anyone yet. Tap a profile to follow and surface their activity here.'}
          </div>
        )}

        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.address}>
              <Link
                href={`/${encodeURIComponent(e.address)}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-3 py-2 hover:border-primary/40 transition"
              >
                <Avatar seed={e.address} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono truncate">
                    {e.address.slice(0, 14)}…{e.address.slice(-6)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {relativeTime(e.followedAt)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {hasNextPage && (
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full rounded-xl py-2 bg-muted border border-border text-xs disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </AppShell>
  )
}

function Avatar({ seed }: { seed: string }) {
  const hash = Array.from(seed).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)
  const h1 = hash % 360
  const h2 = (h1 + 60) % 360
  return (
    <div
      className="w-9 h-9 rounded-xl flex-none"
      style={{ background: `linear-gradient(135deg, hsl(${h1} 60% 50%), hsl(${h2} 60% 40%))` }}
      aria-hidden
    />
  )
}

function relativeTime(at: string): string {
  const mins = Math.floor((Date.now() - new Date(at).getTime()) / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
