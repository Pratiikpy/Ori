import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface OSWindowProps {
  title?: ReactNode
  /** Left-aligned mono label displayed in the chrome beside traffic lights. */
  label?: ReactNode
  /** Right-aligned chrome slot (chips, small actions). */
  tail?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** Subtle border-glow on hover. */
  interactive?: boolean
}

/**
 * Mac-style traffic-light window chrome, pixel-matched to Ori.html.
 * 3 dots: close (#ff5f57) / min (#febc2e) / max (#28c840), 12px each.
 */
export function OSWindow({
  title,
  label,
  tail,
  children,
  className,
  bodyClassName,
  interactive,
}: OSWindowProps) {
  return (
    <div
      className={cn(
        'bg-white/[0.022] border border-[var(--color-border-strong)] rounded-[28px] overflow-hidden',
        'shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]',
        interactive && 'panel-hover',
        className
      )}
    >
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-white/[0.015]">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="w-3 h-3 rounded-full bg-[#ff5f57] ring-1 ring-black/40"
          />
          <span
            aria-hidden
            className="w-3 h-3 rounded-full bg-[#febc2e] ring-1 ring-black/40"
          />
          <span
            aria-hidden
            className="w-3 h-3 rounded-full bg-[#28c840] ring-1 ring-black/40"
          />
        </span>
        {label && (
          <span className="font-mono text-[11px] text-ink-3 tracking-wider uppercase">
            {label}
          </span>
        )}
        {title && (
          <span className="flex-1 text-center text-[12.5px] text-ink-2 truncate">
            {title}
          </span>
        )}
        {tail && <span className="ml-auto flex items-center gap-2">{tail}</span>}
      </div>
      <div className={cn('p-6', bodyClassName)}>{children}</div>
    </div>
  )
}
