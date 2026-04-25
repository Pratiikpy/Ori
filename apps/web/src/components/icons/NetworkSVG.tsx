// NetworkSVG — identity graph for the /identity capability tile.
// Center node `you.init` + 4 labeled satellites + 2 unlabeled. Radial-gradient
// id="nodeglow". Ports ASSETS.md §6 (source lines 1233-1271). 320x240 viewBox.

import { cn } from '@/lib/cn'

interface NetworkSVGProps {
  className?: string
  /** Override center label, default "you.init". */
  centerLabel?: string
}

export function NetworkSVG({
  className,
  centerLabel = 'you.init',
}: NetworkSVGProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={cn('w-full max-w-[320px]', className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="nodeglow">
          <stop offset="0%" stopColor="#6c7bff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6c7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" fill="none">
        <line x1="160" y1="120" x2="60" y2="60" />
        <line x1="160" y1="120" x2="270" y2="50" />
        <line x1="160" y1="120" x2="260" y2="180" />
        <line x1="160" y1="120" x2="50" y2="180" />
        <line x1="160" y1="120" x2="160" y2="30" />
        <line x1="160" y1="120" x2="160" y2="210" />
      </g>
      <circle cx="160" cy="120" r="50" fill="url(#nodeglow)" />
      <g>
        <circle cx="160" cy="120" r="24" fill="#6c7bff" />
        <text
          x="160"
          y="125"
          textAnchor="middle"
          fill="#0a0a12"
          fontFamily="Geist Mono"
          fontSize="10"
          fontWeight="600"
        >
          {centerLabel}
        </text>
      </g>
      <g fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)">
        <circle cx="60" cy="60" r="14" />
        <circle cx="270" cy="50" r="14" />
        <circle cx="260" cy="180" r="14" />
        <circle cx="50" cy="180" r="14" />
        <circle cx="160" cy="30" r="10" />
        <circle cx="160" cy="210" r="10" />
      </g>
      <g
        fill="rgba(244,244,246,0.7)"
        fontFamily="Geist Mono"
        fontSize="8.5"
        textAnchor="middle"
      >
        <text x="60" y="63">mira</text>
        <text x="270" y="53">alex</text>
        <text x="260" y="183">jamie</text>
        <text x="50" y="183">sam</text>
      </g>
    </svg>
  )
}
