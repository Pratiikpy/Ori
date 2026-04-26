'use client'

/**
 * OnboardingBanner — top-of-page banner that surfaces the next required
 * onboarding step for a freshly-connected wallet. Shown across every (ori)
 * route via OriShell so users can never skip a critical setup step.
 *
 * Steps shown in priority order (only one renders at a time):
 *   1. Wallet has 0 balance        → "Claim 0.01 INIT to start" (sponsor faucet)
 *   2. No .init handle on L1       → "Claim your .init handle"
 *   3. Encryption pubkey not on    → "Enable encrypted DMs"
 *      chain
 *
 * Once all three are satisfied (or the user dismisses), the banner hides.
 */
import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useInterwovenKit, useUsernameQuery } from '@initia/interwovenkit-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-session'
import { useEnsureEncryption } from '@/hooks/use-ensure-encryption'
import { useSponsorStatus, useClaimSeed } from '@/hooks/use-sponsor'
import { L1_USERNAMES_PORTAL_URL, ORI_REST_URL, ORI_DENOM } from '@/lib/chain-config'
import { getRecipientEncryptionPubkey } from '@/lib/api-profile'
import { toast } from 'sonner'

// Per-wallet so dismissing on wallet A doesn't suppress wallet B's banner.
// Falls back to a global key (no address) when called pre-connect, but the
// banner only renders when isConnected so that path is unreachable in
// practice.
const DISMISS_KEY_PREFIX = 'ori.onboarding-banner.dismissed-at:'
const dismissKeyFor = (addr: string | null | undefined): string =>
  `${DISMISS_KEY_PREFIX}${addr ?? 'unknown'}`

async function fetchBalanceUmin(initiaAddress: string): Promise<bigint> {
  // Cosmos SDK bank query — public REST endpoint of the rollup. Returns a
  // list of coin balances; we sum the native denom only.
  try {
    const res = await fetch(
      `${ORI_REST_URL}/cosmos/bank/v1beta1/balances/${encodeURIComponent(initiaAddress)}`,
    )
    if (!res.ok) return -1n
    const body = (await res.json()) as { balances?: Array<{ denom: string; amount: string }> }
    const match = (body.balances ?? []).find((b) => b.denom === ORI_DENOM)
    return match ? BigInt(match.amount) : 0n
  } catch {
    return -1n // network error — don't pretend it's empty
  }
}

