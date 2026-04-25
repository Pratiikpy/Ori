'use client'

/**
 * Legacy AppShell — now a thin shim over the new app shell.
 *
 * Why: dozens of legacy pages import `{ AppShell }` from '@/components/app-shell'
 * and pass `title` + `hideNav`. Rewriting all of them isn't worth it for the
 * deadline. Instead, this file forwards to the new AppShell so every page
 * renders under the same Apple-light chrome (sidebar + mobile drawer + ambient
 * bg). Title is rendered as an h1 above the page body so the visual hierarchy
 * still works. `hideNav` is intentionally ignored — the new chrome's sidebar
 * is universally appropriate.
 */
import { AppShell as NewAppShell } from './layout/app-shell'

export function AppShell({
  title,
  children,
  hideNav: _hideNav = false,
}: {
  title?: string
  children: React.ReactNode
  hideNav?: boolean
}) {
  return (
    <NewAppShell>
      {title && (
        <h1 className="font-display font-medium text-ink leading-tight tracking-[-0.02em] mb-8 text-[32px] sm:text-[40px]">
          {title}
        </h1>
      )}
      {children}
    </NewAppShell>
  )
}
