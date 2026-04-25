// WinSend — OS-style window for the send sheet. Recipient row, big amount,
// keypad, and Send CTA glued to the bottom via mt-auto.
// Ports Ori-landing.html lines 1462-1492 (.win-send).

import { Reveal } from '@/components/ui'
import { ArrowIcon } from '@/components/icons'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

export function WinSend() {
  return (
    <Reveal
      as="div"
      className="rounded-2xl border border-border bg-[var(--color-surface-1)] overflow-hidden flex flex-col h-full"
    >
      <WindowBar title="Send" />

      {/* Recipient row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-line-hairline)]">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-medium text-black shrink-0"
          style={{ background: 'linear-gradient(135deg,#ff9ec7,#ff6b9d)' }}
        >
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">mira.init</div>
          <div className="text-[10.5px] text-ink-3 font-mono">0xc29d…8a4f</div>
        </div>
        <button
          type="button"
          aria-label="Clear recipient"
          className="text-ink-3 text-[16px] hover:text-foreground transition"
        >
          ×
        </button>
      </div>

      {/* Amount block */}
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="tabular-nums text-[48px] font-medium tracked-tight leading-none font-mono">
          <span className="text-ink-3 text-[22px] align-[0.15em] mr-0.5">$</span>
          16.20
        </div>
        <div className="mt-2 text-[11px] text-ink-3 font-mono">
          Balance · $245.00 USD
        </div>
      </div>

      {/* Keypad — buttons (was <div>) so each key is keyboard-reachable
          and announced as a button to AT. The visual is identical. */}
      <div className="grid grid-cols-3 gap-1.5 px-4 pb-4" role="group" aria-label="Numeric keypad">
        {KEYS.map((k) => (
          <button
            type="button"
            key={k}
            aria-label={k === '⌫' ? 'Backspace' : k === '.' ? 'Decimal point' : `Number ${k}`}
            className="aspect-[1.9/1] rounded-lg bg-white/[0.03] border border-border flex items-center justify-center text-[15px] font-mono cursor-default hover:bg-white/[0.05] transition"
          >
            {k}
          </button>
        ))}
      </div>

      {/* Send CTA — mt-auto glues it to bottom */}
      <div className="px-4 pb-4 mt-auto">
        <button
          type="button"
          className="w-full rounded-full h-10 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[13px] font-medium inline-flex items-center justify-center gap-1.5"
        >
          Send · $16.20
          <ArrowIcon size={12} />
        </button>
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