export function OnboardingBanner() {
  const { initiaAddress, isConnected } = useInterwovenKit() as {
    initiaAddress: string
    isConnected: boolean
  }
  const { isAuthenticated } = useSession()
  const sponsor = useSponsorStatus()
  const claimSeed = useClaimSeed()
  const usernameQuery = useUsernameQuery(isConnected ? initiaAddress || undefined : undefined)
  const ensureEncryption = useEnsureEncryption()

  const [balance, setBalance] = useState<bigint | null>(null)
  const [pubkeyOnChain, setPubkeyOnChain] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(false)

  // Re-evaluate dismissal whenever the connected wallet changes — dismissing
  // on wallet A should NOT suppress the banner for wallet B even in the same
  // browser session. One-hour TTL on dismiss keeps actionable steps from
  // being permanently buried.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!initiaAddress) {
      setDismissed(false)
      return
    }
    const at = window.localStorage.getItem(dismissKeyFor(initiaAddress))
    if (!at) {
      setDismissed(false)
      return
    }
    setDismissed(Date.now() - Number(at) < 60 * 60 * 1000)
  }, [initiaAddress])

  // Refresh balance when wallet changes or after a successful seed claim.
  useEffect(() => {
    if (!isConnected || !initiaAddress) {
      setBalance(null)
      return
    }
    let cancel = false
    void fetchBalanceUmin(initiaAddress).then((b) => {
      if (!cancel) setBalance(b)
    })
    return () => {
      cancel = true
    }
  }, [isConnected, initiaAddress, claimSeed.isSuccess])

  // Look up whether our X25519 pubkey is published on-chain. Only matters
  // once the user is authenticated (otherwise the API would reject anyway).
  useEffect(() => {
    if (!isAuthenticated || !initiaAddress) {
      setPubkeyOnChain(null)
      return
    }
    let cancel = false
    void getRecipientEncryptionPubkey(initiaAddress)
      .then((pk) => {
        if (!cancel) setPubkeyOnChain(pk !== null)
      })
      .catch(() => {
        if (!cancel) setPubkeyOnChain(null)
      })
    return () => {
      cancel = true
    }
  }, [isAuthenticated, initiaAddress, ensureEncryption.ready])

  const step = useMemo<
    null | 'seed' | 'username' | 'encryption'
  >(() => {
    if (!isConnected) return null
    if (dismissed) return null
    if (balance !== null && balance >= 0n && balance === 0n && sponsor.data?.enabled) {
      return 'seed'
    }
    if (usernameQuery.data === null) return 'username'
    if (pubkeyOnChain === false) return 'encryption'
    return null
  }, [isConnected, dismissed, balance, sponsor.data, usernameQuery.data, pubkeyOnChain])

  if (!step) return null

  const dismiss = (): void => {
    setDismissed(true)
    if (typeof window !== 'undefined' && initiaAddress) {
      window.localStorage.setItem(
        dismissKeyFor(initiaAddress),
        String(Date.now()),
      )
    }
  }

  const claimSeedAction = async (): Promise<void> => {
    try {
      await claimSeed.mutateAsync(initiaAddress)
      toast.success('Faucet seed sent', {
        description: 'A small amount of INIT just landed for gas.',
      })
    } catch (e) {
      toast.error('Sponsor seed failed', {
        description: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return (
    <div
      className="border-b border-black/10 bg-[#0022FF] text-white"
      data-testid="onboarding-banner"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4" />
          {step === 'seed' && (
            <span>
              <strong className="font-heading font-black">Step 1 / 3</strong> — Get
              gas: claim a small INIT seed so you can transact.
            </span>
          )}
          {step === 'username' && (
            <span>
              <strong className="font-heading font-black">Step 2 / 3</strong> — Claim
              your <code className="font-mono">.init</code> handle so friends can
              find you by name.
            </span>
          )}
          {step === 'encryption' && (
            <span>
              <strong className="font-heading font-black">Step 3 / 3</strong> — Enable
              encrypted DMs. Publishes your X25519 key so others can message you
              securely.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step === 'seed' && (
            <Button
              onClick={() => void claimSeedAction()}
              disabled={claimSeed.isPending}
              className="rounded-none bg-white text-[#0022FF] hover:bg-white/90"
              data-testid="onboarding-claim-seed"
            >
              {claimSeed.isPending ? 'Claiming…' : 'Claim seed'}
            </Button>
          )}
          {step === 'username' && (
            <a
              href={L1_USERNAMES_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="onboarding-claim-username"
            >
              <Button className="rounded-none bg-white text-[#0022FF] hover:bg-white/90">
                Open claim portal
              </Button>
            </a>
          )}
          {step === 'encryption' && (
            <Button
              onClick={() => void ensureEncryption.run()}
              disabled={
                ensureEncryption.status === 'unlocking' ||
                ensureEncryption.status === 'broadcasting' ||
                ensureEncryption.status === 'caching'
              }
              className="rounded-none bg-white text-[#0022FF] hover:bg-white/90"
              data-testid="onboarding-enable-encryption"
            >
              {ensureEncryption.status === 'unlocking' && 'Sign…'}
              {ensureEncryption.status === 'broadcasting' && 'Publishing…'}
              {ensureEncryption.status === 'caching' && 'Caching…'}
              {(ensureEncryption.status === 'idle' ||
                ensureEncryption.status === 'ready' ||
                ensureEncryption.status === 'error' ||
                ensureEncryption.status === 'checking') &&
                'Enable'}
            </Button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="text-xs underline opacity-80 hover:opacity-100"
            data-testid="onboarding-dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
