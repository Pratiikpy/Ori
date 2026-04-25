'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchGlobalStats,
  fetchProfileTopTippers,
  fetchTopCreators,
  fetchTopTippers,
} from '@/lib/api-leaderboards'

export function useTopCreators(limit = 10) {
  return useQuery({
    queryKey: ['leaderboards', 'top-creators', limit],
    queryFn: () => fetchTopCreators(limit),
    staleTime: 60_000,
  })
}

export function useTopTippers(limit = 10) {
  return useQuery({
    queryKey: ['leaderboards', 'top-tippers', limit],
    queryFn: () => fetchTopTippers(limit),
    staleTime: 60_000,
  })
}

export function useProfileTopTippers(
  address: string | null | undefined,
  limit = 10,
) {
  return useQuery({
    queryKey: ['leaderboards', 'profile-tippers', address, limit],
    queryFn: () => fetchProfileTopTippers(address!, limit),
    enabled: Boolean(address),
    staleTime: 60_000,
  })
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ['leaderboards', 'global-stats'],
    queryFn: fetchGlobalStats,
    staleTime: 5 * 60_000,
  })
}
