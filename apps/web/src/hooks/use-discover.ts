'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchDiscoverRecent,
  fetchDiscoverRising,
  fetchDiscoverTopCreators,
} from '@/lib/api-discover'

export function useDiscoverRecent(limit = 8) {
  return useQuery({
    queryKey: ['discover', 'recent', limit],
    queryFn: () => fetchDiscoverRecent(limit),
    staleTime: 60_000,
  })
}

export function useDiscoverTopCreators(limit = 8) {
  return useQuery({
    queryKey: ['discover', 'top-creators', limit],
    queryFn: () => fetchDiscoverTopCreators(limit),
    staleTime: 60_000,
  })
}

export function useDiscoverRising(limit = 8) {
  return useQuery({
    queryKey: ['discover', 'rising', limit],
    queryFn: () => fetchDiscoverRising(limit),
    staleTime: 60_000,
  })
}
