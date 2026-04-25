'use client'

/**
 * ActionDialog — modal that opens when a user clicks "Open flow" on an
 * ActionCard. Renders one input per `action.fields[]`, with a Submit
 * button that invokes the matching contract call from lib/contracts.ts
 * (or the matching API call for /v1/* actions).
 *
 * The mapping from action.id → real handler lives in `actionHandlers.ts`.
 *
 * Visual: portal-mounted, dark backdrop, sharp white card with the
 * signature 8px blue offset shadow.
 */
import * as React from 'react'
import { toast } from 'sonner'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import type { ActionDef } from './action-card'
import { runAction } from '@/lib/action-handlers'

export function ActionDialog({
  action,
  onClose,
  onComplete,
}: {
  action: ActionDef | null
  onClose: () => void
  onComplete?: (record: { title: string; time: string }) => void
}) {
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [busy, setBusy]     = React.useState(false)
  const interwoven = useInterwovenKit()

  // Reset when a new action opens
  React.useEffect(() => {
    setValues({})
    setBusy(false)
  }, [action?.id])

  // ESC closes
  React.useEffect(() => {
    if (!action) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action, onClose])

  if (!action) return null

  const updateValue = (field: string, value: string) =>
    setValues((cur) => ({ ...cur, [field]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await runAction(action, values, interwoven)
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      toast.success(`${action.title} dispatched`, { description: action.contract })
      onComplete?.({ title: action.title, time })
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(`${action.title} failed`, { description: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/70 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={action.title}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl border border-[#0A0A0A] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,34,255,1)]"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase text-[#52525B]">{action.contract}</p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight">{action.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-transparent p-1.5 transition hover:bg-black hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="space-y-4">
          {(action.fields || ['Amount', 'Recipient']).map((field, index) => {
            const id = `${action.id}-${field.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            const lower = field.toLowerCase()
            const isLong = lower.includes('json') || lower.includes('memo') || lower.includes('terms') || lower.includes('csv') || lower.includes('content')
            return (
              <label key={field} className="block" htmlFor={id}>
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]">
                  {field}
                </span>
                {isLong ? (
                  <textarea
                    id={id}
                    required={index === 0}
                    value={values[field] || ''}
                    onChange={(e) => updateValue(field, e.target.value)}
                    className="w-full min-h-24 border border-black/20 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-[#0022FF]"
                    placeholder={`Enter ${lower}`}
                  />
                ) : (
                  <input
                    id={id}
                    type="text"
                    required={index === 0}
                    value={values[field] || ''}
                    onChange={(e) => updateValue(field, e.target.value)}
                    className="w-full border border-black/20 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-[#0022FF]"
                    placeholder={`Enter ${lower}`}
                  />
                )}
              </label>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="border border-black px-5 py-2.5 text-sm font-semibold transition hover:bg-black hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 bg-[#0022FF] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0019CC] disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Dispatching…' : (<><CheckGlyph />Dispatch</>)}
          </button>
        </div>
      </form>
    </div>
  )
}

function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
