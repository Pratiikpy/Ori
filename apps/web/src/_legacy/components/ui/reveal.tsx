'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Delay in ms before the element animates in. Defaults to 0. */
  delay?: number
  /** Tag name (default div). */
  as?: 'div' | 'section' | 'article' | 'li'
}

/**
 * Element-level reveal-on-scroll. Sits at opacity:0 + translateY(20px) until
 * ~15% of it enters viewport, then fades in. Idempotent: IO is disconnected
 * after first intersection.
 *
 * Prefers-reduced-motion users skip the animation (handled by globals.css).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add('in'), delay)
            io.disconnect()
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [delay])

  return (
    // @ts-expect-error dynamic tag ref typing
    <Tag ref={ref} className={cn('reveal', className)}>
      {children}
    </Tag>
  )
}
