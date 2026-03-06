'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { DEFAULT_STAGES, type Pipeline, type Project } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (p: Pipeline) => void
}

const ALL_STAGES = ['Install', 'Lint', 'Type Check', 'Build', 'Test', 'Docker Build', 'Deploy']

export function CreatePipelineModal({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedStages, setSelectedStages] = useState<string[]>(DEFAULT_STAGES)
  const [form, setForm] = useState({
    projectId: '', name: '', repoUrl: '', branch: 'main',
    trigger: 'MANUAL' as 'MANUAL' | 'PUSH' | 'SCHEDULE',
  })

  useEffect(() => {
    if (!open) return
    fetch('/api/projects').then(r => r.json()).then(d => {
      if (d.success) { setProjects(d.data.projects); if (d.data.projects[0]) setForm(f => ({ ...f, projectId: d.data.projects[0].id })) }
    })
  }, [open])

  function toggleStage(s: string) {
    setSelectedStages(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  function handleClose() {
    setForm({ projectId: '', name: '', repoUrl: '', branch: 'main', trigger: 'MANUAL' })
    setSelectedStages(DEFAULT_STAGES)
    setError('')
    onClose()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Pipeline name is required.'); return }
    if (!form.projectId) { setError('Please select a project.'); return }
    if (selectedStages.length === 0) { setError('Select at least one stage.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, stages: selectedStages }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create pipeline.'); return }
      onCreated(data.data.pipeline)
      handleClose()
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Pipeline" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger">⚠ {error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Pipeline Name" name="name" placeholder="Deploy to Production"
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />

          <div>
            <label className="block text-[11px] text-muted tracking-widest uppercase mb-1.5">Project</label>
            <select
              value={form.projectId}
              onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}
              className="w-full bg-surface border border-border rounded-xl px-4 py-[17px] font-mono text-sm text-white outline-none focus:border-accent transition-all appearance-none"
            >
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Branch" name="branch" placeholder="main"
            value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} />
          <div>
            <label className="block text-[11px] text-muted tracking-widest uppercase mb-1.5">Trigger</label>
            <select
              value={form.trigger}
              onChange={e => setForm(p => ({ ...p, trigger: e.target.value as 'MANUAL'|'PUSH'|'SCHEDULE' }))}
              className="w-full bg-surface border border-border rounded-xl px-4 py-[17px] font-mono text-sm text-white outline-none focus:border-accent transition-all appearance-none"
            >
              <option value="MANUAL">▶ Manual</option>
              <option value="PUSH">⚡ On Push</option>
              <option value="SCHEDULE">🕐 Schedule</option>
            </select>
          </div>
        </div>

        <Input label="Repository URL (optional)" name="repoUrl" placeholder="https://github.com/org/repo"
          value={form.repoUrl} onChange={e => setForm(p => ({ ...p, repoUrl: e.target.value }))} />

        {/* Stage selector */}
        <div>
          <label className="block text-[11px] text-muted tracking-widest uppercase mb-2">Stages ({selectedStages.length} selected)</label>
          <div className="flex flex-wrap gap-2">
            {ALL_STAGES.map(s => (
              <button
                key={s} type="button"
                onClick={() => toggleStage(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-mono border transition-all ${
                  selectedStages.includes(s)
                    ? 'bg-accent/15 border-accent/40 text-accent-2'
                    : 'bg-surface border-border text-muted hover:border-accent/30'
                }`}
              >
                {selectedStages.includes(s) ? '✓ ' : ''}{s}
              </button>
            ))}
          </div>
          {selectedStages.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {selectedStages.map((s, i) => (
                <span key={s} className="flex items-center gap-1 text-[10px] text-muted">
                  <span className="text-accent-2">{s}</span>
                  {i < selectedStages.length - 1 && <span className="text-border">›</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" full onClick={handleClose}>Cancel</Button>
          <Button type="submit" full loading={loading}>Create Pipeline</Button>
        </div>
      </form>
    </Modal>
  )
}
