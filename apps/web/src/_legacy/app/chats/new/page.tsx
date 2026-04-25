'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { ArrowRight } from 'lucide-react'

export default function NewChatPage() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const go = () => {
    const v = value.trim()
    setError(null)
    if (!v) {
      setError('Enter a .init name or an init1… address')
      return
    }
    // Either ".init" name or bech32 address is a valid path segment.
    router.push(`/chat/${v}`)
  }

  return (
    <AppShell title="New chat" hideNav>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold">Start a conversation</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Enter a <span className="font-mono">.init</span> username (like{' '}
          <span className="font-mono">alice.init</span>) or a{' '}
          <span className="font-mono">init1…</span> address.
        </p>

        <label className="mt-6 block">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Recipient</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') go()
            }}
            placeholder="alice.init"
            className="mt-1 w-full rounded-xl bg-muted border border-border px-3 py-3 font-mono focus:outline-none focus:border-primary"
          />
        </label>

        {error && <div className="mt-2 text-danger text-sm">{error}</div>}

        <button
          onClick={go}
          className="mt-6 w-full rounded-2xl py-4 bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
        >
          Open chat
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </AppShell>
  )
}
