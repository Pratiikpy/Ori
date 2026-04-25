// WinThread — OS-style window for the active thread with mira.init.
// Head + 5 message bubbles + PayCard + composer with $ prefix.
// Ports Ori-landing.html lines 1421-1460 (.win-thread).

import type { ReactNode } from 'react'
import { Reveal } from '@/components/ui'
import { MailIcon } from '@/components/icons'
import { SendArrowIcon } from '@/components/icons'

export function WinThread() {
  return (
    <Reveal
      as="div"
      className="rounded-2xl border border-border bg-[var(--color-surface-1)] overflow-hidden flex flex-col h-full"
    >
      <WindowBar title="mira.init" />

      {/* Thread head — avatar + name + e2e status + 2 actions */}
      <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[var(--color-line-hairline)]">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-medium text-black shrink-0"
          style={{ background: 'linear-gradient(135deg,#ff9ec7,#ff6b9d)' }}
        >
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">mira.init</div>
          <div className="text-[10.5px] text-ink-3">⚡ active · e2e encrypted</div>
        </div>
        <div className="flex items-center gap-2 text-ink-3">
          <button
            type="button"
            aria-label="Mail"
            className="inline-flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/[0.04] hover:text-foreground transition"
          >
            <MailIcon size={14} />
          </button>
          <button
            type="button"
            aria-label="Group"
            className="inline-flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/[0.04] hover:text-foreground transition"
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="8" cy="4" r="2" />
              <circle cx="4" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M8 6v2M6.2 11l-.4-1M9.8 11l.4-1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body — bubbles + pay card */}
      <div className="p-4 space-y-2 flex-1">
        <MsgIn>dinner at nobu, $64.80 split 4 ways?</MsgIn>
        <MsgOut>sending now</MsgOut>
        <PayCard amt="16.20" meta="Landed · 97ms" />
        <MsgIn>🫡 thanks</MsgIn>
        <MsgIn>want me to charge j and a too?</MsgIn>
        <MsgOut>yes pls</MsgOut>
      </div>

      {/* Composer — $ prefix + Message mira… */}
      <div className="flex gap-2 items-center px-3 py-3 border-t border-[var(--color-line-hairline)]">
        <button
          type="button"
          aria-label="Send money"
          className="h-9 w-9 rounded-full inline-flex items-center justify-center border text-[14px] font-mono text-ink-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'var(--color-border-strong)',
          }}
        >
          $
        </button>
        <div
          className="flex-1 flex items-center justify-between gap-2 rounded-full px-3.5 h-9 border text-[12px] text-ink-3"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderColor: 'var(--color-border)',
          }}
        >
          <span>Message mira…</span>
          <SendArrowIcon size={14} />
        </div>
      </div>
    </Reveal>
  )
}

function WindowBar({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-3 h-9 border-b border-[var(--color-line-hairline)] shrink-0">
      <span aria-hidden className="flex gap-1.5">
        <span className="block h-2.5 w-2.5 rounded-full bg-[#ff5f57] ring-1 ring-black/40" />
        <span className="block h-2.5 w-2.5 rounded-full bg-[#febc2e] ring-1 ring-black/40" />
        <span className="block h-2.5 w-2.5 rounded-full bg-[#28c840] ring-1 ring-black/40" />
      </span>
      <span className="flex-1 text-center text-[11.5px] font-mono text-ink-3 truncate">
        {title}
      </span>
      <span aria-hidden className="w-[42px]" />
    </div>
  )
}

function MsgIn({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[82%] text-[12.5px] leading-[1.4] rounded-2xl rounded-bl-sm bg-white/[0.05] border border-border text-foreground px-3 py-1.5">
      {children}
    </div>
  )
}

function MsgOut({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[82%] ml-auto text-[12.5px] leading-[1.4] rounded-2xl rounded-br-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 py-1.5">
      {children}
    </div>
  )
}

function PayCard({ amt, meta }: { amt: string; meta: string }) {
  return (
    <div className="ml-auto max-w-[86%] rounded-2xl border border-border bg-[var(--color-surface-1)] p-3">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3 font-mono">
        Sent · to mira.init
      </div>
      <div className="tabular-nums text-[22px] font-medium mt-1 font-mono">
        <span className="text-ink-3 text-[14px] mr-0.5 align-[0.12em]">$</span>
        {amt}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-3 font-mono">
        <span className="inline-flex h-3.5 w-3.5 rounded-full bg-[var(--color-success)] items-center justify-center">
          <svg
            viewBox="0 0 16 16"
            width="9"
            height="9"
            fill="none"
            stroke="#07070a"
            strokeWidth="3"
            aria-hidden
          >
            <path
              d="M4 8l2.5 2.5L12 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>{meta}</span>
      </div>
    </div>
  )
}
