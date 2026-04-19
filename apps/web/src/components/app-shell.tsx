'use client'

import { Header } from './header'
import { BottomNav } from './bottom-nav'

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
    <div className="min-h-dvh flex flex-col">
      <Header title={title} />
      <main className="flex-1 flex flex-col">{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  )
}
