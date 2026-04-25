'use client'

import { useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchOraclePrice,
  fetchOracleTickers,
  type OraclePrice,
} from '@/lib/api-oracle'

export function useOracleTickers() {
  return useQuery({
    queryKey: ['oracle', 'tickers'],
    queryFn: fetchOracleTickers,
    staleTime: 60_000,
  })
}

export function useOraclePrice(pair: string | null | undefined) {
  return useQuery({
    queryKey: ['oracle', 'price', pair],
    queryFn: () => fetchOraclePrice(pair!),
    enabled: Boolean(pair),
    staleTime: 2_000,
    refetchInterval: 5_000,
  })
}

/** Fetch many pairs in parallel; convenient for live oracle grids. */
export function useOraclePrices(pairs: string[]) {
  return useQueries({
    queries: pairs.map((pair) => ({
      queryKey: ['oracle', 'price', pair],
      queryFn: () => fetchOraclePrice(pair),
      staleTime: 2_000,
      refetchInterval: 5_000,
    })),
  }) as Array<{ data: OraclePrice | undefined; isLoading: boolean; isError: boolean }>
}
