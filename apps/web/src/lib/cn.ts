import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Conditional class-name helper. Combines clsx (conditional logic, objects,
 * arrays) with tailwind-merge (dedupes conflicting Tailwind utility classes
 * so a later `bg-red` beats an earlier `bg-blue`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
