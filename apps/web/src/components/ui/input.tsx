'use client'

/**
 * Input — single text-input component for forms.
 *
 * Apple-style spec from blank-ui-ref:
 *   • h-14, px-5, rounded-2xl, bg-white/60 with black/5 border
 *   • Focus ring: black/20 border + 4px black/5 outer glow
 *   • text-lg (18px) — generous size for form fields
 *
 * Optional `label` and `helper` slots so callers don't reach for raw
 * <label> markup — keeps spacing/label-focus relationships consistent.
 */
import * as React from 'react'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
  error?: string
  /** mono variant for addresses, tx hashes, etc. */
  mono?: boolean
  /** size variant; sm = h-11 for inline filters, md = h-14 default */
  size?: 'sm' | 'md'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, helper, error, mono, size = 'md', className = '', id, ...rest },
    ref,
  ) {
    const reactId = React.useId()
    const inputId = id ?? reactId

    const sizeCls =
      size === 'sm'
        ? 'h-11 px-4 text-[14px] rounded-xl'
        : 'h-14 px-5 text-[16px] rounded-2xl'

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-ink-2 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            sizeCls,
            'w-full bg-white/60 border border-black/5',
            'placeholder:text-ink-4',
            mono ? 'font-mono' : '',
            'focus:bg-white/80 focus:border-black/20',
            'focus:ring-4 focus:ring-black/5 focus:outline-none',
            'transition-[background-color,border-color,box-shadow]',
            error ? '!border-[#B91C1C]/40' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {(error || helper) && (
          <p
            className={[
              'mt-1.5 text-[12px]',
              error ? 'text-[#B91C1C]' : 'text-ink-3',
            ].join(' ')}
          >
            {error || helper}
          </p>
        )}
      </div>
    )
  },
)
