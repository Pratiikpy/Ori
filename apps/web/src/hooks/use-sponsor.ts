'use client'

/**
 * Client-side helpers for the sponsored onboarding endpoints.
 *
 * The backend owns the signer + budget + rate limiting. These wrappers are
 * the React-Query hooks the onboarding flow uses. Call `useSponsorStatus()`
 * before rendering any sponsored-path affordance — a mainnet deploy can flip
 * SPONSOR_ENABLED off server-side without a frontend redeploy.
 */
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  claimSeedPayment,
  claimUsernameSponsorship,
  getSponsorStatus,
  type SponsorStatus,
} from '@/lib/api'

export function useSponsorStatus() {
  return useQuery<SponsorStatus>({
    queryKey: ['sponsor', 'status'],
    queryFn: getSponsorStatus,
    staleTime: 60_000,
  })
}

export function useClaimSeed() {
  return useMutation({
    mutationFn: (address: string) => claimSeedPayment(address),
  })
}

export function useClaimUsernameSponsorship() {
  return useMutation({
    mutationFn: (vars: { address: string; name: string }) =>
      claimUsernameSponsorship(vars.address, vars.name),
  })
}
