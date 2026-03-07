'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SEVERITY_CFG, timeAgo, type Alert } from '@/types'

interface Props {
  alert:      Alert
  onAck:      (id: string) => void
  onResolve:  (id: string) => void
  onDismiss:  (id: string) => void
}

export function AlertItem({ alert, onAck, onResolve, onDismiss }: Props) {
  const [loading, setLoading] = useState(false)
  const cfg = SEVERITY_CFG[alert.severity]

  async function act(fn: (id: string) => void) {
    setLoading(true)
    try { fn(alert.id) } finally { setLoading(false) }
  }

  return (
    <div className={cn('flex items-start gap-3 p-4 border rounded-xl transition-all', cfg.bg)}>
      <span className="text-lg flex-shrink-0 mt-0.5">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn('text-sm font-display font-bold', cfg.color)}>{alert.title}</p>
          <span className={cn(
            'text-[9px] border rounded px-1.5 py-0.5 uppercase tracking-wider font-mono',
            alert.state === 'ACTIVE' ? 'border-danger/40 text-danger' :
            alert.state === 'ACKNOWLEDGED' ? 'border-warning/40 text-warning' :
            'border-success/40 text-success'
          )}>
            {alert.state}
          </span>
        </div>
        <p className="text-xs text-muted">{alert.message}</p>
        <p className="text-[10px] text-muted/60 mt-1">{timeAgo(alert.createdAt)}</p>
      </div>

      {alert.state === 'ACTIVE' && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => act(onAck)} disabled={loading}
            className="px-2.5 py-1 text-[10px] border border-warning/30 text-warning rounded-lg hover:bg-warning/10 transition-colors font-mono disabled:opacity-50">
            ACK
          </button>
          <button onClick={() => act(onResolve)} disabled={loading}
            className="px-2.5 py-1 text-[10px] border border-success/30 text-success rounded-lg hover:bg-success/10 transition-colors font-mono disabled:opacity-50">
            RESOLVE
          </button>
        </div>
      )}

      <button onClick={() => onDismiss(alert.id)}
        className="text-muted/40 hover:text-muted transition-colors text-lg leading-none flex-shrink-0 mt-0.5">×</button>
    </div>
  )
}
