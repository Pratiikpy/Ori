import type { Metadata } from 'next'
import { APP_URL } from '@/lib/chain-config'

/**
 * Server-side metadata for profile URLs — supplies Open Graph + Twitter card
 * tags pointing to the dynamically-rendered OG image route. This is what
 * makes ori.chat/alice.init unfurl nicely in iMessage, Twitter, Telegram, etc.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ identifier: string }> },
): Promise<Metadata> {
  const { identifier } = await params
  const decoded = decodeURIComponent(identifier)
  const ogUrl = `${APP_URL}/api/og/profile/${encodeURIComponent(identifier)}`
  const canonical = `${APP_URL}/${encodeURIComponent(identifier)}`

  return {
    title: `${decoded} · Ori`,
    description: `Pay ${decoded} on Ori — 100 ms settle, zero wallet popups.`,
    openGraph: {
      title: `Pay ${decoded} on Ori`,
      description: 'Messages + money on Initia. 100 ms settle, zero wallet popups.',
      url: canonical,
      siteName: 'Ori',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Pay ${decoded} on Ori`,
      description: '100 ms settle, zero wallet popups.',
      images: [ogUrl],
    },
    alternates: { canonical },
  }
}

export default function IdentifierLayout({ children }: { children: React.ReactNode }) {
  return children
}
