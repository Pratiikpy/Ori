'use client'

import { useQuery } from '@tanstack/react-query'
import { resolve, type Resolved } from '@/lib/resolve'

/**
 * Resolve any identifier (.init name or bech32 address) once and cache the result.
 */
export function useResolve(identifier: string | null | undefined) {
  return useQuery<Resolved | null>({
    queryKey: ['resolve', identifier],
    queryFn: () => (identifier ? resolve(identifier) : Promise.resolve(null)),
    enabled: Boolean(identifier),
    staleTime: 60_000,
    retry: 1,
  })
}
