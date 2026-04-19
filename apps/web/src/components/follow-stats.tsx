'use client'

/**
 * FollowStats — followers / following counters with links to list pages.
 *
 * Values come from the backend's UserStats row (incremented by the
 * follow-graph event listener). Refreshes every 30 s.
 */
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getFollowStats, type FollowStats as FollowStatsT } from '@/lib/api'

type Props = {
  address: string
}

export function FollowStats({ address }: Props) {
  const { data } = useQuery<FollowStatsT>({
    queryKey: ['follow-stats', address],
    queryFn: () => getFollowStats(address),
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  const followers = data?.followers ?? 0
  const following = data?.following ?? 0
  const encoded = encodeURIComponent(address)

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link
        href={`/${encoded}/followers`}
        className="hover:text-primary transition"
      >
        <span className="font-semibold">{followers}</span>{' '}
        <span className="text-muted-foreground">{followers === 1 ? 'follower' : 'followers'}</span>
      </Link>
      <Link
        href={`/${encoded}/following`}
        className="hover:text-primary transition"
      >
        <span className="font-semibold">{following}</span>{' '}
        <span className="text-muted-foreground">following</span>
      </Link>
    </div>
  )
}
