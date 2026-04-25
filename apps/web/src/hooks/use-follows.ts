'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchFollowers,
  fetchFollowing,
  fetchFollowStats,
} from '@/lib/api-follows'

export function useFollowStats(address: string | null | undefined) {
  return useQuery({
    queryKey: ['follow-stats', address],
    queryFn: () => fetchFollowStats(address!),
    enabled: Boolean(address),
    staleTime: 60_000,
  })
}

export function useFollowers(
  address: string | null | undefined,
  limit = 50,
) {
  return useQuery({
    queryKey: ['followers', address, limit],
    queryFn: () => fetchFollowers(address!, limit),
    enabled: Boolean(address),
    staleTime: 60_000,
  })
}

export function useFollowing(
  address: string | null | undefined,
  limit = 50,
) {
  return useQuery({
    queryKey: ['following', address, limit],
    queryFn: () => fetchFollowing(address!, limit),
    enabled: Boolean(address),
    staleTime: 60_000,
  })
}
