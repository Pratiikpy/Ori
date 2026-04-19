'use client'

import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Off the grid.</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            That URL doesn't point at anything on Ori. Maybe the link is
            old, or the <span className="font-mono">.init</span> name hasn't
            been registered yet.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/today"
            className="inline-flex justify-center rounded-2xl py-3 bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Back to Today
          </Link>
          <Link
            href="/"
            className="inline-flex justify-center rounded-2xl py-3 bg-muted text-foreground font-medium hover:bg-border transition"
          >
            Go to landing
          </Link>
        </div>
      </div>
    </main>
  )
}
