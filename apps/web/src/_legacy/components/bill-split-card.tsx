'use client'

/**
 * BillSplitCard — renders a split_bill structured message in a chat.
 *
 * For the sender: shows "You split $X, each owes $Y".
 * For the recipient: shows the same plus a Pay Share button.
 */
import { useState } from 'react'
import { Split, Check, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useInterwovenKit } from '@initia/interwovenkit-react'

import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'
import { msgSendPayment } from '@/lib/contracts'
import { buildAutoSignFee, sendTx } from '@/lib/tx'
import { useAutoSign } from '@/hooks/use-auto-sign'

export type BillSplitCardData = {
  direction: 'sent' | 'received'
  totalAmount: bigint
  denom: string
  participants: number
  /** per-person share, derived as total / participants */
  perShare: bigint
  memo: string
  chatId: string
  /** The bill-splitter (creditor) — who asked. */
  creditorAddress: string
  creditorDisplayName: string
  status: 'pending' | 'paid'
}

type Props = {
  data: BillSplitCardData
  onPaid: (args: { amount: bigint; denom: string; memo: string; txHash: string }) => void
}

export function BillSplitCard({ data, onPaid }: Props) {
  const kit = useInterwovenKit()
  const { initiaAddress } = kit
  const { isEnabled: autoSign } = useAutoSign()
  const [paying, setPaying] = useState(false)

  const isSent = data.direction === 'sent'
  const paid = data.status === 'paid'

  const handlePay = async () => {
    if (!initiaAddress) return
    if (data.perShare <= 0n) {
      toast.error('Invalid share amount')
      return
    }
    setPaying(true)
    try {
      const msg = msgSendPayment({
        sender: initiaAddress,
        recipient: data.creditorAddress,
        amount: data.perShare,
        memo: `Split: ${data.memo || 'bill'}`,
        chatId: data.chatId,
        denom: data.denom,
      })
      const tx = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      onPaid({
        amount: data.perShare,
        denom: data.denom,
        memo: `Split: ${data.memo || 'bill'}`,
        txHash: tx.txHash,
      })
      toast.success(`Paid ${formatBase(data.perShare, data.denom)}`)
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
        (isSent ? 'ml-auto bg-accent/10 border-accent/30' : 'bg-muted border-border')
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Split className="w-3.5 h-3.5" />
          {isSent
            ? `You split with ${data.participants - 1} other${data.participants > 2 ? 's' : ''}`
            : `${data.creditorDisplayName} split a bill`}
        </span>
        {paid && <Check className="w-4 h-4 text-success" aria-label="paid" />}
      </div>

      <div className="mt-1 text-sm opacity-80">
        Total: <span className="font-mono font-semibold">{formatBase(data.totalAmount, data.denom)}</span>
      </div>
      <div className="mt-1 text-2xl font-bold">
        {isSent ? 'They owe' : 'You owe'} {formatBase(data.perShare, data.denom)}
      </div>
      {data.memo && <div className="mt-1 text-sm opacity-90 line-clamp-2">{data.memo}</div>}

      {!isSent && !paid && (
        <button
          onClick={() => void handlePay()}
          disabled={paying}
          className="mt-3 w-full rounded-xl py-2.5 bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {paying && <Loader2 className="w-4 h-4 animate-spin" />}
          {paying ? 'Sending…' : `Pay my share${autoSign ? ' · 1-tap' : ''}`}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
      {paid && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-success">
          <Check className="w-3.5 h-3.5" />
          Your share is paid
        </div>
      )}
      {isSent && !paid && (
        <div className="mt-2 text-[11px] text-muted-foreground">Waiting on payment…</div>
      )}
    </div>
  )
}

function formatBase(amount: bigint, denom: string): string {
  const decimals = denom === 'umin' || denom === 'uinit' ? 6 : ORI_DECIMALS
  const whole = amount / 10n ** BigInt(decimals)
  const frac = amount % 10n ** BigInt(decimals)
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  const symbol = denom.startsWith('u') ? denom.slice(1).toUpperCase() : denom.toUpperCase()
  return `${whole}${fracStr ? '.' + fracStr : ''} ${symbol || ORI_SYMBOL}`
}
