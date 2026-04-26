import type { Metadata, Viewport } from 'next'
import { Archivo, Manrope, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const heading = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-heading',
  display: 'swap',
})

const body = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-mono',
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
      className={`${heading.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
