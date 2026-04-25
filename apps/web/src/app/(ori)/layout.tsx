/**
 * (ori) route group — Inbox / Money / Play / Explore / Profile.
 *
 * Provides the brutalist OriShell chrome (sidebar + topbar + mobile nav)
 * over the wallet Providers chain. Routes here render as pages within
 * the OriShell main content slot.
 */
import { Providers } from '@/components/providers'
import { OriShell } from '@/components/ori-shell'

export default function OriRouteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <OriShell>{children}</OriShell>
    </Providers>
  )
}
