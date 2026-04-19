'use client'

/**
 * useSignChallenge — helper that signs an arbitrary string with the connected wallet
 * via wagmi's useSignMessage. Used for:
 *   - Backend auth session (pairs with useSession)
 *   - Deriving the symmetric key for encrypting the E2E private key in IndexedDB
 */
import { useCallback } from 'react'
import { useSignMessage } from 'wagmi'

export function useSignChallenge() {
  const { signMessageAsync, isPending } = useSignMessage()

  const sign = useCallback(
    async (message: string): Promise<string> => {
      const sig = await signMessageAsync({ message })
      if (!sig.startsWith('0x')) {
        throw new Error('Wallet returned non-hex signature')
      }
      return sig
    },
    [signMessageAsync],
  )

  return { sign, isPending }
}
