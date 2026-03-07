'use client'
import { MetricChart } from './MetricChart'
import { cn } from '@/lib/utils'
import { METRIC_META, type MetricType, type MetricPoint } from '@/types'

interface Props {
  type:     MetricType
  points:   MetricPoint[]
  current:  number
  selected?: boolean
  onClick?:  () => void
  threshold?: number
}

function getStatus(type: MetricType, value: number): 'ok' | 'warn' | 'crit' {
  if (['CPU', 'MEMORY', 'DISK', 'ERROR_RATE'].includes(type)) {
    if (value > 85) return 'crit'
    if (value > 70) return 'warn'
  }
  return 'ok'
}

const STATUS_COLOR = { ok: '#22c55e', warn: '#f59e0b', crit: '#ef4444' }

export function MetricCard({ type, points, current, selected, onClick, threshold }: Props) {
  const meta   = METRIC_META[type]
  const status = getStatus(type, current)
  const dot    = STATUS_COLOR[status]

  // Delta vs previous point
  const prev  = points.length >= 2 ? points[points.length - 2]?.v : null
  const delta = prev !== null ? current - prev : null
  const up    = delta !== null && delta > 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-surface border rounded-xl p-4 text-left w-full transition-all hover:border-accent/30',
        selected ? 'border-accent shadow-[0_0_0_1px] shadow-accent/30' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] text-muted uppercase tracking-widest">{meta.label}</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-display font-black text-2xl">{current.toFixed(1)}</span>
            <span className="text-xs text-muted">{meta.unit}</span>
            {delta !== null && Math.abs(delta) > 0.1 && (
              <span className={cn('text-[10px] font-mono', up ? 'text-danger' : 'text-success')}>
                {up ? '↑' : '↓'}{Math.abs(delta).toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: dot }} />
      </div>

      <MetricChart points={points} color={meta.color} height={52} threshold={threshold} />
    </button>
  )
}
