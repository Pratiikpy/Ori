'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchBadges, fetchProfile } from '@/lib/api-profiles'

export function useProfile(address: string | null | undefined) {
  return useQuery({
    queryKey: ['profile', address],
    queryFn: () => fetchProfile(address!),
    enabled: Boolean(address),
    staleTime: 60_000,
  })
}

export function useBadges(address: string | null | undefined) {
  return useQuery({
    queryKey: ['badges', address],
    queryFn: () => fetchBadges(address!),
    enabled: Boolean(address),
    staleTime: 5 * 60_000,
  })
}
