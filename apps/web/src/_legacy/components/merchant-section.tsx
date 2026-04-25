'use client'

/**
 * Merchant registration card — wraps msgRegisterMerchant.
 *
 * Slots into /settings. Keeps a local "registered" flag for UI state;
 * the chain is the source of truth. On re-submit, the module treats it
 * as an update (or aborts if already set — we surface the error).
 */
import { useState } from 'react'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { toast } from 'sonner'
import { Loader2, Store, Save } from 'lucide-react'

import { Field, Input, Textarea } from '@/components/ui/field'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID, ORI_DENOM } from '@/lib/chain-config'
import { msgRegisterMerchant } from '@/lib/contracts'
import { buildAutoSignFee, friendlyError, sendTx } from '@/lib/tx'

const CATEGORIES = [
  'creator',
  'software',
  'shop',
  'services',
  'food',
  'art',
  'music',
  'other',
]

export function MerchantSection() {
  const kit = useInterwovenKit()
  const { initiaAddress } = kit
  const { isEnabled: autoSign } = useAutoSign()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('creator')
  const [logoUrl, setLogoUrl] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)

  const register = async () => {
    if (!initiaAddress) {
      toast.error('Connect wallet first')
      return
    }
    if (!name.trim()) {
      toast.error('Merchant name is required')
      return
    }
    setBusy(true)
    try {
      const msg = msgRegisterMerchant({
        owner: initiaAddress,
        name: name.trim(),
        category,
        logoUrl: logoUrl.trim(),
        contact: contact.trim(),
        acceptedDenoms: [ORI_DENOM],
      })
      await sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msg],
        autoSign,
        fee: autoSign ? buildAutoSignFee(600_000) : undefined,
      })
      toast.success('Merchant registered')
    } catch (e) {
      toast.error(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-5">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono inline-flex items-center gap-1.5">
          <Store className="w-3 h-3" />
          Merchant
        </h2>
        <button
          onClick={() => void register()}
          disabled={busy}
          className="rounded-full h-7 px-3 text-[11.5px] font-medium bg-primary text-primary-foreground disabled:opacity-50 inline-flex items-center gap-1.5 hover:-translate-y-[1px] transition will-change-transform"
        >
          {busy ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Register
        </button>
      </div>

      <p className="text-[13px] leading-[1.55] text-ink-3 mb-4">
        Listing yourself as a merchant makes your address discoverable in
        Discover and lets agents route business payments to you.
      </p>

      <div className="space-y-3">
        <Field label="Business name">
          <Input
            placeholder="e.g. mira films"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
          />
        </Field>
        <Field label="Category">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={
                  'px-3 py-1.5 rounded-full text-[12px] font-mono transition ' +
                  (category === c
                    ? 'bg-primary/[0.15] border border-primary/45 text-primary-bright'
                    : 'bg-white/[0.025] border border-[var(--color-border-strong)] text-ink-2 hover:text-foreground')
                }
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Logo URL (optional)">
          <Input
            placeholder="https://… or ipfs://…"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="font-mono text-[13px]"
          />
        </Field>
        <Field label="Contact (email / handle)" hint="Public — shown on your merchant page">
          <Textarea
            placeholder="business@you.com"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={128}
            className="min-h-[60px]"
          />
        </Field>
      </div>
    </section>
  )
}
