'use client'

import { useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { Loader2, Scale } from 'lucide-react'
import { toast } from 'sonner'

import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'
import { msgAcceptWager, msgCancelPendingWager, msgResolveWager } from '@/lib/contracts'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { buildAutoSignFee, sendTx } from '@/lib/tx'

type WagerCardData = {
  wagerId: bigint
  proposer: string
  accepter: string
  arbiter: string
  amount: bigint
  claim: string
  status: 'pending' | 'active' | 'resolved' | 'cancelled'
  winner?: string | null
}

export function WagerCard({
  data,
  onStatusChange,
}: {
  data: WagerCardData
  onStatusChange: (next: WagerCardData) => void
}) {
  const kit = useInterwovenKit()
  const { initiaAddress } = kit
  const { isEnabled: autoSign } = useAutoSign()
  const [busy, setBusy] = useState(false)

  if (!initiaAddress) return null

  const role =
    initiaAddress === data.proposer
      ? 'proposer'
      : initiaAddress === data.accepter
        ? 'accepter'
        : initiaAddress === data.arbiter
          ? 'arbiter'
          : 'observer'

  const stakeDisplay = baseToDisplay(data.amount, ORI_DECIMALS)
  const potDisplay = baseToDisplay(data.amount * 2n, ORI_DECIMALS)

  const fireAccept = async () => {
    setBusy(true)
    try {
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgAcceptWager({ accepter: initiaAddress, wagerId: data.wagerId })],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      toast.success('Wager accepted')
      onStatusChange({ ...data, status: 'active' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Accept failed')
    } finally {
      setBusy(false)
    }
  }

  const fireCancel = async () => {
    setBusy(true)
    try {
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgCancelPendingWager({ proposer: initiaAddress, wagerId: data.wagerId })],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      })
      toast.success('Wager cancelled')
      onStatusChange({ ...data, status: 'cancelled' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancel failed')
    } finally {
      setBusy(false)
    }
  }

  const fireResolve = async (winner: string) => {
    setBusy(true)
    try {
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgResolveWager({ arbiter: initiaAddress, wagerId: data.wagerId, winner })],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      toast.success('Wager resolved')
      onStatusChange({ ...data, status: 'resolved', winner })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Resolve failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-[92%] rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3">
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-warning" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Wager · {data.status}
        </span>
      </div>
      <div className="mt-1 text-sm italic">&ldquo;{data.claim}&rdquo;</div>
      <div className="mt-2 text-xs text-muted-foreground">
        Stake each side: <span className="font-semibold text-foreground">{stakeDisplay} {ORI_SYMBOL}</span>{' '}
        · pot {potDisplay} {ORI_SYMBOL}
      </div>

      {data.status === 'pending' && role === 'accepter' && (
        <button
          onClick={() => void fireAccept()}
          disabled={busy}
          className="mt-3 w-full rounded-xl py-2 bg-warning text-background font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {busy ? 'Accepting…' : `Accept — stake ${stakeDisplay} ${ORI_SYMBOL}`}
        </button>
      )}
      {data.status === 'pending' && role === 'proposer' && (
        <button
          onClick={() => void fireCancel()}
          disabled={busy}
          className="mt-3 w-full rounded-xl py-2 bg-muted text-sm border border-border"
        >
          Cancel & reclaim stake
        </button>
      )}

      {data.status === 'active' && role === 'arbiter' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => void fireResolve(data.proposer)}
            disabled={busy}
            className="rounded-xl py-2 bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            Proposer wins
          </button>
          <button
            onClick={() => void fireResolve(data.accepter)}
            disabled={busy}
            className="rounded-xl py-2 bg-success text-background text-sm font-medium disabled:opacity-50"
          >
            Accepter wins
          </button>
        </div>
      )}

      {data.status === 'resolved' && data.winner && (
        <div className="mt-2 text-xs text-success">
          Winner: <span className="font-mono">{shortAddr(data.winner)}</span>
        </div>
      )}
    </div>
  )
}

function baseToDisplay(base: bigint, decimals: number): string {
  const whole = base / 10n ** BigInt(decimals)
  const frac = base % 10n ** BigInt(decimals)
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole}${fracStr ? '.' + fracStr : ''}`
}

function shortAddr(a: string): string {
  if (!a) return ''
  return `${a.slice(0, 8)}…${a.slice(-4)}`
}
