'use client'

import { useEffect, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { unlockKeypair, hasKeypair, KEY_DERIVATION_MESSAGE, type Keypair } from '@/lib/keystore'
import { useSignChallenge } from './use-sign-challenge'

/**
 * useKeypair — ensures the X25519 keypair for the current wallet is unlocked in memory.
 * Returns { keypair, isLocked, unlock } — if locked, the UI should prompt unlock
 * (one-tap, re-signs the derivation challenge).
 */
export function useKeypair() {
  const { hexAddress, isConnected } = useInterwovenKit()
  const { sign } = useSignChallenge()
  const [keypair, setKeypair] = useState<Keypair | null>(null)
  const [exists, setExists] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function checkExistence() {
      if (!hexAddress || !isConnected) {
        setExists(false)
        setKeypair(null)
        return
      }
      const has = await hasKeypair(hexAddress)
      if (!cancelled) setExists(has)
    }
    void checkExistence()
    return () => {
      cancelled = true
    }
  }, [hexAddress, isConnected])

  const unlock = async () => {
    if (!hexAddress) return
    setError(null)
    try {
      const signature = await sign(KEY_DERIVATION_MESSAGE)
      const kp = await unlockKeypair(hexAddress, signature)
      if (!kp) {
        setError('No keypair on this device — finish onboarding first')
        return
      }
      setKeypair(kp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unlock failed')
    }
  }

  return {
    keypair,
    isLocked: !keypair,
    exists,
    error,
    unlock,
  }
}
