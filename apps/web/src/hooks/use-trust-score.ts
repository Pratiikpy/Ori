'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTrustScore } from '@/lib/api-trust'

export function useTrustScore(address: string | null | undefined) {
  return useQuery({
    queryKey: ['trust-score', address],
    queryFn: () => fetchTrustScore(address!),
    enabled: Boolean(address),
    staleTime: 5 * 60_000,
  })
}
