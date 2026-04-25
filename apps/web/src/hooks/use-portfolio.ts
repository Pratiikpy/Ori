'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchPortfolio } from '@/lib/api-portfolio'

export function usePortfolio(address: string | null | undefined) {
  return useQuery({
    queryKey: ['portfolio', address],
    queryFn: () => fetchPortfolio(address!),
    enabled: Boolean(address),
    staleTime: 30_000,
  })
}
