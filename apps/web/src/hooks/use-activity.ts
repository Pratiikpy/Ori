'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchActivity, fetchWeeklyStats } from '@/lib/api-activity'

export function useActivity(
  address: string | null | undefined,
  limit = 25,
) {
  return useQuery({
    queryKey: ['activity', address, limit],
    queryFn: () => fetchActivity(address!, { limit }),
    enabled: Boolean(address),
    staleTime: 30_000,
  })
}

export function useWeeklyStats(address: string | null | undefined) {
  return useQuery({
    queryKey: ['weekly-stats', address],
    queryFn: () => fetchWeeklyStats(address!),
    enabled: Boolean(address),
    staleTime: 5 * 60_000,
  })
}
