import { ImageResponse } from 'next/og'

// Next.js auto-generates favicon.ico from this route at build.
// Mark: thin outline ring + filled inner dot on near-black. Same geometry
// as the in-app <OriMark>, so every surface shows the same brand shape.
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#08090a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            border: '2.5px solid #f7f8f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#f7f8f8',
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  )
}
