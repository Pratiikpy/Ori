/**
 * AppShell — wrapper for every signed-in page.
 *
 * Composition:
 *   • Ambient gradient background (pinned, pointer-events: none)
 *   • Desktop: Sidebar fixed left + main content with `lg:pl-72`
 *   • Mobile: MobileChrome sticky top + drawer
 *
 * Width is owned here, not at the page. Pages render content; AppShell
 * enforces the column. Keep pages free of `max-w-*`.
 */
import * as React from 'react'
import { Sidebar } from './sidebar'
import { MobileChrome } from './mobile-chrome'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-ambient">
      <Sidebar />
      <MobileChrome />
      <main
        id="main-content"
        className="relative z-10 min-h-dvh lg:pl-72"
      >
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 lg:px-10 py-8 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
