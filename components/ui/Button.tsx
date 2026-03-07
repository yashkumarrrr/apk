import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  loading?: boolean
  full?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', loading, full, className, children, disabled, ...props }, ref) => {
    const v = {
      primary: 'bg-accent text-white hover:bg-accent-2 hover:shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:-translate-y-0.5',
      ghost:   'bg-transparent border border-border text-muted hover:border-accent hover:text-accent-2',
      danger:  'bg-danger text-white hover:bg-red-500',
    }[variant]

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-display font-bold tracking-[3px] uppercase',
          'text-[12px] px-6 py-[16px] rounded-xl transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0',
          v, full && 'w-full', className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Loading...
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
