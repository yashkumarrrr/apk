'use client'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open,   setOpen]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setNotifs(d.data.notifications.slice(0, 10))
          setUnread(d.data.unread)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read-all' }),
    })
    setNotifs(p => p.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(u => Math.max(0, u - 1))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-white transition-colors"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-display font-bold text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-muted hover:text-white transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm text-muted">No notifications yet</p>
              </div>
            ) : notifs.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.read) markOne(n.id) }}
                className={cn(
                  'px-4 py-3 hover:bg-surface-3 transition-colors cursor-pointer',
                  !n.read && 'bg-accent/5'
                )}
              >
                <div className="flex items-start gap-2">
                  {n.icon && <span className="text-base flex-shrink-0 mt-0.5">{n.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                      <p className={cn('text-xs font-medium truncate', !n.read ? 'text-white' : 'text-muted')}>{n.title}</p>
                    </div>
                    <p className="text-[11px] text-muted truncate mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted/40 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-accent-2 hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
