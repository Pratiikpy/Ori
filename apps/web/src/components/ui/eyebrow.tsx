import * as React from 'react'

/**
 * Eyebrow — small, mono uppercase, tracked. Sits above section titles.
 * Single-purpose component so spacing/font choices stay locked.
 */
export function Eyebrow({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={['eyebrow', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
