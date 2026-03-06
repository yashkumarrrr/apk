'use client'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { PipelineLog, RunStatus } from '@/types'

interface Props {
  runId: string
  initialStatus: RunStatus
  onStatusChange?: (s: RunStatus) => void
}

const LEVEL_CLS: Record<string, string> = {
  command: 'text-accent-2',
  success: 'text-success',
  error:   'text-danger',
  warn:    'text-warning',
  info:    'text-muted',
}

export function LiveLogViewer({ runId, initialStatus, onStatusChange }: Props) {
  const [logs, setLogs] = useState<PipelineLog[]>([])
  const [status, setStatus] = useState<RunStatus>(initialStatus)
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef(new Set<string>())

  useEffect(() => {
    const es = new EventSource(`/api/pipeline-runs/${runId}/stream`)
    setConnected(true)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.__status) {
          const s = data.__status as RunStatus
          setStatus(s)
          onStatusChange?.(s)
          if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(s)) {
            es.close()
            setConnected(false)
          }
          return
        }
        if (!seenIds.current.has(data.id)) {
          seenIds.current.add(data.id)
          setLogs(prev => [...prev, data])
        }
      } catch { /* skip */ }
    }

    es.onerror = () => { setConnected(false); es.close() }
    return () => { es.close(); setConnected(false) }
  }, [runId, onStatusChange])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const isFinished = ['SUCCESS', 'FAILED', 'CANCELLED'].includes(status)

  return (
    <div className="bg-[#010409] border border-border rounded-xl overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted">Run logs</span>
          {!isFinished && connected && (
            <span className="flex items-center gap-1.5 text-[10px] text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-danger/60" />
          <div className="w-3 h-3 rounded-full bg-warning/60" />
          <div className="w-3 h-3 rounded-full bg-success/60" />
        </div>
      </div>

      {/* Log body */}
      <div className="h-[420px] overflow-y-auto p-4 font-mono text-[12px] leading-relaxed">
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 text-muted">
            <span className="w-2 h-4 bg-accent-2 animate-pulse inline-block" />
            <span>Waiting for logs…</span>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div key={log.id} className={cn('flex gap-3 mb-0.5 group', log.message.startsWith('━') ? 'mt-3 mb-1' : '')}>
                <span className="text-muted/40 flex-shrink-0 select-none w-[52px] text-right text-[10px] pt-0.5">
                  {log.seq.toString().padStart(3, '0')}
                </span>
                <span className={cn(
                  'flex-1 break-all',
                  log.message.startsWith('━') ? 'text-surface-3 font-bold' : LEVEL_CLS[log.level] ?? 'text-muted'
                )}>
                  {log.message}
                </span>
              </div>
            ))}
            {!isFinished && (
              <div className="flex items-center gap-2 text-muted mt-1">
                <span className="w-2 h-4 bg-accent-2 animate-pulse inline-block" />
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      {isFinished && (
        <div className={cn(
          'px-4 py-2.5 border-t border-border text-[11px] font-mono flex items-center gap-2',
          status === 'SUCCESS' ? 'text-success bg-success/5' : 'text-danger bg-danger/5'
        )}>
          <span>{status === 'SUCCESS' ? '✓' : '✕'}</span>
          Pipeline {status === 'SUCCESS' ? 'completed successfully' : 'failed'} · {logs.length} log lines
        </div>
      )}
    </div>
  )
}
