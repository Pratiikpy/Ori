/**
 * OG image for payment-link (gift) claim URLs.
 *
 * Receives the short-code in the path, fetches the link's preview data from
 * the API (amount, message, creator), and renders a gift-card style preview.
 * Used by Twitter, iMessage, WhatsApp, Telegram link unfurls.
 */
import { ImageResponse } from 'next/og'
import { API_URL } from '@/lib/chain-config'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

const THEME_COLORS: Record<number, { bg: string; ring: string }> = {
  0: { bg: '#1a1a1a', ring: '#4349ff' },
  1: { bg: '#1a0f1f', ring: '#ec4899' },
  2: { bg: '#0f1a14', ring: '#10b981' },
  3: { bg: '#1a140a', ring: '#f59e0b' },
  4: { bg: '#0a141a', ring: '#7ad9f7' },
}

function formatBase(raw: string, denom: string): string {
  const n = BigInt(raw || '0')
  const decimals = denom === 'umin' || denom === 'uinit' ? 6 : 6
  const whole = n / 10n ** BigInt(decimals)
  const frac = n % 10n ** BigInt(decimals)
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 2)
  const sym = denom.startsWith('u') ? denom.slice(1).toUpperCase() : denom.toUpperCase()
  return `${whole}${fracStr ? '.' + fracStr : ''} ${sym}`
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params
  let amount = '0'
  let denom = 'umin'
  let message = ''
  let creatorName = ''
  let theme = 0

  try {
    const res = await fetch(`${API_URL}/v1/links/${encodeURIComponent(code)}`)
    if (res.ok) {
      const body = (await res.json()) as {
        amount?: string
        denom?: string
        message?: string
        theme?: number
        creator?: { initName?: string | null; initiaAddress?: string }
      }
      amount = String(body.amount ?? '0')
      denom = String(body.denom ?? 'umin')
      message = String(body.message ?? '')
      theme = Number(body.theme ?? 0)
      creatorName =
        body.creator?.initName ??
        (body.creator?.initiaAddress
          ? `${body.creator.initiaAddress.slice(0, 10)}…${body.creator.initiaAddress.slice(-4)}`
          : 'someone')
    }
  } catch {
    /* best-effort preview */
  }

  const palette = THEME_COLORS[theme] ?? THEME_COLORS[0]!

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: palette.bg,
          color: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#4349ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 28,
              color: '#fff',
            }}
          >
            🎁
          </div>
          <span style={{ fontSize: 28, fontWeight: 700 }}>You have an Ori gift</span>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 24, color: '#9a9a9a' }}>From</div>
          <div style={{ fontSize: 48, fontWeight: 700 }}>{creatorName}</div>
        </div>

        <div
          style={{
            marginTop: 32,
            display: 'flex',
            flexDirection: 'column',
            padding: 32,
            borderRadius: 24,
            border: `2px solid ${palette.ring}`,
            background: 'rgba(255,255,255,0.03)',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 20, color: '#9a9a9a' }}>Amount</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
            {formatBase(amount, denom)}
          </div>
          {message && (
            <div style={{ fontSize: 22, color: '#d5d5d5', marginTop: 8 }}>"{message}"</div>
          )}
        </div>
      </div>
    ),
    size,
  )
}
