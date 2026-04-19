'use client'

import { useMemo, useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'

import { AppShell } from '@/components/app-shell'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID, ORI_DECIMALS, ORI_DENOM, ORI_SYMBOL } from '@/lib/chain-config'
import { msgBatchSend } from '@/lib/contracts'
import { resolve } from '@/lib/resolve'
import { buildAutoSignFee, sendTx } from '@/lib/tx'

type Row = { identifier: string; amount: string; memo: string }

export default function BulkSendPage() {
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected, openConnect } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [rawText, setRawText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const rows: Row[] = useMemo(() => parseRows(rawText), [rawText])
  const totalBase = useMemo(() => rows.reduce((s, r) => s + toBaseUnits(r.amount), 0n), [rows])
  const totalDisplay = baseToDisplay(totalBase, ORI_DECIMALS)

  const handleSend = async () => {
    if (!isConnected) {
      openConnect()
      return
    }
    if (!initiaAddress) return
    if (rows.length === 0) {
      toast.error('Paste a list of recipients')
      return
    }
    if (rows.length > 100) {
      toast.error('Max 100 recipients per batch')
      return
    }

    setBusy(true)
    setResult(null)
    try {
      // Resolve every identifier on L1 in parallel.
      const resolved = await Promise.all(
        rows.map(async (r) => {
          const res = await resolve(r.identifier)
          if (!res) throw new Error(`Could not resolve "${r.identifier}"`)
          return { address: res.initiaAddress, amount: toBaseUnits(r.amount), memo: r.memo }
        }),
      )

      const msg = msgBatchSend({
        sender: initiaAddress,
        recipients: resolved.map((r) => r.address),
        amounts: resolved.map((r) => r.amount),
        memos: resolved.map((r) => r.memo),
        denom: ORI_DENOM,
        batchId: new Date().toISOString(),
      })

      const gasLimit = Math.min(10_000_000, 200_000 + rows.length * 80_000)
      const tx = await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(gasLimit) : undefined,
      })
      setResult(tx.txHash || 'ok')
      toast.success(`Sent to ${rows.length} recipient${rows.length === 1 ? '' : 's'}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell title="Bulk send">
      <div className="max-w-md mx-auto w-full px-5 py-5">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Bulk send
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One line per recipient. Format:
          <br />
          <code className="text-xs">alice.init, 10, optional memo</code>
          <br />
          or
          <br />
          <code className="text-xs">init1abc…, 2.5</code>
        </p>

        <textarea
          rows={10}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`alice.init, 5, payday\nbob.init, 10\ncharlie.init, 2.5, thanks for the sprint`}
          className="mt-4 w-full rounded-xl bg-muted border border-border px-3 py-3 font-mono text-sm focus:outline-none focus:border-primary"
        />

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {rows.length} recipient{rows.length === 1 ? '' : 's'}
          </div>
          <div className="font-semibold">
            Total: {totalDisplay} {ORI_SYMBOL}
          </div>
        </div>

        <button
          onClick={() => void handleSend()}
          disabled={busy || rows.length === 0}
          className="mt-4 w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy
            ? 'Sending…'
            : `Send batch${autoSign ? ' · 1-tap' : ''}`}
        </button>

        {result && (
          <div className="mt-4 rounded-xl bg-success/15 border border-success/40 p-3 text-sm text-center">
            Batch submitted: <span className="font-mono text-xs break-all">{result}</span>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function parseRows(text: string): Row[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const parts = line.split(',').map((p) => p.trim())
      const [identifier = '', amount = '', ...memoParts] = parts
      return { identifier, amount, memo: memoParts.join(', ') }
    })
    .filter((r) => r.identifier && r.amount)
}

function toBaseUnits(human: string, decimals = ORI_DECIMALS): bigint {
  if (!human) return 0n
  const [whole, fracRaw = ''] = human.split('.') as [string, string?]
  const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(frac || '0')
}

function baseToDisplay(base: bigint, decimals: number): string {
  const whole = base / 10n ** BigInt(decimals)
  const frac = base % 10n ** BigInt(decimals)
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole}${fracStr ? '.' + fracStr : ''}`
}

