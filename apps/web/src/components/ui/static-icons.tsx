/**
 * static-icons — inline SVG icons safe for Server Components.
 *
 * Why this exists: @phosphor-icons/react v2 calls `createContext` at module
 * top-level. That fires during Next's build-time evaluation of any Server
 * Component that transitively imports an icon, and Turbopack's SSR runtime
 * mis-resolves React there → `createContext is not a function`.
 *
 * For *static-rendered* routes (not-found, landing), we side-step the entire
 * Phosphor module graph by inlining SVG paths. Visually matches Phosphor's
 * regular weight at 1.5px stroke. Tree-shaken to nothing on routes that
 * don't use them.
 *
 * Use the regular `Icon` (from ./icon) inside Client Components — Phosphor
 * is fine there.
 */
import * as React from 'react'

interface SvgIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

function base({ size = 20, children, ...rest }: SvgIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function InfoIcon(props: SvgIconProps) {
  return base({
    ...props,
    children: (
      <>
        <circle cx="12" cy="12" r="9.25" />
        <line x1="12" y1="11" x2="12" y2="16.5" />
        <circle cx="12" cy="7.75" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  })
}

export function ArrowRightIcon(props: SvgIconProps) {
  return base({
    ...props,
    children: (
      <>
        <line x1="4.5" y1="12" x2="19.5" y2="12" />
        <polyline points="13.5,6 19.5,12 13.5,18" />
      </>
    ),
  })
}

export function CheckIcon(props: SvgIconProps) {
  return base({
    ...props,
    strokeWidth: 2.5,
    children: <polyline points="5,12.5 10,17.5 19,7" />,
  })
}
