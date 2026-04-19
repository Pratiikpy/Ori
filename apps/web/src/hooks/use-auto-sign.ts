'use client'

/**
 * useAutoSign — enable/disable/status for the Ori chain.
 * Pattern adapted from RedGnad/Hunch/src/hooks/use-auto-sign.ts.
 */
import { useCallback } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { ORI_CHAIN_ID } from '@/lib/chain-config'

export function useAutoSign() {
  const { autoSign } = useInterwovenKit()

  const isEnabled = Boolean(autoSign?.isEnabledByChain?.[ORI_CHAIN_ID])
  const isLoading = Boolean(autoSign?.isLoading)
  const expiresAt = autoSign?.expiredAtByChain?.[ORI_CHAIN_ID] ?? null

  const enable = useCallback(async () => {
    await autoSign?.enable(ORI_CHAIN_ID)
  }, [autoSign])

  const disable = useCallback(async () => {
    try {
      await autoSign?.disable(ORI_CHAIN_ID)
    } catch {
      // "authorization not found" — InterwovenKit caches state after a grant expires server-side.
      // Re-enabling then disabling resets the client-side cache.
      try {
        await autoSign?.enable(ORI_CHAIN_ID)
        await autoSign?.disable(ORI_CHAIN_ID)
      } catch {
        // swallow; surface via toast at the call site
      }
    }
  }, [autoSign])

  return { isEnabled, isLoading, expiresAt, enable, disable }
}
