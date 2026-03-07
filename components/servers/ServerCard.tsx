'use client'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { OS_ICONS, OS_LABELS, formatUptime, timeAgo, type Server } from '@/types'

interface Props {
  server: Server
  onDelete: (id: string) => void
  onTest: (id: string) => Promise<void>
  onUpdate: (s: Server) => void
}

const STATUS_CFG = {
  ONLINE:  { dot: 'bg-success animate-pulse', label: 'Online',  cls: 'text-success' },
  OFFLINE: { dot: 'bg-danger',                label: 'Offline', cls: 'text-danger' },
  UNKNOWN: { dot: 'bg-muted',                 label: 'Unknown', cls: 'text-muted' },
}

function StatBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value ?? 0
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-muted">{label}</span>
        <span className="text-white">{value !== null ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function ServerCard({ server, onDelete, onTest, onUpdate }: Props) {
  const [testing, setTesting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const cfg = STATUS_CFG[server.status]

  async function handleTest() {
    setTesting(true)
    try { await onTest(server.id) } finally { setTesting(false); setMenuOpen(false) }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${server.name}"?`)) return
    onDelete(server.id)
    setMenuOpen(false)
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-xl flex-shrink-0">
            {OS_ICONS[server.os]}
          </div>
          <div>
            <Link href={`/dashboard/servers/${server.id}`} className="font-display font-bold text-[15px] hover:text-accent-2 transition-colors block">
              {server.name}
            </Link>
            <p className="text-[11px] text-muted font-mono">{server.username}@{server.host}:{server.port}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
            <span className={cn('text-[11px]', cfg.cls)}>{cfg.label}</span>
          </div>

          {/* Menu */}
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-white transition-colors"
            >···</button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-surface-2 border border-border rounded-xl shadow-xl py-1 min-w-[160px]">
                  <Link href={`/dashboard/servers/${server.id}`} className="block px-4 py-2 text-sm text-muted hover:text-white hover:bg-surface-3 transition-colors">
                    🖥️ Open Terminal
                  </Link>
                  <button onClick={handleTest} disabled={testing} className="w-full text-left px-4 py-2 text-sm text-muted hover:text-white hover:bg-surface-3 transition-colors disabled:opacity-50">
                    {testing ? '⟳ Testing…' : '⚡ Test Connection'}
                  </button>
                  <div className="h-px bg-border mx-2 my-1" />
                  <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors">
                    🗑 Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats bars */}
      {server.status === 'ONLINE' && (
        <div className="space-y-2.5 mb-4">
          <StatBar label="CPU"  value={server.cpuUsage}  color="#3b82f6" />
          <StatBar label="RAM"  value={server.memUsage}  color="#22c55e" />
          <StatBar label="Disk" value={server.diskUsage} color="#f59e0b" />
        </div>
      )}

      {server.status !== 'ONLINE' && (
        <div className="mb-4 py-3 text-center text-[11px] text-muted bg-surface-2 rounded-lg">
          {server.status === 'OFFLINE' ? 'Server is unreachable' : 'Run connection test to get stats'}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">{OS_LABELS[server.os]}</span>
          {server.uptime !== null && (
            <span className="text-[10px] border border-border text-muted rounded px-1.5 py-0.5">
              ↑ {formatUptime(server.uptime)}
            </span>
          )}
          {server.tags.map(t => (
            <span key={t} className="text-[10px] border border-border text-muted rounded px-1.5 py-0.5">{t}</span>
          ))}
        </div>
        <span className="text-[11px] text-muted">{timeAgo(server.lastPingedAt ?? server.updatedAt)}</span>
      </div>
    </div>
  )
}
