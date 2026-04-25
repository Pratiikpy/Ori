/**
 * Marketing route group — public, no wallet providers.
 *
 * The Landing page is a Server Component. Wrapping it in Providers
 * (Wagmi + InterwovenKit + QueryClient) forces the entire subtree
 * to client-only rendering and ships InterwovenKit's CSS reset
 * (`:where(button){all:unset}`) which clobbers Tailwind utilities.
 * Marketing pages don't need any of that — render them clean.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
