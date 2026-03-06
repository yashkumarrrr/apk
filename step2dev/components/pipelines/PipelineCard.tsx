'use client'
import { useState } from 'react'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'
import { formatDuration, timeAgo, type Pipeline } from '@/types'
import Link from 'next/link'

interface Props {
  pipeline: Pipeline
  onRun:    (id: string) => Promise<void>
  onDelete: (id: string) => void
}

export function PipelineCard({ pipeline, onRun, onDelete }: Props) {
  const [running,  setRunning]  = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const lastRun     = pipeline.lastRun
  const triggerIcon = pipeline.trigger === 'PUSH' ? '🚀' : pipeline.trigger === 'SCHEDULE' ? '⏰' : '🖱️'
  const triggerLabel = pipeline.trigger === 'PUSH' ? 'auto·push' : pipeline.trigger === 'SCHEDULE' ? 'scheduled' : 'manual'

  async function handleRun() {
    setRunning(true)
    try { await onRun(pipeline.id) } finally { setRunning(false) }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-all group">

      {/* Top row */}
      <div className="flex items-start justify-between mb-4">

        {/* Left: icon + name + meta */}
        <div className="flex items-center gap-3 min-w-0">
          {pipeline.project && (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${pipeline.project.color}20`, border: `1px solid ${pipeline.project.color}40` }}
            >
              {pipeline.project.icon}
            </div>
          )}
          <div className="min-w-0">
            {/* Name + trigger badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/dashboard/pipelines/${pipeline.id}`}
                className="font-display font-bold text-[15px] hover:text-accent-2 transition-colors"
              >
                {pipeline.name}
              </Link>
              <span className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 text-muted flex-shrink-0">
                {triggerIcon} {triggerLabel}
              </span>
            </div>
            {/* Branch + project + enabled */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-muted">⎇ {pipeline.branch}</span>
              {pipeline.project && (
                <span className="text-[11px] text-muted">· {pipeline.project.name}</span>
              )}
              <span className={cn(
                'text-[10px] border rounded px-1.5 py-0.5',
                pipeline.enabled ? 'border-success/30 text-success' : 'border-border text-muted'
              )}>
                {pipeline.enabled ? 'enabled' : 'disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
          <button
            onClick={handleRun}
            disabled={running || !pipeline.enabled}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-[11px] font-mono rounded-lg hover:bg-accent-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
            ) : '▶'}
            Run
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-white transition-colors"
            >···</button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-surface-2 border border-border rounded-xl shadow-xl py-1 min-w-[160px]">
                  <Link
                    href={`/dashboard/pipelines/${pipeline.id}`}
                    className="block px-4 py-2 text-sm text-muted hover:text-white hover:bg-surface-3 transition-colors"
                  >
                    View details
                  </Link>
                  <Link
                    href={`/dashboard/pipelines/${pipeline.id}/settings`}
                    className="block px-4 py-2 text-sm text-muted hover:text-white hover:bg-surface-3 transition-colors"
                  >
                    ⚙ Settings
                  </Link>
                  <div className="h-px bg-border mx-2 my-1" />
                  <button
                    onClick={() => { onDelete(pipeline.id); setMenuOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                  >
                    🗑 Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stages pipeline */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {pipeline.stages.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span className="text-[11px] px-2 py-1 bg-surface-2 border border-border rounded text-muted">{s}</span>
            {i < pipeline.stages.length - 1 && <span className="text-border text-xs">›</span>}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          {lastRun ? (
            <>
              <StatusBadge status={lastRun.status} size="xs" pulse={lastRun.status === 'RUNNING'} />
              <span className="text-[11px] text-muted">{formatDuration(lastRun.duration)}</span>
            </>
          ) : (
            <span className="text-[11px] text-muted">No runs yet</span>
          )}
        </div>
        <span className="text-[11px] text-muted">
          {lastRun ? timeAgo(lastRun.createdAt) : timeAgo(pipeline.createdAt)}
        </span>
      </div>

    </div>
  )
}
