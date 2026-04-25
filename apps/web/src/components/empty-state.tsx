"use client"

/**
 * EmptyState — shared empty-list / no-data placeholder.
 *
 * Authorized non-reference primitive (per 5C-postskin spec). The reference
 * set doesn't ship anything semantically equivalent, but multiple restored
 * routes need a "no items yet" state inside a Card wrapper. Designed to be
 * dropped inside a <Card> by the caller; this component itself is just the
 * inner content (icon + title + description + optional action).
 */
import * as React from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center py-10 px-6",
        className
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-medium leading-tight">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
