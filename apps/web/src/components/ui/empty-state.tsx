/**
 * EmptyState — used when a list is empty AND we want to nudge a next step.
 * Editorial voice in copy is up to the caller; this component is just chrome.
 */
import * as React from 'react'
import { Icon, type IconName } from './icon'

export interface EmptyStateProps {
  icon?: IconName
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon = 'sparkle',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'glass-card px-8 py-12 flex flex-col items-center text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="w-14 h-14 rounded-full bg-white/80 border border-black/5 inline-flex items-center justify-center mb-5 shadow-sm">
        <Icon name={icon} size={24} className="text-ink-2" />
      </div>
      <h3 className="text-[20px] font-display font-medium text-ink leading-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-sm text-[14px] text-ink-3 leading-[1.55]">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
