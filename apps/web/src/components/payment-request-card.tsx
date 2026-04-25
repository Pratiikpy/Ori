'use client'

/**
 * PaymentRequestCard — renders a "pay me" message in the chat timeline.
 *
 * For the requester: shows "Requested {amount} from {name}" with a muted status
 * (pending / paid). Paid status is derived from locally seen payment messages
 * that match the same chat + amount within a tolerant window.
 *
 * For the recipient of the request: renders a prominent Pay button that calls
 * `payment_router::send` when tapped. Uses auto-sign so the button is one tap.
 */
import { useState } from 'react'
import { ArrowRight, Check, HandCoins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useInterwovenKit } from '@initia/interwovenkit-react'

import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'
import { msgSendPayment } from '@/lib/contracts'
import { buildAutoSignFee, sendTx } from '@/lib/tx'
import { useAutoSign } from '@/hooks/use-auto-sign'

export type PaymentRequestCardData = {
  direction: 'sent' | 'received'
  amount: bigint
  denom: string
  memo?: string
  chatId: string
  /** Address of the user who asked for the money. */
  requesterAddress: string
  /** Display name of the requester (either side sees it labeled). */
  requesterDisplayName: string
  status: 'pending' | 'paid'
}

type Props = {
  data: PaymentRequestCardData
  onPaid: (args: { amount: bigint; denom: string; memo: string; txHash: string }) => void
}

export function PaymentRequestCard({ data, onPaid }: Props) {
  const kit = useInterwovenKit()
  const { initiaAddress } = kit
  const { isEnabled: autoSign } = useAutoSign()
  const [paying, setPaying] = useState(false)

  const isSent = data.direction === 'sent'
  const paid = data.status === 'paid'

  const handlePay = async () => {
    if (!initiaAddress) return
    if (data.amount <= 0n) {
      toast.error('Invalid amount')
      return
    }
    setPaying(true)
    try {
      const msg = msgSendPayment({
        sender: initiaAddress,
        recipient: data.requesterAddress,
        amount: data.amount,
        memo: data.memo ?? '',
        chatId: data.chatId,
        denom: data.denom,
      })
      const tx = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      onPaid({ amount: data.amount, denom: data.denom, memo: data.memo ?? '', txHash: tx.txHash })
      toast.success(`Paid ${formatAmount(data.amount, data.denom)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div
      className={
        'rounded-2xl px-4 py-3 max-w-[82%] break-words border ' +
        (isSent
          ? 'ml-auto bg-warning/10 border-warning/30'
          : 'bg-muted border-border')
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <HandCoins className="w-3.5 h-3.5" />
          {isSent ? `You requested` : `${data.requesterDisplayName} requested`}
        </span>
        {paid && <Check className="w-4 h-4 text-success" aria-label="paid" />}
      </div>

      <div className="mt-1 text-2xl font-bold">{formatAmount(data.amount, data.denom)}</div>
      {data.memo && <div className="mt-1 text-sm opacity-90">{data.memo}</div>}

      {!isSent && !paid && (
        <button
          onClick={() => void handlePay()}
          disabled={paying}
          className="mt-3 w-full rounded-xl py-2.5 bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {paying && <Loader2 className="w-4 h-4 animate-spin" />}
          {paying ? 'Sending…' : `Pay${autoSign ? ' · 1-tap' : ''}`}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      {paid && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-success">
          <Check className="w-3.5 h-3.5" />
          Paid
        </div>
      )}

      {isSent && !paid && (
        <div className="mt-2 text-[11px] text-muted-foreground">Waiting on payment…</div>
      )}
    </div>
  )
}

function formatAmount(amount: bigint, denom: string): string {
  const decimals = denom === 'umin' || denom === 'uinit' ? 6 : ORI_DECIMALS
  const whole = amount / 10n ** BigInt(decimals)
  const frac = amount % 10n ** BigInt(decimals)
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  const symbol = denom.startsWith('u') ? denom.slice(1).toUpperCase() : denom.toUpperCase()
  return `${whole}${fracStr ? '.' + fracStr : ''} ${symbol || ORI_SYMBOL}`
}
