'use client'

/**
 * Reputation controls — thumbs up/down/retract + simple attest form.
 *
 * Slotted into the profile page when viewing someone else's profile. The
 * current vote state isn't reflected here (no view endpoint yet) — buttons
 * are idempotent enough on the module side (abort on double-vote) that this
 * is fine for the hackathon scope; we surface clear toasts on each outcome.
 */
import { useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { ShieldCheck, ThumbsDown, ThumbsUp, Undo2, X } from 'lucide-react'

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Eyebrow,
  Field,
  Input,
  Textarea,
} from '@/components/ui'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID } from '@/lib/chain-config'
import {
  msgAttest,
  msgRetractVote,
  msgThumbsDown,
  msgThumbsUp,
} from '@/lib/contracts'
import { buildAutoSignFee, friendlyError, sendTx } from '@/lib/tx'

interface ReputationPanelProps {
  target: string
  targetDisplayName?: string
}

type Action = 'up' | 'down' | 'retract' | 'attest'

export function ReputationPanel({ target, targetDisplayName }: ReputationPanelProps) {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [busy, setBusy] = useState<Action | null>(null)
  const [attestOpen, setAttestOpen] = useState(false)
  const [claim, setClaim] = useState('')
  const [evidenceUri, setEvidenceUri] = useState('')

  const runVote = async (action: Action, fn: () => ReturnType<typeof msgThumbsUp>) => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    setBusy(action)
    try {
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [fn()],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      toast.success(
        action === 'up'
          ? `+1 to ${targetDisplayName ?? 'this account'}`
          : action === 'down'
            ? 'Vote cast'
            : 'Vote retracted'
      )
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }

  const doUp = () =>
    runVote('up', () => msgThumbsUp({ voter: initiaAddress!, target }))
  const doDown = () =>
    runVote('down', () => msgThumbsDown({ voter: initiaAddress!, target }))
  const doRetract = () =>
    runVote('retract', () => msgRetractVote({ voter: initiaAddress!, target }))

  const doAttest = async () => {
    if (!isConnected) return openConnect()
    if (!initiaAddress) return
    if (!claim.trim()) {
      toast.error('What are you attesting to?')
      return
    }
    setBusy('attest')
    try {
      const msg = msgAttest({
        attester: initiaAddress,
        target,
        claim: claim.trim(),
        evidenceUri: evidenceUri.trim(),
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      toast.success('Attestation signed on-chain')
      setClaim('')
      setEvidenceUri('')
      setAttestOpen(false)
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Eyebrow>Reputation</Eyebrow>
          <button
            onClick={() => setAttestOpen((v) => !v)}
            className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-3 hover:text-foreground transition"
          >
            {attestOpen ? 'close' : 'attest'}
          </button>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={busy === 'up'}
            onClick={() => void doUp()}
            leftIcon={<ThumbsUp className="w-3.5 h-3.5" />}
          >
            Up
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={busy === 'down'}
            onClick={() => void doDown()}
            leftIcon={<ThumbsDown className="w-3.5 h-3.5" />}
          >
            Down
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={busy === 'retract'}
            onClick={() => void doRetract()}
            leftIcon={<Undo2 className="w-3.5 h-3.5" />}
          >
            Retract
          </Button>
        </div>

        {attestOpen && (
          <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
            <Field label="Claim" hint="What is true about this account?">
              <Textarea
                maxLength={240}
                placeholder="e.g. Delivered my commission on time in April."
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
              />
            </Field>
            <Field label="Evidence URI (optional)">
              <Input
                placeholder="https://… or ipfs://…"
                value={evidenceUri}
                onChange={(e) => setEvidenceUri(e.target.value)}
                className="font-mono text-[13px]"
              />
            </Field>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => void doAttest()}
                loading={busy === 'attest'}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
                size="sm"
              >
                Sign attestation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAttestOpen(false)}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
