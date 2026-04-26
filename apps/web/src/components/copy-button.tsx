'use client'

/**
 * CopyButton — single-tap clipboard copy with a check-mark animation.
 *
 * Wrap any short text (address, tx hash, gift secret, share URL) so the
 * user can copy it without selecting + Cmd-C. Falls back to a textarea
 * trick when navigator.clipboard is unavailable (older Safari, http://
 * dev origins).
 *
 * Renders inline as a 28×28 button (>= 44px effective touch target on
 * mobile thanks to the padding) with a Copy icon that briefly turns
 * into a Check on success.
 */
import { useCallback, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

export type CopyButtonProps = {
  value: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to textarea trick */
  }
  if (typeof document === 'undefined') return false
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function CopyButton({
  value,
  label = 'Copy',
  className,
  size = 'sm',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const onClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const ok = await copyToClipboard(value)
      if (ok) {
        setCopied(true)
        // Brief signal — keeps the toast surface uncluttered.
        toast.success('Copied', { duration: 1200 })
        setTimeout(() => setCopied(false), 1200)
      } else {
        toast.error("Couldn't copy — try selecting and pressing ⌘C / Ctrl-C")
      }
    },
    [value],
  )

  const sizeClass =
    size === 'sm'
      ? 'h-7 w-7 min-h-11 min-w-11 sm:min-h-7 sm:min-w-7'
      : 'h-9 w-9 min-h-11 min-w-11'

  return (
    <button
      type="button"
      onClick={(e) => void onClick(e)}
      className={`inline-flex shrink-0 items-center justify-center border border-black/15 bg-white text-black/70 transition-colors hover:bg-black hover:text-white ${sizeClass} ${className ?? ''}`}
      aria-label={label}
      title={label}
      data-testid="copy-button"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
