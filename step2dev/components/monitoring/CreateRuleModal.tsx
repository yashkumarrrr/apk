'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { METRIC_META, type AlertRule, type MetricType } from '@/types'

interface Props {
  open:      boolean
  onClose:   () => void
  onCreated: (r: AlertRule) => void
}

const METRICS = Object.entries(METRIC_META) as [MetricType, typeof METRIC_META[MetricType]][]

export function CreateRuleModal({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm] = useState({
    name: '', metric: 'CPU' as MetricType,
    comparator: 'gt' as 'gt' | 'lt' | 'eq',
    threshold: '80', severity: 'WARNING' as 'INFO' | 'WARNING' | 'CRITICAL',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); setError('') }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const threshold = parseFloat(form.threshold)
    if (isNaN(threshold)) { setError('Threshold must be a number.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, threshold }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed.'); return }
      onCreated(data.data.rule)
      onClose()
    } catch { setError('Network error.')
    } finally { setLoading(false) }
  }

  const meta = METRIC_META[form.metric]

  return (
    <Modal open={open} onClose={onClose} title="Create Alert Rule" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger">⚠ {error}</div>}

        <Input label="Rule Name" placeholder="High CPU Usage" value={form.name}
          onChange={e => set('name', e.target.value)} required />

        {/* Metric picker */}
        <div>
          <label className="block text-[11px] text-muted tracking-widest uppercase mb-2">Metric</label>
          <div className="grid grid-cols-4 gap-2">
            {METRICS.map(([type, m]) => (
              <button key={type} type="button" onClick={() => set('metric', type)}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  form.metric === type
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-border hover:border-accent/30'
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ background: m.color }} />
                <p className="text-[9px] text-muted leading-tight">{m.label.replace(' Usage','').replace(' Rate','').replace('Response ','')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-[11px] text-muted tracking-widest uppercase mb-2">Condition</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">{meta.label}</span>
            <select value={form.comparator} onChange={e => set('comparator', e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-white outline-none focus:border-accent appearance-none">
              <option value="gt">&gt; greater than</option>
              <option value="lt">&lt; less than</option>
              <option value="eq">= equals</option>
            </select>
            <div className="relative flex-1">
              <Input label="" placeholder="80" value={form.threshold} onChange={e => set('threshold', e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{meta.unit}</span>
            </div>
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-[11px] text-muted tracking-widest uppercase mb-2">Severity</label>
          <div className="flex gap-2">
            {(['INFO','WARNING','CRITICAL'] as const).map(s => (
              <button key={s} type="button" onClick={() => set('severity', s)}
                className={`flex-1 py-2 rounded-xl border text-[11px] font-mono uppercase tracking-wider transition-all ${
                  form.severity === s
                    ? s === 'CRITICAL' ? 'bg-danger/15 border-danger/40 text-danger'
                      : s === 'WARNING' ? 'bg-warning/15 border-warning/40 text-warning'
                      : 'bg-accent/15 border-accent/40 text-accent-2'
                    : 'border-border text-muted hover:border-accent/30'
                }`}>{s}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button type="submit" full loading={loading}>Create Rule</Button>
        </div>
      </form>
    </Modal>
  )
}
