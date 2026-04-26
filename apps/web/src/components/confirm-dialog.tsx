'use client'

/**
 * ConfirmDialog — small modal for destructive actions.
 *
 * Forces a typed confirmation (default: "REVOKE") before firing the
 * supplied async `onConfirm`. While `onConfirm` is in flight the dialog
 * displays optional `progress` text (e.g. "3 / 10 revoked") and exposes
 * an Abort button that calls `onAbort` so callers can break out of a
 * long-running sequence (kill-switch revoking N agents one tx at a time).
 *
 * ESC and backdrop click both dismiss when not in flight.
 */
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  /** Phrase the user must type verbatim to enable Confirm. Default 'REVOKE'. */
  typedPhrase?: string
  /** Label for the Confirm button. Default 'Confirm'. */
  confirmLabel?: string
  /** Live progress text shown while running. */
  progress?: string | null
  running?: boolean
  onConfirm: () => Promise<void> | void
  onAbort?: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  typedPhrase = 'REVOKE',
  confirmLabel = 'Confirm',
  progress,
  running = false,
  onConfirm,
  onAbort,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')

  // Reset typed state every time the dialog opens.
  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  // ESC key dismisses when idle.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !running) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, running, onClose])

  const matched = typed.trim() === typedPhrase
  const handleConfirm = useCallback(async () => {
    if (!matched) return
    await onConfirm()
  }, [matched, onConfirm])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      data-testid="confirm-dialog"
      onClick={(e) => {
        // Backdrop click dismisses when idle.
        if (e.target === e.currentTarget && !running) onClose()
      }}
    >
      <div className="w-full max-w-md border border-black/15 bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,34,255,1)]">
        <p
          id="confirm-dialog-title"
          className="font-heading text-2xl font-black tracking-tight"
        >
          {title}
        </p>
        {description && (
          <p className="mt-3 text-sm leading-6 text-[#52525B]">{description}</p>
        )}

        <div className="mt-5">
          <label
            htmlFor="confirm-dialog-input"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
          >
            Type {`"${typedPhrase}"`} to confirm
          </label>
          <input
            id="confirm-dialog-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={running}
            className="w-full rounded-none border border-black/15 px-3 py-2 font-mono text-sm focus:border-[#0022FF] focus:outline-none disabled:opacity-50"
            data-testid="confirm-dialog-input"
            autoFocus
          />
        </div>

        {progress && (
          <p
            className="mt-4 font-mono text-xs text-[#0022FF]"
            data-testid="confirm-dialog-progress"
          >
            {progress}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {running && onAbort ? (
            <Button
              type="button"
              onClick={onAbort}
              variant="outline"
              className="rounded-none border-black/15"
              data-testid="confirm-dialog-abort"
            >
              Abort
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="rounded-none border-black/15"
              disabled={running}
              data-testid="confirm-dialog-cancel"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!matched || running}
            className="rounded-none bg-[#FF1744] text-white hover:bg-[#D40C32] disabled:bg-black/30 disabled:text-white/70"
            data-testid="confirm-dialog-confirm"
          >
            {running ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
