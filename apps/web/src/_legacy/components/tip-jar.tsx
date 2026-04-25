'use client'

import { useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Coffee, Heart, Loader2, Zap } from 'lucide-react'

import { ORI_CHAIN_ID, ORI_DENOM, ORI_DECIMALS, ORI_SYMBOL } from '@/lib/chain-config'
import { msgTip } from '@/lib/contracts'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { buildAutoSignFee, sendTx } from '@/lib/tx'

type Preset = { label: string; amount: string; icon: React.ReactNode }

const PRESETS: Preset[] = [
  { label: '1 coffee', amount: '1', icon: <Coffee className="w-4 h-4" /> },
  { label: '5 coffees', amount: '5', icon: <Heart className="w-4 h-4" /> },
  { label: 'Superfan', amount: '20', icon: <Zap className="w-4 h-4" /> },
]

export function TipJar({
  creatorAddress,
  creatorDisplayName,
}: {
  creatorAddress: string
  creatorDisplayName: string
}) {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<string | null>('1')
  const [sending, setSending] = useState(false)

  const effectiveAmount = amount || selected || ''

  const pickPreset = (p: Preset) => {
    setSelected(p.amount)
    setAmount('')
  }

  const handleTip = async () => {
    if (!isConnected) {
      openConnect()
      return
    }
    if (initiaAddress === creatorAddress) {
      toast.error('You cannot tip yourself')
      return
    }
    const n = Number(effectiveAmount)
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    const base = toBaseUnits(effectiveAmount, ORI_DECIMALS)

    setSending(true)
    try {
      const msg = msgTip({
        sender: initiaAddress,
        creator: creatorAddress,
        amount: base,
        message,
        denom: ORI_DENOM,
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(500_000) : undefined,
      })
      toast.success(`Tipped ${creatorDisplayName} ${effectiveAmount} ${ORI_SYMBOL}`)
      setMessage('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Tip failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Send a tip</h3>
          <p className="text-xs text-muted-foreground">
            99% goes straight to {creatorDisplayName}. 1% platform fee.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.amount}
            type="button"
            onClick={() => pickPreset(p)}
            className={
              'rounded-xl px-3 py-2 border text-sm transition inline-flex items-center justify-center gap-1.5 ' +
              (selected === p.amount && !amount
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background hover:border-border/80')
            }
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          inputMode="decimal"
          placeholder="Custom"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setSelected(null)
          }}
          className="flex-1 rounded-xl bg-background border border-border px-3 py-2 focus:outline-none focus:border-primary"
        />
        <span className="text-sm text-muted-foreground w-14 text-right">{ORI_SYMBOL}</span>
      </div>

      <input
        type="text"
        maxLength={120}
        placeholder="Message (shown on their OBS overlay)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="mt-2 w-full rounded-xl bg-background border border-border px-3 py-2 focus:outline-none focus:border-primary"
      />

      <button
        onClick={handleTip}
        disabled={sending}
        className="mt-3 w-full rounded-2xl py-3 bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {sending && <Loader2 className="w-4 h-4 animate-spin" />}
        {sending
          ? 'Sending…'
          : `Tip ${effectiveAmount || '0'} ${ORI_SYMBOL}${autoSign ? ' · 1-tap' : ''}`}
      </button>
    </section>
  )
}

function toBaseUnits(human: string, decimals: number): bigint {
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}
