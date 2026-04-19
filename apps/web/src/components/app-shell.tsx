'use client'

import { Header } from './header'
import { BottomNav } from './bottom-nav'

/**
 * Shared chrome for every signed-in surface.
 *
 * The `backdrop-stars-quiet` class installs a reduced-intensity version of
 * the landing's radial-gradient + starfield backdrop — the ::before/::after
 * pseudos are fixed at z-index 0 (pointer-events:none), so children must
 * sit in their own stacking context to stay above the atmosphere. That's
 * why Header, main, and BottomNav are each wrapped with `relative z-10`.
 */
export function AppShell({
  title,
  children,
  hideNav = false,
}: {
  title?: string
  children: React.ReactNode
  hideNav?: boolean
}) {
  return (
    <div className="relative min-h-dvh flex flex-col backdrop-stars-quiet">
      <div className="relative z-10 flex flex-col flex-1">
        <Header title={title} />
        <main className="flex-1 flex flex-col">{children}</main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  )
}
