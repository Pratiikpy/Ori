import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { InstallPrompt } from '@/components/install-prompt'

// Geist is the sans of record (Ori.html landing uses it too); weight 500 is
// the "barely-heavier-than-regular" workhorse, matched to Linear's 510.
const sans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const mono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

// Editorial serif reserved for single-word accents inside sans headlines.
// Only the italic 400 is used — do not widen this to multiple weights.
const serif = Instrument_Serif({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ori — messages that move money',
  description:
    'Ori is a chat wallet where your friends, your funds, and your AI agents share one surface. One name everywhere. Settlement in milliseconds.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ori',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Ori — messages that move money',
    description:
      'Chat wallet for friends, funds, and AI agents. One name everywhere. Settlement in milliseconds.',
    type: 'website',
  },
}

// Allow user-scaling for accessibility (axe: meta-viewport).
// Prior version locked maximumScale=1 + userScalable=false; that's a
// WCAG 2.1 AA failure for low-vision users who pinch-zoom.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08090a',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable} dark antialiased`}
    >
      <body className="min-h-dvh bg-background text-foreground font-sans">
        <Providers>
          {children}
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  )
}
