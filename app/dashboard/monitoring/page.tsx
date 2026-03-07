'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MetricCard } from '@/components/monitoring/MetricCard'
import { MetricChart } from '@/components/monitoring/MetricChart'
import { AlertItem } from '@/components/monitoring/AlertItem'
import { CreateRuleModal } from '@/components/monitoring/CreateRuleModal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { METRIC_META, type MetricType, type MetricPoint, type AlertRule, type Alert } from '@/types'

type SeriesMap = Record<MetricType, MetricPoint[]>
type CurrentMap = Record<MetricType, number>

const ALL: MetricType[] = ['CPU','MEMORY','DISK','NETWORK_IN','NETWORK_OUT','REQUESTS','ERROR_RATE','LATENCY']
const KEEP = 60 // keep 60 data points

export default function MonitoringPage() {
  const { toast } = useToast()

  const [series,   setSeries]   = useState<SeriesMap>({} as SeriesMap)
  const [current,  setCurrent]  = useState<CurrentMap>({} as CurrentMap)
  const [selected, setSelected] = useState<MetricType>('CPU')
  const [alerts,   setAlerts]   = useState<Alert[]>([])
  const [rules,    setRules]    = useState<AlertRule[]>([])
  const [tab,      setTab]      = useState<'overview' | 'alerts' | 'rules'>('overview')
  const [showRule, setShowRule] = useState(false)
  const [live,     setLive]     = useState(true)
  const [noServer, setNoServer] = useState(false)
  const [serverName, setServerName] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  // Load historical data
  useEffect(() => {
    fetch('/api/metrics?minutes=30')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        if (!d.data.hasRealData) setNoServer(true)
        if (d.data.serverName) setServerName(d.data.serverName)
        const s = {} as SeriesMap
        const c = {} as CurrentMap
        for (const item of d.data.series) {
          s[item.type as MetricType] = item.points
          c[item.type as MetricType] = item.current
        }
        setSeries(s); setCurrent(c)
      })
  }, [])

  // Load alerts
  const loadAlerts = useCallback(async () => {
    const res  = await fetch('/api/alerts')
    const data = await res.json()
    if (data.success) { setAlerts(data.data.alerts); setRules(data.data.rules) }
  }, [])
  useEffect(() => { loadAlerts() }, [loadAlerts])

  // SSE live metrics
  useEffect(() => {
    if (!live) { esRef.current?.close(); return }

    const es = new EventSource('/api/metrics/stream')
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.noServer) { setNoServer(true); return }
        if (msg.source) { setNoServer(false); setServerName(msg.source) }
        if (msg.__alert) {
          toast(`${msg.severity}: ${msg.name} — ${msg.metric} ${msg.value?.toFixed(1)}`, msg.severity === 'CRITICAL' ? 'error' : 'info')
          loadAlerts()
          return
        }
        const { t, values } = msg
        setSeries(prev => {
          const next = { ...prev }
          for (const type of ALL) {
            const pts = [...(prev[type] ?? []), { t, v: values[type] ?? 0 }]
            next[type] = pts.slice(-KEEP)
          }
          return next
        })
        setCurrent(values)
      } catch { /* skip */ }
    }

    es.onerror = () => { es.close(); setLive(false) }
    return () => { es.close() }
  }, [live, toast, loadAlerts])

  async function ackAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ state: 'ACKNOWLEDGED' }) })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, state: 'ACKNOWLEDGED' } : a))
  }

  async function resolveAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ state: 'RESOLVED' }) })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, state: 'RESOLVED' } : a))
    toast('Alert resolved.', 'success')
  }

  async function dismissAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this rule?')) return
    await fetch(`/api/alerts/rules/${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
    toast('Rule deleted.', 'info')
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch(`/api/alerts/rules/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ enabled }) })
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r))
  }

  const activeCount = alerts.filter(a => a.state === 'ACTIVE').length
  const selectedMeta = METRIC_META[selected]
  const selectedPts  = series[selected] ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-black text-3xl mb-1">Monitoring</h1>
          <p className="text-muted text-sm">Real-time metrics and alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
              live ? 'bg-success/10 border-success/30 text-success' : 'bg-surface border-border text-muted'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-success animate-pulse' : 'bg-muted'}`} />
            {live ? 'LIVE' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* Active alert banner */}
      {activeCount > 0 && (
        <div className="flex items-center gap-3 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
          <span className="text-xl">🔴</span>
          <div className="flex-1">
            <p className="text-sm font-display font-bold text-danger">{activeCount} active alert{activeCount > 1 ? 's' : ''}</p>
            <p className="text-xs text-muted">Review and acknowledge in the Alerts tab.</p>
          </div>
          <button onClick={() => setTab('alerts')} className="text-xs text-danger hover:underline">View →</button>
        </div>
      )}

      {/* No server banner */}
      {noServer && (
        <div className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3">
          <span className="text-xl">🖥️</span>
          <div className="flex-1">
            <p className="text-sm font-display font-bold">No online servers</p>
            <p className="text-xs text-muted">Go to Servers → Add a server → Run connection test. Metrics will appear automatically.</p>
          </div>
          <a href="/dashboard/servers" className="text-xs text-accent-2 hover:underline whitespace-nowrap">Add Server →</a>
        </div>
      )}

      {serverName && !noServer && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse inline-block" />
          Live data from <span className="text-white font-mono">{serverName}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {([
          ['overview', '📊 Overview'],
          ['alerts',   `🔔 Alerts${activeCount > 0 ? ` (${activeCount})` : ''}`],
          ['rules',    '⚙️ Rules'],
        ] as [typeof tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[12px] font-mono transition-all ${
              tab === t ? 'text-white border-b-2 border-accent' : 'text-muted hover:text-white'
            }`}>{label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Metric grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL.map(type => (
              <MetricCard
                key={type}
                type={type}
                points={series[type] ?? []}
                current={current[type] ?? 0}
                selected={selected === type}
                onClick={() => setSelected(type)}
              />
            ))}
          </div>

          {/* Big chart */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-display font-bold text-base">{selectedMeta.label}</p>
                <p className="text-[11px] text-muted">Last {selectedPts.length} data points · refreshes every 2s</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-black text-3xl">{(current[selected] ?? 0).toFixed(1)}</span>
                <span className="text-sm text-muted">{selectedMeta.unit}</span>
              </div>
            </div>
            <MetricChart
              points={selectedPts}
              color={selectedMeta.color}
              height={160}
              width={800}
              showGrid
            />
            {/* X-axis labels */}
            <div className="flex justify-between mt-1.5 px-1">
              {['30m ago', '15m ago', 'now'].map(l => (
                <span key={l} className="text-[10px] text-muted">{l}</span>
              ))}
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Avg CPU',    val: current['CPU']?.toFixed(1) ?? '—',  unit: '%',    color: '#3b82f6' },
              { label: 'Avg Memory', val: current['MEMORY']?.toFixed(1) ?? '—', unit: '%',  color: '#22c55e' },
              { label: 'Error Rate', val: current['ERROR_RATE']?.toFixed(2) ?? '—', unit: '%', color: '#ef4444' },
              { label: 'Latency',    val: current['LATENCY']?.toFixed(0) ?? '—',  unit: 'ms', color: '#f97316' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-xl px-4 py-3">
                <p className="text-[10px] text-muted uppercase tracking-widest mb-1">{s.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-black text-2xl" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-xs text-muted">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ALERTS ── */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-display font-bold text-lg mb-1">No alerts</p>
              <p className="text-muted text-sm">Create alert rules to get notified when metrics cross thresholds.</p>
            </div>
          ) : alerts.map(a => (
            <AlertItem key={a.id} alert={a} onAck={ackAlert} onResolve={resolveAlert} onDismiss={dismissAlert} />
          ))}
        </div>
      )}

      {/* ── RULES ── */}
      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowRule(true)}>+ New Rule</Button>
          </div>

          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-3">⚙️</div>
              <p className="font-display font-bold text-lg mb-1">No rules yet</p>
              <p className="text-muted text-sm mb-6">Set thresholds to automatically generate alerts.</p>
              <Button onClick={() => setShowRule(true)}>Create First Rule</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(r => {
                const meta = METRIC_META[r.metric]
                return (
                  <div key={r.id} className="flex items-center gap-4 bg-surface border border-border rounded-xl px-5 py-4">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-bold">{r.name}</p>
                      <p className="text-[11px] text-muted">
                        {meta.label} {r.comparator === 'gt' ? '>' : r.comparator === 'lt' ? '<' : '='} {r.threshold}{meta.unit}
                        <span className={`ml-2 ${
                          r.severity === 'CRITICAL' ? 'text-danger' : r.severity === 'WARNING' ? 'text-warning' : 'text-accent-2'
                        }`}>· {r.severity}</span>
                      </p>
                    </div>

                    {/* Toggle */}
                    <button onClick={() => toggleRule(r.id, !r.enabled)}
                      className={`relative w-10 h-5 rounded-full transition-all ${r.enabled ? 'bg-success' : 'bg-surface-3'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${r.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>

                    <button onClick={() => deleteRule(r.id)}
                      className="text-muted/40 hover:text-danger transition-colors text-lg">×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <CreateRuleModal
        open={showRule}
        onClose={() => setShowRule(false)}
        onCreated={(r) => { setRules(p => [r, ...p]); toast(`Rule "${r.name}" created!`, 'success') }}
      />
    </div>
  )
}
