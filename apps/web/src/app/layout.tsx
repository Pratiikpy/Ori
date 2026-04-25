import type { Metadata, Viewport } from 'next'
import { Outfit, Inter, JetBrains_Mono, Archivo_Black } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

/**
 * Ori type system — Apple-style premium fintech.
 *
 *   • Outfit  — display / headings (weights 400, 500, 600, 700)
 *   • Inter   — body / UI text     (weights 400, 500, 600)
 *   • JetBrains Mono — addresses, amounts, code blocks (weights 400, 500)
 *
 * `next/font/google` self-hosts the woff2 + writes a font-display: swap
 * stylesheet at build, so we don't pay for an extra HTTP request to
 * fonts.googleapis.com at first paint. The `variable` field exposes a
 * CSS var (`--font-display`, etc.) that globals.css picks up.
 */
const display = Outfit({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

// Hero / surface H1s use the heavier Archivo Black to match the prototype
// "Messages, money, and AI agents…" weight. Outfit only goes to 700 — the
// prototype face needs ~900.
const heavy = Archivo_Black({
  variable: '--font-heavy',
  subsets: ['latin'],
  weight: '400', // Archivo_Black ships only one weight
  display: 'swap',
})

const body = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ori — chat that pays',
  description:
    'Ori is a chat wallet where your friends, your funds, and your AI agents share one surface. One name everywhere. Settlement in milliseconds.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ori',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Ori — chat that pays',
    description:
      'Chat wallet for friends, funds, and AI agents. One name everywhere. Settlement in milliseconds.',
    type: 'website',
  },
}

/**
 * Light-only theme — `themeColor` is the canvas (#F5F5F7) so the iOS Safari
 * status-bar tints to match the page rather than going stark white. Allows
 * pinch-zoom for a11y (no `maximumScale: 1`).
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F5F5F7',
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
      className={`${display.variable} ${heavy.variable} ${body.variable} ${mono.variable} antialiased`}
    >
      <body className="min-h-dvh bg-bg text-ink font-body">
        {/* Skip-to-content for keyboard-only users — visually hidden until
            it receives focus, then slides into the top-left. Lives in
            globals.css → `.skip-to-content`. */}
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
