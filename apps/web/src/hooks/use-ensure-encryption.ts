'use client'

/**
 * useEnsureEncryption — one-tap onboarding for end-to-end encrypted messaging.
 *
 * What it does (in order):
 *   1. If the X25519 keypair isn't unlocked, prompt for the EIP-191 derivation
 *      signature (lib/keystore.ts → KEY_DERIVATION_MESSAGE) and cache the
 *      public half in IndexedDB.
 *   2. Look up the user's on-chain encryption pubkey via the backend cache.
 *   3. If it's missing or doesn't match the locally-derived public key,
 *      submit a MsgExecute → profile_registry::set_encryption_pubkey on the
 *      Ori rollup so other users can encrypt messages to this user.
 *   4. POST the public key to the API so subsequent fetches don't have to
 *      hit the chain view function.
 *
 * Returns: { status, error, run } — call run() from a UI button. Idempotent;
 * safe to invoke after the chain tx has already been broadcast.
 *
 * Why a single hook: previously users had to (a) "unlock" via a hidden
 * onboarding route that doesn't exist, (b) hand-paste 32-byte hex on the
 * profile page to set the pubkey. Both gates are user-blockers — this
 * collapses them into one action.
 */
import { useCallback, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { useKeypair } from './use-keypair'
import { msgSetEncryptionPubkey } from '@/lib/contracts'
import { sendTx, extractTxHash, friendlyTxError, txExplorerUrl } from '@/lib/tx'
import { ORI_CHAIN_ID } from '@/lib/chain-config'
import { getRecipientEncryptionPubkey } from '@/lib/api-profile'
import { putEncryptionPubkey } from '@/lib/api-profile-publish'
import { toBase64 } from '@/lib/crypto'

type Status = 'idle' | 'unlocking' | 'checking' | 'broadcasting' | 'caching' | 'ready' | 'error'

function bytesEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function useEnsureEncryption() {
  const kit = useInterwovenKit() as ReturnType<typeof useInterwovenKit> & {
    initiaAddress: string
    isConnected: boolean
  }
  const { keypair, unlock } = useKeypair()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (): Promise<boolean> => {
    if (!kit.isConnected || !kit.initiaAddress) {
      setError('Connect wallet first')
      setStatus('error')
      return false
    }
    setError(null)
    try {
      // 1. Unlock / derive keypair if missing.
      let kp = keypair
      if (!kp) {
        setStatus('unlocking')
        kp = await unlock()
        if (!kp) {
          // unlock() failed (likely the user rejected the signature prompt).
          setStatus('idle')
          return false
        }
      }

      // 2. Check if our pubkey is already published.
      setStatus('checking')
      const onchain = await getRecipientEncryptionPubkey(kit.initiaAddress).catch(() => null)
      if (onchain && bytesEq(onchain, kp.publicKey)) {
        setStatus('ready')
        return true
      }

      // 3. Broadcast the Move tx — profile_registry::set_encryption_pubkey.
      setStatus('broadcasting')
      const tx = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgSetEncryptionPubkey(kit.initiaAddress, kp.publicKey)],
        autoSign: false,
        memo: 'Publish encryption pubkey',
      })
      const hash = extractTxHash(tx.rawResponse)
      const url = hash ? txExplorerUrl(hash) : null

      // 4. Cache it API-side so /v1/profiles/:addr/encryption-pubkey hits the
      //    DB row instead of the chain on every recipient lookup.
      setStatus('caching')
      try {
        await putEncryptionPubkey(toBase64(kp.publicKey))
      } catch {
        // Backend cache miss is fine — chain is authoritative. The on-chain
        // tx already lets recipients reach us; the cache only saves a hop.
      }

      setStatus('ready')
      toast.success('Encrypted DMs enabled', {
        description: hash ? `Tx ${hash.slice(0, 10)}…` : 'Pubkey published on-chain',
        action: url
          ? { label: 'View tx', onClick: () => window.open(url, '_blank') }
          : undefined,
      })
      return true
    } catch (e) {
      const msg = friendlyTxError(e)
      setError(msg)
      setStatus('error')
      toast.error('Couldn’t enable encryption', { description: msg })
      return false
    }
  }, [kit, keypair, unlock])

  return { status, error, run, ready: status === 'ready' }
}
