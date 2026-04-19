import { ImageResponse } from 'next/og'

// OG image served at /opengraph-image. Social cards, Slack previews, X
// unfurls. Composed against the same near-black canvas + soft indigo glow
// as the landing, for brand consistency.
export const alt = 'Ori — messages that move money. A chat wallet for friends, funds, and AI agents.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '96px',
          background: '#08090a',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Ambient glow — radial wash from upper-left like the landing */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 900px 500px at 30% 0%, rgba(113,112,255,0.22), transparent 60%), radial-gradient(ellipse 600px 400px at 90% 60%, rgba(94,106,210,0.10), transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Brand lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 56, zIndex: 1 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '3px solid #f7f8f8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#f7f8f8' }} />
          </div>
          <div
            style={{
              color: '#f7f8f8',
              fontSize: 42,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              display: 'flex',
            }}
          >
            Ori
          </div>
        </div>

        {/* Headline — compressed, heavy tracking, big */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            color: '#f7f8f8',
            fontSize: 104,
            fontWeight: 500,
            letterSpacing: '-0.035em',
            lineHeight: 0.98,
            gap: 22,
            zIndex: 1,
          }}
        >
          <span>Messages that</span>
        </div>
        <div
          style={{
            display: 'flex',
            color: '#f7f8f8',
            fontSize: 104,
            fontWeight: 500,
            letterSpacing: '-0.035em',
            lineHeight: 0.98,
            marginBottom: 44,
            zIndex: 1,
          }}
        >
          <span>move money.</span>
        </div>

        {/* Subhead */}
        <div
          style={{
            color: '#d0d6e0',
            fontSize: 30,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            lineHeight: 1.35,
            maxWidth: 900,
            zIndex: 1,
            display: 'flex',
          }}
        >
          <span>
            A chat wallet for your friends, your funds, and your AI agents. Built on Initia.
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
