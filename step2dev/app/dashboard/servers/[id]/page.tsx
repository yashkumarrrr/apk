'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ServerTerminal } from '@/components/servers/ServerTerminal'
import { useToast } from '@/components/ui/Toast'
import { OS_ICONS, OS_LABELS, formatUptime, timeAgo, type Server } from '@/types'

function StatGauge({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value ?? 0
  const stroke = 2 * Math.PI * 36
  const offset = stroke - (pct / 100) * stroke
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="rotate-[-90deg]" width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#30363d" strokeWidth="6" />
          <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={stroke} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold text-sm">{value !== null ? `${pct}%` : '—'}</span>
        </div>
      </div>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  )
}

export default function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [server, setServer] = useState<Server | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing,     setTesting]     = useState(false)
  const [aiAnalysis,  setAiAnalysis]  = useState<string | null>(null)
  const [analyzing,   setAnalyzing]   = useState(false)
  const [tab, setTab] = useState<'terminal' | 'info'>('terminal')

  useEffect(() => {
    fetch(`/api/servers/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setServer(d.data.server) })
      .finally(() => setLoading(false))
  }, [id])

  async function analyzeServer() {
    setAnalyzing(true)
    setAiAnalysis(null)
    try {
      const res  = await fetch('/api/ai/analyze-server', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ serverId: id }),
      })
      const data = await res.json()
      if (data.success) setAiAnalysis(data.data.analysis)
      else toast(data.error ?? 'Analysis failed', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    toast('Testing connection…', 'info')
    try {
      const res  = await fetch(`/api/servers/${id}/test`, { method: 'POST' })
      const data = await res.json()
      if (data.data.success) {
        toast(`✓ Connected! Latency: ${data.data.latency}ms`, 'success')
        setServer(prev => prev ? { ...prev, ...data.data.server } : prev)
      } else {
        toast(`✕ ${data.data.error}`, 'error')
        setServer(prev => prev ? { ...prev, status: 'OFFLINE' } : prev)
      }
    } finally { setTesting(false) }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${server?.name}"?`)) return
    await fetch(`/api/servers/${id}`, { method: 'DELETE' })
    toast('Server deleted.', 'info')
    router.push('/dashboard/servers')
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="bg-surface border border-border rounded-xl h-24 animate-pulse" />)}
    </div>
  )

  if (!server) return (
    <div className="text-center py-20">
      <p className="text-muted">Server not found.</p>
      <Link href="/dashboard/servers" className="text-accent-2 text-sm hover:underline mt-2 inline-block">← Back</Link>
    </div>
  )

  const statusColor = server.status === 'ONLINE' ? '#22c55e' : server.status === 'OFFLINE' ? '#ef4444' : '#7d8590'

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/dashboard/servers" className="text-xs text-muted hover:text-accent-2 transition-colors">
          ← Servers
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-2xl">
              {OS_ICONS[server.os]}
            </div>
            <div>
              <h1 className="font-display font-black text-3xl mb-0.5">{server.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: statusColor }} />
                <span style={{ color: statusColor }}>{server.status}</span>
                <span>·</span>
                <span className="font-mono">{server.username}@{server.host}:{server.port}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleTest} loading={testing} variant="ghost">
              ⚡ Test Connection
            </Button>
            <button onClick={handleDelete}
              className="px-3 py-2 border border-danger/30 text-danger text-xs rounded-lg hover:bg-danger/10 transition-colors font-mono">
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stats gauges */}
      {server.status === 'ONLINE' && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-bold text-sm">Resource Usage</p>
            {server.uptime !== null && (
              <span className="text-[11px] text-muted">Uptime: {formatUptime(server.uptime)}</span>
            )}
          </div>
          <div className="flex items-center justify-around">
            <StatGauge label="CPU"  value={server.cpuUsage}  color="#3b82f6" />
            <StatGauge label="RAM"  value={server.memUsage}  color="#22c55e" />
            <StatGauge label="Disk" value={server.diskUsage} color="#f59e0b" />
          </div>
          {server.lastPingedAt && (
            <p className="text-center text-[10px] text-muted mt-3">
              Last updated {timeAgo(server.lastPingedAt)}
            </p>
          )}
        </div>
      )}

      {server.status !== 'ONLINE' && (
        <div className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-sm mb-1">
              {server.status === 'OFFLINE' ? '⚠ Server Unreachable' : 'Connection Unknown'}
            </p>
            <p className="text-muted text-xs">Run a connection test to get live stats.</p>
          </div>
          <Button onClick={handleTest} loading={testing}>Test Now</Button>
          <button
            onClick={analyzeServer}
            disabled={analyzing || server.status !== 'ONLINE'}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono rounded-lg hover:bg-purple-500/20 transition-colors disabled:opacity-40"
          >
            {analyzing ? '🤖 Analyzing…' : '🤖 AI Diagnose'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {(['terminal', 'info'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[12px] font-mono transition-all capitalize ${
              tab === t ? 'text-white border-b-2 border-accent' : 'text-muted hover:text-white'
            }`}>
            {t === 'terminal' ? '🖥️ Terminal' : 'ℹ️ Info'}
          </button>
        ))}
      </div>

      {tab === 'terminal' && (
        <ServerTerminal
          serverId={server.id}
          serverName={server.name}
          username={server.username}
          host={server.host}
        />
      )}

      {tab === 'info' && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
            {[
              ['Name',       server.name],
              ['Host',       server.host],
              ['Port',       String(server.port)],
              ['Username',   server.username],
              ['OS',         `${OS_ICONS[server.os]} ${OS_LABELS[server.os]}`],
              ['Auth Type',  server.authType],
              ['Status',     server.status],
              ['Added',      new Date(server.createdAt).toLocaleDateString()],
              ['Tags',       server.tags.join(', ') || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] text-muted tracking-widest uppercase mb-1">{k}</p>
                <p className="font-mono text-xs">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
