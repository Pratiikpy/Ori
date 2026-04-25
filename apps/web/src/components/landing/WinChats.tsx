// WinChats — OS-style window with search input + 6 chat-item rows.
// Ports Ori-landing.html lines 1361-1419 (.win-chats). Used by FlowStage.

import { Reveal } from '@/components/ui'
import { SearchIcon } from '@/components/icons'

interface ChatItem {
  a: string
  g: string
  n: string
  t: string
  p: string
  b?: number
  active?: boolean
}

const CHATS: readonly ChatItem[] = [
  {
    a: 'M',
    g: 'linear-gradient(135deg,#ff9ec7,#ff6b9d)',
    n: 'mira.init',
    t: 'now',
    p: 'typing…',
    b: 2,
    active: true,
  },
  {
    a: 'A',
    g: 'linear-gradient(135deg,#78cfc1,#3aa693)',
    n: 'alex.init',
    t: '2m',
    p: '⚡ Sent $12 · "thx for coffee"',
  },
  {
    a: 'J',
    g: 'linear-gradient(135deg,#ffb561,#ff8f3a)',
    n: 'jamie.init',
    t: '14m',
    p: 'split for dinner tomorrow?',
  },
  {
    a: 'S',
    g: 'linear-gradient(135deg,#a89bff,#7b6bff)',
    n: 'sam.init',
    t: '1h',
    p: 'stream.ended · $42.70 total',
  },
  {
    a: '·',
    g: 'linear-gradient(135deg,#e4e4e8,#9b9ba0)',
    n: 'studio (3)',
    t: 'yday',
    p: 'rent for march · 4 paid',
  },
  {
    a: 'L',
    g: 'linear-gradient(135deg,#8adfff,#4ab0e0)',
    n: 'lina.init',
    t: 'yday',
    p: 'Gift claimed · $25',
  },
]

export function WinChats() {
  return (
    <Reveal
      as="div"
      className="rounded-2xl border border-border bg-[var(--color-surface-1)] overflow-hidden flex flex-col h-full"
    >
      <WindowBar title="Ori · Chats" />
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-border rounded-lg px-2.5 h-8 text-[12px] text-ink-3">
          <SearchIcon size={12} />
          <span>Search names…</span>
          <span className="ml-auto text-[10px] font-mono">⌘K</span>
        </div>
      </div>
      <ul className="flex-1">
        {CHATS.map((c) => (
          <li key={c.n}>
            {/* Each chat row is interactive — render as <button> so keyboard
                users can tab through and screen readers announce them as
                buttons. Visual is identical to the prior <li> styling. */}
            <button
              type="button"
              aria-label={`Open chat with ${c.n}`}
              className={
                'w-full text-left flex items-center gap-3 px-3 py-2.5 border-t border-[var(--color-line-hairline)] hover:bg-white/[0.04] transition ' +
                (c.active ? 'bg-white/[0.03]' : '')
              }
            >
              <span
                aria-hidden
                className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-medium text-black shrink-0"
                style={{ background: c.g }}
              >
                {c.a}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium truncate">{c.n}</span>
                  <span className="text-[10.5px] text-ink-4 font-mono shrink-0">
                    {c.t}
                  </span>
                </span>
                <span className="block text-[11.5px] text-ink-3 truncate">{c.p}</span>
              </span>
              {c.b ? (
                <span
                  aria-label={`${c.b} unread`}
                  className="tabular-nums h-5 min-w-5 px-1 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-[10.5px] font-medium flex items-center justify-center font-mono"
                >
                  {c.b}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

/**
 * WindowBar — 3 traffic lights + centered mono title. Used by all 3 windows.
 * Source: Ori-landing.html lines 1363-1366 (.window-bar / .traffic).
 */
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
