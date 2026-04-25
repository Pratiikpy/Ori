'use client'

/**
 * QrDisplay — renders a QR code as a data-URL image.
 *
 * Used on:
 *   - /send page: pay-me QR for receiving money
 *   - /[profile] page: share/pay QR for the creator
 *   - Tip jar modal: quick-scan flow on mobile
 *
 * Uses `qrcode` npm lib's toDataURL which returns a base64 PNG — rendered via
 * a regular <img> tag. We intentionally avoid dangerouslySetInnerHTML here.
 */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

type Props = {
  value: string
  size?: number
  className?: string
  margin?: number
  /** Module color. Default: white (works on dark bg). */
  dark?: string
  /** Background color. Default: transparent. */
  light?: string
}

export function QrDisplay({
  value,
  size = 220,
  className,
  margin = 1,
  dark = '#ffffff',
  light = '#00000000',
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin,
      width: size * 2, // upscale for retina
      color: { dark, light },
    })
      .then((out) => {
        if (!cancelled) setDataUrl(out)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [value, size, margin, dark, light])

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-label="Generating QR…"
      />
    )
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for ${value}`}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
