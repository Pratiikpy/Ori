'use client'

import { Header } from './header'
import { BottomNav } from './bottom-nav'

/**
 * Shared chrome for every signed-in surface.
 *
 * Width is owned here, not by individual pages — pages render content;
 * this component centers it in a max-w-6xl column with consistent gutters.
 * Header is full-bleed (so the blurred sticky bar reaches edge-to-edge),
 * but its inner row is centered to the same max-width so the brand mark
 * lines up with the content column below it.
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
        <main
          id="main-content"
          className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-8"
        >
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  )
}
