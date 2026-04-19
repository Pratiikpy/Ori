/**
 * OG image for profile URLs — renders a shareable 1200x630 card.
 *
 * The Next.js `ImageResponse` API runs on the Edge runtime. We keep the
 * render dependency-free (no external font loads, no network fetches) so
 * it's fast to generate + cacheable.
 */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  const decoded = decodeURIComponent(id)
  const display = decoded.length > 32 ? `${decoded.slice(0, 10)}…${decoded.slice(-6)}` : decoded

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#060606',
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
              color: '#fff',
              fontWeight: 800,
              fontSize: 28,
            }}
          >
            O
          </div>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>Ori</span>
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 28, color: '#9a9a9a' }}>Pay</div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
            {display}
          </div>
          <div style={{ fontSize: 24, color: '#9a9a9a', marginTop: 16 }}>
            Messages + money on Initia. 100 ms settle, zero popups.
          </div>
        </div>
      </div>
    ),
    size,
  )
}
