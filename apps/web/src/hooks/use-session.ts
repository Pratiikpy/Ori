'use client'

/**
 * useSession — manages the Ori backend session token lifecycle.
 *
 * Pattern (verified against ocean2fly/iUSD-Pay/packages/app/src/services/auth.ts):
 *   1. Get wallet-connected initiaAddress + hexAddress from InterwovenKit.
 *   2. POST /v1/auth/challenge → server returns challenge message + nonce.
 *   3. Call wagmi `signMessageAsync({ message })` which triggers EIP-191 personal_sign.
 *   4. POST /v1/auth/verify with the signature → server returns session token.
 *   5. Store token in localStorage, use as Bearer for subsequent requests.
 *
 * We depend on Privy (InterwovenKit's social-login connector) exposing
 * EIP-191 signMessage via wagmi, which is the pattern iUSD Pay already relies on
 * in production.
 */
import { useCallback, useEffect, useState } from 'react'
import { useSignMessage } from 'wagmi'
import { useInterwovenKit } from '@initia/interwovenkit-react'

import {
  clearSessionToken,
  getSessionToken,
  getCurrentUser,
  requestChallenge,
  setSessionToken,
  verifyChallenge,
  logout as apiLogout,
  type AuthedUser,
} from '@/lib/api'

type Status = 'idle' | 'checking' | 'authenticated' | 'unauthenticated' | 'signing' | 'error'

export function useSession() {
  const { initiaAddress, hexAddress, isConnected } = useInterwovenKit() as {
    initiaAddress: string
    hexAddress: string
    isConnected: boolean
  }
  const { signMessageAsync } = useSignMessage()

  const [status, setStatus] = useState<Status>('idle')
  const [user, setUser] = useState<AuthedUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Hydrate + validate existing session on mount / address change.
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (!isConnected) {
        setStatus('unauthenticated')
        setUser(null)
        return
      }
      const token = getSessionToken()
      if (!token) {
        setStatus('unauthenticated')
        return
      }
      setStatus('checking')
      try {
        const me = await getCurrentUser()
        if (cancelled) return
        // Session is for a different address than currently connected — wipe it.
        if (me.initiaAddress !== initiaAddress) {
          clearSessionToken()
          setStatus('unauthenticated')
          setUser(null)
          return
        }
        setUser(me)
        setStatus('authenticated')
      } catch {
        if (!cancelled) {
          clearSessionToken()
          setStatus('unauthenticated')
          setUser(null)
        }
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [initiaAddress, isConnected])

  const signIn = useCallback(async () => {
    if (!initiaAddress || !hexAddress) {
      setError('Wallet not connected')
      setStatus('error')
      return
    }
    setError(null)
    setStatus('signing')
    try {
      const challenge = await requestChallenge(initiaAddress)

      // Trigger Privy EIP-191 personal_sign via wagmi.
      const signature = await signMessageAsync({ message: challenge.challenge })
      if (!signature.startsWith('0x')) {
        throw new Error('Wallet returned non-hex signature')
      }

      const session = await verifyChallenge({
        initiaAddress,
        hexAddress,
        nonce: challenge.nonce,
        signature,
      })
      setSessionToken(session.token)
      setUser(session.user)
      setStatus('authenticated')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
      setStatus('error')
    }
  }, [initiaAddress, hexAddress, signMessageAsync])

  const signOut = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      clearSessionToken()
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  return {
    status,
    user,
    error,
    signIn,
    signOut,
    isAuthenticated: status === 'authenticated',
    isSigning: status === 'signing',
  }
}
