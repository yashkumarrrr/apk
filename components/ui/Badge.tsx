import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  variant?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'
  size?: 'sm' | 'xs'
}

const variants = {
  blue:   'bg-accent/15 text-accent-2 border-accent/30',
  green:  'bg-success/15 text-success border-success/30',
  yellow: 'bg-warning/15 text-warning border-warning/30',
  red:    'bg-danger/15 text-danger border-danger/30',
  gray:   'bg-surface-2 text-muted border-border',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

export function Badge({ children, variant = 'gray', size = 'sm' }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center border rounded-md font-mono',
      size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5',
      variants[variant]
    )}>
      {children}
    </span>
  )
}
