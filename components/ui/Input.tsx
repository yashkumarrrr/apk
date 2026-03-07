import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className, id, ...props }, ref) => {
  const uid = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={uid} className="block text-[11px] text-muted tracking-widest uppercase mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={uid}
        className={cn(
          'w-full bg-surface border rounded-xl px-5 py-[17px] font-mono text-sm text-white placeholder:text-muted',
          'outline-none transition-all duration-200',
          'focus:border-accent focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-danger">⚠ {error}</p>}
    </div>
  )
})
Input.displayName = 'Input'
