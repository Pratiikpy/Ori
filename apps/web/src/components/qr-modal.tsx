'use client'

/**
 * QrModal — overlay that shows a QR code + shareable URL + copy button.
 *
 * Used from profile "Share" and /send "Receive" buttons. The QR encodes a URL
 * that any phone's native camera can open (no in-app scanner needed).
 */
import { useEffect } from 'react'
import { Copy, X, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { QrDisplay } from './qr-display'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  url: string
}

export function QrModal({ open, onClose, title, subtitle, url }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const copy = () => {
    void navigator.clipboard.writeText(url)
    toast.success('Link copied')
  }

  const share = async () => {
    // navigator.share is mobile-only; fall back to copy
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title,
          text: subtitle ?? title,
          url,
        })
        return
      } catch {
        /* user cancelled or not supported */
      }
    }
    copy()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 safe-area-top safe-area-bottom"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-muted border border-border p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-background border border-border p-5 flex items-center justify-center">
          <QrDisplay value={url} size={220} />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-background border border-border px-3 py-2">
          <span className="flex-1 text-xs font-mono truncate">{url}</span>
          <button
            onClick={copy}
            aria-label="Copy"
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-border"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => void share()}
          className="mt-3 w-full rounded-2xl py-3 bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        <p className="mt-3 text-[11px] text-center text-muted-foreground">
          Any phone's camera can scan this to open the link.
        </p>
      </div>
    </div>
  )
}
