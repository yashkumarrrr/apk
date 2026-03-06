import { cn } from '@/lib/utils'
import type { RunStatus } from '@/types'

interface Props {
  status: RunStatus
  size?: 'sm' | 'xs'
  pulse?: boolean
}

const CFG: Record<RunStatus, { label: string; cls: string; dot: string }> = {
  PENDING:   { label: 'Pending',   cls: 'bg-surface-2 text-muted border-border',             dot: 'bg-muted' },
  RUNNING:   { label: 'Running',   cls: 'bg-accent/10 text-accent-2 border-accent/30',        dot: 'bg-accent-2' },
  SUCCESS:   { label: 'Success',   cls: 'bg-success/10 text-success border-success/30',       dot: 'bg-success' },
  FAILED:    { label: 'Failed',    cls: 'bg-danger/10 text-danger border-danger/30',          dot: 'bg-danger' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-warning/10 text-warning border-warning/30',      dot: 'bg-warning' },
}

export function StatusBadge({ status, size = 'sm', pulse = false }: Props) {
  const c = CFG[status]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 border rounded-md font-mono',
      size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-[10px] px-2 py-0.5',
      c.cls
    )}>
      <span className={cn(
        'rounded-full flex-shrink-0',
        size === 'sm' ? 'w-1.5 h-1.5' : 'w-1 h-1',
        c.dot,
        pulse && status === 'RUNNING' ? 'animate-pulse' : ''
      )} />
      {c.label}
    </span>
  )
}
