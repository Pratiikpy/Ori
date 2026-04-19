'use client'

import { useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Loader2, Scale, X } from 'lucide-react'
import { toast } from 'sonner'

import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_DENOM, ORI_SYMBOL } from '@/lib/chain-config'
import { msgProposeWager } from '@/lib/contracts'
import { resolve } from '@/lib/resolve'
import { buildAutoSignFee, extractMoveEventData, sendTx } from '@/lib/tx'
import { useAutoSign } from '@/hooks/use-auto-sign'

type Props = {
  chatId: string
  recipientAddress: string
  recipientInitName: string | null
  onClose: () => void
  onProposed: (args: {
    wagerId: bigint
    claim: string
    amount: bigint
    accepter: string
    arbiter: string
  }) => void
}

export function WagerModal({ chatId, recipientAddress, recipientInitName, onClose, onProposed }: Props) {
  const kit = useInterwovenKit()
  const { initiaAddress } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [claim, setClaim] = useState('')
  const [amount, setAmount] = useState('')
  const [arbiter, setArbiter] = useState('')
  const [busy, setBusy] = useState(false)

  const handlePropose = async () => {
    if (!initiaAddress) return
    if (!claim.trim()) return toast.error('Enter a claim')
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return toast.error('Enter a stake amount')
    if (!arbiter.trim()) return toast.error('Enter a neutral arbiter .init')

    setBusy(true)
    try {
      const resolved = await resolve(arbiter.trim())
      if (!resolved) {
        toast.error('Could not resolve arbiter')
        return
      }
      if (
        resolved.initiaAddress === initiaAddress ||
        resolved.initiaAddress === recipientAddress
      ) {
        toast.error('Arbiter must be a neutral third person')
        return
      }

      const base = toBaseUnits(amount, ORI_DECIMALS)
      const msg = msgProposeWager({
        proposer: initiaAddress,
        accepter: recipientAddress,
        arbiter: resolved.initiaAddress,
        amount: base,
        claim: claim.trim(),
        denom: ORI_DENOM,
      })

      const tx = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(600_000) : undefined,
      })

      const data = extractMoveEventData(tx.rawResponse, '::wager_escrow::WagerProposed')
      const wagerId = data && data.id != null ? BigInt(String(data.id)) : 0n

      onProposed({
        wagerId,
        claim: claim.trim(),
        amount: base,
        accepter: recipientAddress,
        arbiter: resolved.initiaAddress,
      })

      toast.success(`Wager proposed to ${recipientInitName ?? 'recipient'}`)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Propose failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold inline-flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Friendly wager
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Both stakes escrow. A neutral third <span className="font-mono">.init</span> declares the winner.
          1% platform fee applies on payout.
        </p>

        <label className="block mt-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Claim</span>
          <input
            autoFocus
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Liverpool wins tonight"
            className="mt-1 w-full rounded-xl bg-muted border border-border px-3 py-2 focus:outline-none focus:border-primary"
            maxLength={160}
          />
        </label>

        <label className="block mt-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Stake (each side)</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 rounded-xl bg-muted border border-border px-3 py-2 text-xl font-semibold focus:outline-none focus:border-primary"
            />
            <span className="text-sm text-muted-foreground">{ORI_SYMBOL}</span>
          </div>
        </label>

        <label className="block mt-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Arbiter</span>
          <input
            value={arbiter}
            onChange={(e) => setArbiter(e.target.value)}
            placeholder="carol.init"
            className="mt-1 w-full rounded-xl bg-muted border border-border px-3 py-2 font-mono focus:outline-none focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Must not be you or {recipientInitName ?? 'the other party'}.
          </p>
        </label>

        <button
          onClick={() => void handlePropose()}
          disabled={busy}
          className="mt-5 w-full rounded-2xl py-3 bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? 'Proposing…' : `Propose · chat ${chatId.slice(0, 6)}`}
        </button>
      </div>
    </div>
  )
}

function toBaseUnits(human: string, decimals: number): bigint {
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}
