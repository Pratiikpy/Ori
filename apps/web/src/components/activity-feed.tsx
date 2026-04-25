'use client'

/**
 * ActivityFeed — reverse-chron timeline of tips / payments / follows.
 *
 * Indexed and merged by `/v1/profiles/:address/activity`. Pagination is
 * cursor-based on createdAt. No aggregation: each row is one event.
 */
import Link from 'next/link'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  Heart,
  Zap,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'
import { getActivityFeed, type ActivityEntry } from '@/lib/api'
import { ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'

type Props = {
  address: string
}

export function ActivityFeed({ address }: Props) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['activity', address],
    queryFn: ({ pageParam }) =>
      getActivityFeed(address, { cursor: pageParam as string | undefined, limit: 25 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  const entries: ActivityEntry[] = data?.pages.flatMap((p) => p.entries) ?? []

  return (
    <section>
      {isLoading && (
        <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-[11.5px] text-ink-3">
          Reading the chain…
        </div>
      )}
      {!isLoading && entries.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-[11.5px] text-ink-3">
          Quiet here. Activity lands in real time.
        </div>
      )}

      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((e) => (
            <ActivityRow key={e.id} entry={e} />
          ))}
        </ul>
      )}

      {hasNextPage && (
        <button
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mt-3 w-full rounded-lg py-2 border border-zinc-800 bg-zinc-900/40 text-[11.5px] text-ink-2 hover:border-zinc-700 transition disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </section>
  )
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  return (
    <li className="rounded-xl border border-border bg-background px-3 py-2">
      {entry.kind === 'tip' && (
        <div className="flex items-center gap-2">
          <Heart
            className={
              'w-3.5 h-3.5 flex-none ' +
              (entry.direction === 'given' ? 'text-muted-foreground' : 'text-success')
            }
          />
          <Link
            href={`/${encodeURIComponent(entry.counterparty)}`}
            className="text-sm hover:text-primary truncate flex-1"
          >
            {entry.direction === 'given' ? 'Tipped' : 'Tipped by'}{' '}
            <span className="font-mono">{shortAddr(entry.counterparty)}</span>
          </Link>
          <span className="text-sm font-mono font-semibold">
            {formatBase(entry.amount)}
          </span>
          <RelativeTime at={entry.at} />
        </div>
      )}
      {entry.kind === 'payment' && (
        <div className="flex items-center gap-2">
          {entry.direction === 'sent' ? (
            <ArrowUpRight className="w-3.5 h-3.5 flex-none text-muted-foreground" />
          ) : (
            <ArrowDownLeft className="w-3.5 h-3.5 flex-none text-success" />
          )}
          <Link
            href={`/${encodeURIComponent(entry.counterparty)}`}
            className="text-sm hover:text-primary truncate flex-1"
          >
            {entry.direction === 'sent' ? 'Sent to' : 'Received from'}{' '}
            <span className="font-mono">{shortAddr(entry.counterparty)}</span>
          </Link>
          <span className="text-sm font-mono font-semibold">
            {formatBase(entry.amount)}
          </span>
          <RelativeTime at={entry.at} />
        </div>
      )}
      {entry.kind === 'follow' && (
        <div className="flex items-center gap-2">
          <UserPlus className="w-3.5 h-3.5 flex-none text-primary" />
          <Link
            href={`/${encodeURIComponent(entry.counterparty)}`}
            className="text-sm hover:text-primary truncate flex-1"
          >
            {entry.direction === 'started_following'
              ? 'Followed '
              : 'New follower: '}
            <span className="font-mono">{shortAddr(entry.counterparty)}</span>
          </Link>
          <RelativeTime at={entry.at} />
        </div>
      )}
    </li>
  )
}

function shortAddr(addr: string): string {
  if (!addr.startsWith('init1')) return addr
  return `${addr.slice(0, 10)}…${addr.slice(-4)}`
}

function formatBase(raw: string): string {
  const n = BigInt(raw || '0')
  const whole = n / 10n ** BigInt(ORI_DECIMALS)
  const frac = n % 10n ** BigInt(ORI_DECIMALS)
  const fracStr = frac.toString().padStart(ORI_DECIMALS, '0').replace(/0+$/, '')
  return `${whole}${fracStr ? '.' + fracStr : ''} ${ORI_SYMBOL}`
}

function RelativeTime({ at }: { at: string }) {
  const diff = Date.now() - new Date(at).getTime()
  const mins = Math.floor(diff / 60_000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  const label = days > 0 ? `${days}d` : hrs > 0 ? `${hrs}h` : mins > 0 ? `${mins}m` : 'now'
  return (
    <span className="text-[11px] text-muted-foreground font-mono flex-none">{label}</span>
  )
}
