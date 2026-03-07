'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/pipelines/StatusBadge'
import { StageTrack } from '@/components/pipelines/StageTrack'
import { LiveLogViewer } from '@/components/pipelines/LiveLogViewer'
import { useToast } from '@/components/ui/Toast'
import { formatDuration, timeAgo, type Pipeline, type PipelineRun, type PipelineLog, type RunStatus } from '@/types'

export default function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [activeRun, setActiveRun] = useState<PipelineRun | null>(null)
  const [activeLogs, setActiveLogs] = useState<PipelineLog[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering,  setTriggering]  = useState(false)
  const [aiAnalysis,  setAiAnalysis]  = useState<string | null>(null)
  const [analyzing,   setAnalyzing]   = useState(false)

  const loadPipeline = useCallback(async () => {
    const [pRes, rRes] = await Promise.all([
      fetch(`/api/pipelines/${id}`),
      fetch(`/api/pipelines/${id}/runs`),
    ])
    const [pData, rData] = await Promise.all([pRes.json(), rRes.json()])
    if (pData.success) setPipeline(pData.data.pipeline)
    if (rData.success) {
      setRuns(rData.data.runs)
      // Auto-select most recent run
      if (rData.data.runs.length > 0 && !activeRun) {
        setActiveRun(rData.data.runs[0])
      }
    }
    setLoading(false)
  }, [id, activeRun])

  useEffect(() => { loadPipeline() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load logs for active run
  useEffect(() => {
    if (!activeRun) return
    fetch(`/api/pipeline-runs/${activeRun.id}/logs`)
      .then(r => r.json())
      .then(d => { if (d.success) setActiveLogs(d.data.logs) })
      .catch(() => setActiveLogs([]))
  }, [activeRun?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function analyzeRun(runId: string) {
    setAnalyzing(true)
    setAiAnalysis(null)
    try {
      const res  = await fetch('/api/ai/analyze-pipeline', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ runId }),
      })
      const data = await res.json()
      if (data.success) setAiAnalysis(data.data.analysis)
      else toast(data.error ?? 'AI analysis failed', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  async function triggerRun() {
    setTriggering(true)
    try {
      const res = await fetch(`/api/pipelines/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Failed to trigger run', 'error'); return }
      toast('Pipeline triggered! ▶', 'success')
      const newRun = data.data.run as PipelineRun
      setRuns(prev => [newRun, ...prev])
      setActiveRun(newRun)
      setActiveLogs([])
    } finally {
      setTriggering(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete pipeline "${pipeline?.name}"? All runs will be deleted.`)) return
    await fetch(`/api/pipelines/${id}`, { method: 'DELETE' })
    toast('Pipeline deleted.', 'info')
    router.push('/dashboard/pipelines')
  }

  function handleStatusChange(s: RunStatus) {
    setActiveRun(prev => prev ? { ...prev, status: s } : prev)
    setRuns(prev => prev.map(r => r.id === activeRun?.id ? { ...r, status: s } : r))
    // Refresh run list to get duration
    if (['SUCCESS', 'FAILED'].includes(s)) {
      setTimeout(loadPipeline, 1000)
    }
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="bg-surface border border-border rounded-xl h-24 animate-pulse" />)}
    </div>
  )

  if (!pipeline) return (
    <div className="text-center py-20">
      <p className="text-muted">Pipeline not found.</p>
      <Link href="/dashboard/pipelines" className="text-accent-2 text-sm hover:underline mt-2 inline-block">← Back to pipelines</Link>
    </div>
  )

  const isRunning = activeRun?.status === 'RUNNING' || activeRun?.status === 'PENDING'

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/dashboard/pipelines" className="text-xs text-muted hover:text-accent-2 transition-colors">
          ← Pipelines
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="font-display font-black text-3xl mb-1">{pipeline.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted">
              {pipeline.project && <span>{pipeline.project.icon} {pipeline.project.name}</span>}
              <span>·</span>
              <span>⎇ {pipeline.branch}</span>
              <span>·</span>
              <span className={pipeline.enabled ? 'text-success' : 'text-muted'}>
                {pipeline.enabled ? '● enabled' : '○ disabled'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={triggerRun}
              loading={triggering}
              disabled={!pipeline.enabled || isRunning}
              className="gap-2"
            >
              ▶ Run Pipeline
            </Button>
            <Link
              href={`/dashboard/pipelines/${id}/settings`}
              className="px-3 py-2 border border-border text-muted text-xs rounded-lg hover:border-accent/40 hover:text-white transition-colors font-mono"
            >
              ⚙ Settings
            </Link>
            <button
              onClick={handleDelete}
              className="px-3 py-2 border border-danger/30 text-danger text-xs rounded-lg hover:bg-danger/10 transition-colors font-mono"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stage track */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[10px] text-muted uppercase tracking-widest mb-3">Stages</p>
        <div className="overflow-x-auto">
          <StageTrack
            stages={pipeline.stages}
            status={activeRun?.status ?? 'PENDING'}
            logs={activeLogs}
          />
        </div>
      </div>

      {/* Two column: run history + log viewer */}
      <div className="grid grid-cols-[280px_1fr] gap-4">
        {/* Run history */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-display font-bold">Run History</p>
          </div>
          <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
            {runs.length === 0 ? (
              <p className="text-xs text-muted px-4 py-6 text-center">No runs yet</p>
            ) : runs.map(run => (
              <button
                key={run.id}
                onClick={() => { setActiveRun(run); setActiveLogs([]) }}
                className={`w-full text-left px-4 py-3 hover:bg-surface-2 transition-colors ${activeRun?.id === run.id ? 'bg-surface-2 border-l-2 border-l-accent' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <StatusBadge status={run.status} size="xs" pulse={run.status === 'RUNNING'} />
                  <span className="text-[10px] text-muted">{timeAgo(run.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted mt-1">
                  <span>⎇ {run.branch}</span>
                  {run.commit && <span>· {run.commit}</span>}
                  {run.duration && <span>· {formatDuration(run.duration)}</span>}
                </div>
                <div className="text-[10px] text-muted mt-0.5">by {run.triggeredBy}</div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        {activeRun && (activeRun.status === 'FAILED' || activeRun.status === 'SUCCESS') && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <span className="font-mono text-xs font-bold">AI Analysis</span>
                {activeRun.status === 'FAILED' && (
                  <span className="text-[10px] bg-danger/10 border border-danger/20 text-danger rounded px-1.5 py-0.5">failure detected</span>
                )}
              </div>
              {!aiAnalysis && (
                <button
                  onClick={() => analyzeRun(activeRun.id)}
                  disabled={analyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] font-mono rounded-lg hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                >
                  {analyzing ? (
                    <><span className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin" /> Analyzing…</>
                  ) : '✦ Analyze with AI'}
                </button>
              )}
            </div>
            {aiAnalysis ? (
              <div className="p-4 text-[13px] text-[#c9d1d9] leading-relaxed whitespace-pre-wrap font-mono">
                {aiAnalysis}
              </div>
            ) : (
              <div className="px-4 py-3 text-[12px] text-muted">
                {analyzing
                  ? 'Reading your logs and diagnosing the issue…'
                  : 'Click "Analyze with AI" to get an instant diagnosis of this run.'}
              </div>
            )}
          </div>
        )}

        {/* Log viewer */}
        <div>
          {activeRun ? (
            <LiveLogViewer
              runId={activeRun.id}
              initialStatus={activeRun.status}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="bg-[#010409] border border-border rounded-xl h-[480px] flex flex-col items-center justify-center gap-3">
              <div className="text-4xl">⚡</div>
              <p className="text-muted text-sm">Trigger a run to see live logs</p>
              <Button onClick={triggerRun} loading={triggering} disabled={!pipeline.enabled}>
                ▶ Run Pipeline
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline info */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="font-display font-bold text-sm mb-4">Pipeline Config</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            ['Trigger',    pipeline.trigger],
            ['Branch',     pipeline.branch],
            ['Repo',       pipeline.repoUrl ?? '—'],
            ['Created',    new Date(pipeline.createdAt).toLocaleDateString()],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] text-muted tracking-widest uppercase mb-1">{k}</p>
              <p className="text-xs truncate" title={v}>{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
