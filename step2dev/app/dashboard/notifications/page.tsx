'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Notif {
  id:        string
  type:      string
  title:     string
  body:      string
  read:      boolean
  link:      string | null
  icon:      string | null
  createdAt: string
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  if (d < 60_000)    return 'just now'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}

export default function NotificationsPage() {
  const [notifs,    setNotifs]  = useState<Notif[]>([])
  const [loading,   setLoading] = useState(true)
  const [filter,    setFilter]  = useState<'all' | 'unread'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/notifications')
    const data = await res.json()
    if (data.success) setNotifs(data.data.notifications)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read-all' }) })
    setNotifs(p => p.map(n => ({ ...n, read: true })))
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    setNotifs(p => p.filter(n => n.id !== id))
  }

  const displayed = filter === 'unread' ? notifs.filter(n => !n.read) : notifs
  const unreadCount = notifs.filter(n => !n.read).length

  const TYPE_COLORS: Record<string, string> = {
    pipeline_fail:    'border-l-[#f85149]',
    pipeline_success: 'border-l-[#3fb950]',
    server_offline:   'border-l-[#f0883e]',
    alert_fired:      'border-l-[#d29922]',
    system:           'border-l-[#2563eb]',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-3xl mb-1">Notifications</h1>
          <p className="text-muted text-sm">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 text-xs font-mono text-muted hover:text-white border border-border hover:border-accent/40 rounded-lg transition-all"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-mono transition-all capitalize',
              filter === f ? 'bg-accent text-white font-bold' : 'text-muted hover:text-white'
            )}
          >
            {f} {f === 'unread' && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl py-16 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-sm font-mono text-muted">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-xs text-muted/50 mt-1">
            Notifications appear when pipelines run, servers go offline, or alerts fire.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(n => (
            <div
              key={n.id}
              className={cn(
                'bg-surface border border-border rounded-xl overflow-hidden border-l-2 transition-all group',
                TYPE_COLORS[n.type] ?? 'border-l-border',
                !n.read && 'bg-surface border-accent/20'
              )}
            >
              <div className="flex items-start gap-3 p-4">
                {n.icon && <span className="text-lg flex-shrink-0 mt-0.5">{n.icon}</span>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-medium leading-tight', !n.read && 'text-white font-bold')}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                      <span className="text-[10px] text-muted font-mono">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {n.link && (
                      <Link href={n.link} onClick={() => markRead(n.id)} className="text-[11px] text-accent-2 hover:underline font-mono">
                        View →
                      </Link>
                    )}
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="text-[11px] text-muted hover:text-white transition-colors">
                        Mark read
                      </button>
                    )}
                    <button onClick={() => dismiss(n.id)} className="text-[11px] text-muted/40 hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
