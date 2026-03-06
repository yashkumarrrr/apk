'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ServerCard } from '@/components/servers/ServerCard'
import { AddServerModal } from '@/components/servers/AddServerModal'
import type { Server } from '@/types'

export default function ServersPage() {
  const { toast } = useToast()
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/servers')
      const data = await res.json()
      if (data.success) setServers(data.data.servers)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleTest(id: string) {
    toast('Testing connection…', 'info')
    const res  = await fetch(`/api/servers/${id}/test`, { method: 'POST' })
    const data = await res.json()
    if (!data.success) { toast(data.error ?? 'Connection failed', 'error'); return }
    if (data.data.success) {
      toast(`✓ Connected! Latency: ${data.data.latency}ms`, 'success')
    } else {
      toast(`✕ ${data.data.error}`, 'error')
    }
    // Refresh to get updated stats
    setServers(prev => prev.map(s => s.id === id ? { ...s, ...data.data.server } : s))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setServers(prev => prev.filter(s => s.id !== id))
      toast('Server removed.', 'info')
    }
  }

  function handleUpdate(updated: Server) {
    setServers(prev => prev.map(s => s.id === updated.id ? updated : s))
  }

  function handleAdded(s: Server) {
    setServers(prev => [s, ...prev])
    toast(`"${s.name}" added!`, 'success')
  }

  const online  = servers.filter(s => s.status === 'ONLINE').length
  const offline = servers.filter(s => s.status === 'OFFLINE').length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-black text-3xl mb-1">Servers</h1>
          <p className="text-muted text-sm">Manage and monitor your infrastructure.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Server</Button>
      </div>

      {/* Stats */}
      {!loading && servers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',   val: servers.length, cls: '' },
            { label: 'Online',  val: online,          cls: 'text-success' },
            { label: 'Offline', val: offline,         cls: offline > 0 ? 'text-danger' : 'text-muted' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl px-4 py-3 text-center">
              <div className={`font-display font-black text-2xl ${s.cls}`}>{s.val}</div>
              <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="bg-surface border border-border rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">🖥️</div>
          <h3 className="font-display font-bold text-xl mb-2">No servers yet</h3>
          <p className="text-muted text-sm mb-6 max-w-xs">
            Add your first server to manage infrastructure, run commands, and monitor resources.
          </p>
          <Button onClick={() => setShowAdd(true)}>Add First Server</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {servers.map(s => (
            <ServerCard
              key={s.id}
              server={s}
              onDelete={handleDelete}
              onTest={handleTest}
              onUpdate={handleUpdate}
            />
          ))}

          {/* Add card */}
          <button
            onClick={() => setShowAdd(true)}
            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted hover:border-accent/40 hover:text-accent-2 transition-all min-h-[180px] group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">+</span>
            <span className="text-sm font-mono">Add Server</span>
          </button>
        </div>
      )}

      <AddServerModal open={showAdd} onClose={() => setShowAdd(false)} onAdded={handleAdded} />
    </div>
  )
}
