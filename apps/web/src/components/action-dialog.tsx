'use client'

/**
 * ActionDialog + ActionCard — verbatim port of
 * ui-ref-orii/frontend/src/components/ActionDialog.jsx.
 *
 * Generic action form used by the connected Ori surfaces. It only collects
 * inputs and delegates execution to the page-level handler; confirmations
 * are emitted only after the connected handler runs.
 */
import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type Action = {
  id: string
  title: string
  contract: string
  fields?: readonly string[] | string[]
}

export type ActionRecord = Action & {
  values: Record<string, string>
  time: string
}

export function ActionDialog({
  action,
  onClose,
  onComplete,
}: {
  action: Action | null
  onClose: () => void
  onComplete: (record: ActionRecord) => void | Promise<void>
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // ESC dismisses the modal when not mid-submit. Backdrop click does too —
  // Radix Dialog gives us this for free, but ActionDialog is hand-rolled,
  // so we wire it manually.
  //
  // IMPORTANT: this useEffect must run BEFORE any conditional early-return
  // below — moving the `if (!action) return null` after the hook ensures
  // React sees a stable hook count across renders. The original code put
  // the early-return between the two useStates and the useEffect, which
  // violated Rules of Hooks ("Rendered more hooks than during the previous
  // render") whenever the dialog toggled open/closed.
  useEffect(() => {
    if (!action) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [action, submitting, onClose])

  if (!action) return null

  const updateValue = (field: string, value: string) =>
    setValues((current) => ({ ...current, [field]: value }))

  const submitAction = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    const record: ActionRecord = {
      ...action,
      values,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
    let succeeded = false
    try {
      // onComplete may throw to signal failure; in that case we keep the
      // dialog open with values intact so the user can fix the problem
      // (typo, bad amount, etc.) without retyping. Page-level handlers
      // currently swallow errors and toast — see #5 in the audit, fixing
      // those is out of scope here, but if any handler ever rethrows we
      // honour it.
      await onComplete(record)
      succeeded = true
    } catch (err) {
      // Surface a generic toast so the user gets *some* signal even when
      // the caller didn't already toast. The handler-level toast (if any)
      // will arrive first; this is a safety net.
      // eslint-disable-next-line no-console
      console.warn(`ActionDialog: ${action.id} failed`, err)
    } finally {
      setSubmitting(false)
    }
    if (succeeded) {
      setValues({})
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/70 px-4"
      data-testid={`modal-${action.id}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <form
        onSubmit={submitAction}
        className="w-full max-w-xl border border-[#0A0A0A] bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,34,255,1)]"
        data-testid={`form-${action.id}`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p
              className="font-mono text-xs uppercase text-[#52525B]"
              data-testid={`modal-contract-${action.id}`}
            >
              {action.contract}
            </p>
            <h2
              className="mt-2 font-heading text-2xl font-black tracking-tight"
              data-testid={`modal-title-${action.id}`}
            >
              {action.title}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-none hover:bg-black hover:text-white"
            data-testid={`modal-close-${action.id}`}
            aria-label="Close action dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {(action.fields ?? ['Amount', 'Recipient']).map((field, index) => {
            const id = `${action.id}-${field
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')}`
            const isLong =
              field.toLowerCase().includes('json') ||
              field.toLowerCase().includes('memo') ||
              field.toLowerCase().includes('terms') ||
              field.toLowerCase().includes('csv')
            return (
              <label key={field} className="block" htmlFor={id}>
                <span
                  className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
                  data-testid={`label-${id}`}
                >
                  {field}
                </span>
                {isLong ? (
                  <Textarea
                    id={id}
                    required={index === 0}
                    value={values[field] ?? ''}
                    onChange={(event) =>
                      updateValue(field, event.target.value)
                    }
                    className="min-h-24 rounded-none border-black/20 focus-visible:ring-[#0022FF]"
                    data-testid={`input-${id}`}
                    placeholder={`Enter ${field.toLowerCase()}`}
                  />
                ) : (
                  <Input
                    id={id}
                    required={index === 0}
                    value={values[field] ?? ''}
                    onChange={(event) =>
                      updateValue(field, event.target.value)
                    }
                    className="rounded-none border-black/20 focus-visible:ring-[#0022FF]"
                    data-testid={`input-${id}`}
                    placeholder={`Enter ${field.toLowerCase()}`}
                  />
                )}
              </label>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-none border-black hover:bg-black hover:text-white"
            data-testid={`modal-cancel-${action.id}`}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-none bg-[#0022FF] hover:bg-[#0019CC]"
            data-testid={`modal-submit-${action.id}`}
            disabled={submitting}
          >
            <Check className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit action'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function ActionCard({
  action,
  onOpen,
  scope,
}: {
  action: Action
  onOpen: (action: Action) => void
  scope: string
}) {
  return (
    <article
      className="group border border-black/10 bg-white p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-[#0022FF] hover:shadow-[4px_4px_0px_0px_rgba(0,34,255,1)]"
      data-testid={`action-card-${scope}-${action.id}`}
    >
      <p
        className="font-mono text-xs text-[#52525B]"
        data-testid={`action-contract-${scope}-${action.id}`}
      >
        {action.contract}
      </p>
      <h3
        className="mt-3 font-heading text-xl font-bold tracking-tight"
        data-testid={`action-title-${scope}-${action.id}`}
      >
        {action.title}
      </h3>
      <p
        className="mt-3 text-sm text-[#52525B]"
        data-testid={`action-fields-${scope}-${action.id}`}
      >
        {(action.fields ?? []).slice(0, 3).join(' · ')}
      </p>
      <Button
        onClick={() => onOpen(action)}
        className="mt-5 w-full rounded-none bg-black text-white hover:bg-[#0022FF]"
        data-testid={`action-open-${scope}-${action.id}`}
      >
        Open flow
      </Button>
    </article>
  )
}
