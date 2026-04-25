'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchQuests } from '@/lib/api-quests'

export function useQuests(address: string | null | undefined) {
  return useQuery({
    queryKey: ['quests', address],
    queryFn: () => fetchQuests(address!),
    enabled: Boolean(address),
    staleTime: 60_000,
  })
}
