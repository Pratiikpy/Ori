'use client'

/**
 * /claim/group/[id]/[slot]#<base64-secret> — claim a group-gift slot.
 *
 * The secret lives in the URL fragment so it never hits a server. Decode it
 * locally, call gift_group::claim_group_slot, celebrate. If someone else
 * already took this slot the module aborts and we surface a soft error.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Gift, Sparkles } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Eyebrow,
  Reveal,
} from '@/components/ui'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID } from '@/lib/chain-config'
import { msgClaimGroupSlot } from '@/lib/contracts'
import { fromBase64 } from '@/lib/crypto'
import { buildAutoSignFee, friendlyError, sendTx } from '@/lib/tx'

export default function ClaimGroupSlotPage() {
  const params = useParams<{ id: string; slot: string }>()
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [secret, setSecret] = useState<Uint8Array | null>(null)
  const [claimed, setClaimed] = useState(false)
  const [busy, setBusy] = useState(false)

  const giftId = useMemo(() => {
    try {
      return BigInt(params.id ?? '0')
    } catch {
      return 0n
    }
  }, [params.id])
  const slotIndex = useMemo(() => {
    try {
      return BigInt(params.slot ?? '0')
    } catch {
      return 0n
    }
  }, [params.slot])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const frag = decodeURIComponent(window.location.hash.slice(1))
      if (frag) setSecret(fromBase64(frag))
    } catch {
      setSecret(null)
    }
  }, [])

  const claim = useCallback(async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    if (!secret) {
      toast.error('Missing claim secret — this link might be incomplete')
      return
    }
    setBusy(true)
    try {
      const msg = msgClaimGroupSlot({
        claimer: initiaAddress,
        giftId,
        slotIndex,
        secret,
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      setClaimed(true)
      toast.success('Claimed')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }, [isConnected, initiaAddress, giftId, slotIndex, secret, kit, autoSign, openConnect])

  return (
    <AppShell title="Claim" hideNav>
      <div className="max-w-lg mx-auto space-y-8">
        <PageHeader
          kicker="· Gift"
          title={
            <>
              A <Serif>slot</Serif> is yours.
            </>
          }
          sub={`Group gift #${params.id}, slot ${Number(slotIndex) + 1}. Tap claim to take it.`}
        />

        <Reveal>
          <Card>
            <CardHeader>
              <Eyebrow>Your share</Eyebrow>
            </CardHeader>
            <CardBody className="space-y-5">
              {claimed ? (
                <EmptyState
                  icon={<Sparkles className="w-5 h-5" />}
                  title="Slot claimed"
                  description="Funds are in your wallet. The sender can watch it land on their end."
                />
              ) : (
                <>
                  <div className="flex items-center gap-3 text-[13px] text-ink-2">
                    <Gift className="w-5 h-5 text-primary-bright" />
                    Group gift ID <span className="font-mono text-foreground">#{params.id}</span>
                    · slot <span className="font-mono text-foreground">{Number(slotIndex) + 1}</span>
                  </div>
                  {!secret && (
                    <div className="text-[13px] text-[var(--color-danger)] rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3">
                      The secret part of this link is missing or malformed. Ask the sender to re-share it.
                    </div>
                  )}
                  <Button
                    onClick={() => void claim()}
                    disabled={!secret}
                    loading={busy}
                    size="lg"
                    className="w-full"
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    {busy ? 'Claiming…' : 'Claim my slot'}
                  </Button>
                </>
              )}
            </CardBody>
          </Card>
        </Reveal>
      </div>
    </AppShell>
  )
}
