/**
 * Legacy app route group — every existing route that needs the wallet
 * (chat, send, squads, paywall, subscriptions, agent, [identifier]).
 *
 * These pages each wrap themselves in <AppShell> already, so this layout
 * only adds the Providers chain. Don't add a shell here — that would
 * double-wrap.
 */
import { Providers } from '@/components/providers'

export default function LegacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Providers>{children}</Providers>
}
