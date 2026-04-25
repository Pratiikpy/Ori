import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, JetBrains_Mono, Archivo_Black } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

/**
 * Ori type system — Emergent prototype parity.
 *
 *   • Archivo Black  — heavy display headings (font-heading / font-heavy)
 *   • IBM Plex Sans  — body / UI text
 *   • JetBrains Mono — addresses, amounts, oracle ticker rows
 *
 * Cabinet Grotesk (the prototype's exact heading face) is loaded from
 * Fontshare via @import in globals.css. Archivo Black is the next/font/google
 * fallback if Cabinet Grotesk fails to load.
 */
const heavy = Archivo_Black({
  variable: '--font-heavy-fallback',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const body = IBM_Plex_Sans({
  variable: '--font-body-fallback',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const mono = JetBrains_Mono({
  variable: '--font-mono-fallback',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ori — chat that pays',
  description:
    'Messages, money, and AI agents under one .init name. Chat wallet on Initia.',
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
      'Chat wallet for friends, funds, and AI agents. One .init name everywhere.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
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
      className={`${heavy.variable} ${body.variable} ${mono.variable} antialiased`}
    >
      <body
        className="min-h-dvh bg-white text-[#0A0A0A]"
        style={{ fontFamily: 'var(--font-body-fallback), "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif' }}
      >
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
