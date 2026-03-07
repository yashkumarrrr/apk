'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PipelineCard } from '@/components/pipelines/PipelineCard'
import { CreatePipelineModal } from '@/components/pipelines/CreatePipelineModal'
import type { Pipeline } from '@/types'

export default function PipelinesPage() {
  const { toast } = useToast()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pipelines')
      const data = await res.json()
      if (data.success) setPipelines(data.data.pipelines)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Poll to refresh status of RUNNING pipelines every 3s
  useEffect(() => {
    const hasRunning = pipelines.some(p => p.lastRun?.status === 'RUNNING' || p.lastRun?.status === 'PENDING')
    if (!hasRunning) return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [pipelines, load])

  async function handleRun(id: string) {
    const res = await fetch(`/api/pipelines/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Failed to trigger run', 'error'); return }
    toast('Pipeline triggered! ▶', 'success')
    await load()
  }

  async function handleDelete(id: string) {
    const p = pipelines.find(x => x.id === id)
    if (!confirm(`Delete "${p?.name}"?`)) return
    const res = await fetch(`/api/pipelines/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPipelines(prev => prev.filter(x => x.id !== id))
      toast('Pipeline deleted.', 'info')
    }
  }

  function handleCreated(p: Pipeline) {
    setPipelines(prev => [p, ...prev])
    toast(`Pipeline "${p.name}" created!`, 'success')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-black text-3xl mb-1">Pipelines</h1>
          <p className="text-muted text-sm">Automate builds, tests and deployments.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Pipeline</Button>
      </div>

      {/* Stats bar */}
      {!loading && pipelines.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total',    val: pipelines.length },
            { label: 'Success',  val: pipelines.filter(p => p.lastRun?.status === 'SUCCESS').length,   cls: 'text-success' },
            { label: 'Failed',   val: pipelines.filter(p => p.lastRun?.status === 'FAILED').length,    cls: 'text-danger' },
            { label: 'Running',  val: pipelines.filter(p => p.lastRun?.status === 'RUNNING').length,   cls: 'text-accent-2' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl px-4 py-3 text-center">
              <div className={`font-display font-black text-2xl ${s.cls ?? ''}`}>{s.val}</div>
              <div className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-5 animate-pulse h-36" />
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h3 className="font-display font-bold text-xl mb-2">No pipelines yet</h3>
          <p className="text-muted text-sm mb-6 max-w-xs">
            Create your first CI/CD pipeline to automate builds, tests, and deployments.
          </p>
          <Button onClick={() => setShowCreate(true)}>Create First Pipeline</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {pipelines.map(p => (
            <PipelineCard key={p.id} pipeline={p} onRun={handleRun} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreatePipelineModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
