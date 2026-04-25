'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Gift, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { useSession } from '@/hooks/use-session'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { getLinkPreview, markLinkClaimed, type LinkPreview } from '@/lib/api'
import { msgClaimLinkGift } from '@/lib/contracts'
import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'
import { fromBase64 } from '@/lib/crypto'
import { GIFT_THEME } from '@ori/shared-types'
import { buildAutoSignFee, sendTx } from '@/lib/tx'

const THEME_EMOJI: Record<number, string> = {
  [GIFT_THEME.GENERIC]: '✨',
  [GIFT_THEME.BIRTHDAY]: '🎂',
  [GIFT_THEME.THANKS]: '🙏',
  [GIFT_THEME.CONGRATS]: '🎉',
  [GIFT_THEME.CUSTOM]: '💝',
}

type Stage = 'preview' | 'connect' | 'signin' | 'claim' | 'done'

export default function ClaimPage() {
  const router = useRouter()
  const { shortCode } = useParams<{ shortCode: string }>()
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isAuthenticated, signIn, isSigning } = useSession()
  const { isEnabled: autoSign } = useAutoSign()

  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('preview')
  const [busy, setBusy] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Secret is in the URL fragment (not query string → never hits server logs).
  const secret = useMemo(() => {
    if (typeof window === 'undefined') return null
    const frag = window.location.hash.replace(/^#/, '')
    if (!frag) return null
    try {
      return fromBase64(decodeURIComponent(frag))
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!shortCode) return
    void (async () => {
      try {
        const p = await getLinkPreview(shortCode)
        setPreview(p)
        if (p.claimed) setStage('done')
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : 'Link not found')
      }
    })()
  }, [shortCode])

  useEffect(() => {
    if (preview?.claimed) return
    if (!isConnected) setStage('connect')
    else if (!isAuthenticated) setStage('signin')
    else setStage('claim')
  }, [preview, isConnected, isAuthenticated])

  const handleClaim = async () => {
    if (!preview || !initiaAddress || !secret) {
      toast.error('Missing claim secret in URL')
      return
    }
    if (!preview.onChainGiftId) {
      toast.error('On-chain gift id not set for this link — wait a few seconds and retry')
      return
    }
    setBusy(true)
    try {
      const msg = msgClaimLinkGift({
        claimer: initiaAddress,
        giftId: BigInt(preview.onChainGiftId),
        secret,
      })
      const tx = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(600_000) : undefined,
      })
      setTxHash(tx.txHash)

      await markLinkClaimed(preview.shortCode, initiaAddress).catch(() => {
        /* non-fatal */
      })
      toast.success('Gift claimed 🎁')
      setStage('done')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Claim failed')
    } finally {
      setBusy(false)
    }
  }

  if (previewError) {
    return (
      <AppShell title="Claim" hideNav>
        <div className="max-w-md mx-auto py-10 text-center">
          <Gift className="w-10 h-10 text-muted-foreground mx-auto" />
          <h1 className="mt-4 text-xl font-bold">Link unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{previewError}</p>
        </div>
      </AppShell>
    )
  }

  if (!preview) {
    return (
      <AppShell title="Claim" hideNav>
        <div className="max-w-md mx-auto py-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  const emoji = THEME_EMOJI[preview.theme] ?? '✨'
  const senderDisplay = preview.creator.initName ?? shortenAddress(preview.creator.initiaAddress)
  const amountDisplay = baseUnitsToDisplay(preview.amount, preview.denom)

  return (
    <AppShell title="Claim" hideNav>
      <div className="max-w-md mx-auto py-6">
        <div className="rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-background border border-primary/30 p-6 text-center">
          <div className="text-6xl">{emoji}</div>
          <h1 className="mt-4 text-2xl font-bold">{senderDisplay} sent you a gift</h1>
          <div className="mt-2 text-3xl font-black tracking-tight">{amountDisplay}</div>
          {preview.message && (
            <p className="mt-3 text-sm text-muted-foreground italic">&ldquo;{preview.message}&rdquo;</p>
          )}
        </div>

        {stage === 'done' ? (
          <div className="mt-6 rounded-2xl bg-success/15 border border-success/40 p-5 text-center">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto" />
            <div className="mt-2 font-semibold">Claimed</div>
            {txHash && (
              <a
                href={`https://scan.testnet.initia.xyz/ori-1/txs/${txHash}`}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-muted-foreground"
              >
                {txHash.slice(0, 14)}… <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => router.push('/chats')}
              className="mt-4 w-full rounded-2xl py-3 bg-primary text-primary-foreground font-medium"
            >
              Open Ori
            </button>
          </div>
        ) : stage === 'connect' ? (
          <button
            onClick={openConnect}
            className="mt-6 w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium"
          >
            Connect to claim
          </button>
        ) : stage === 'signin' ? (
          <button
            onClick={() => void signIn()}
            disabled={isSigning}
            className="mt-6 w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {isSigning ? 'Signing…' : 'Sign in to claim'}
          </button>
        ) : (
          <button
            onClick={() => void handleClaim()}
            disabled={busy || !secret}
            className="mt-6 w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Claiming…' : `Claim ${amountDisplay}`}
          </button>
        )}

        {!secret && (
          <div className="mt-3 text-xs text-danger text-center">
            Secret missing from URL — this link is incomplete.
          </div>
        )}
      </div>
    </AppShell>
  )
}

function shortenAddress(a: string): string {
  return `${a.slice(0, 10)}…${a.slice(-4)}`
}

function baseUnitsToDisplay(base: string, denom: string): string {
  const decimals = denom === 'umin' || denom === 'uinit' ? 6 : ORI_DECIMALS
  try {
    const b = BigInt(base)
    const whole = b / 10n ** BigInt(decimals)
    const frac = b % 10n ** BigInt(decimals)
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
    const symbol = denom.startsWith('u') ? denom.slice(1).toUpperCase() : ORI_SYMBOL
    return `${whole}${fracStr ? '.' + fracStr : ''} ${symbol}`
  } catch {
    return `${base} ${denom}`
  }
}
