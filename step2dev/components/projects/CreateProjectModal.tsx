'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { slugify, PROJECT_ICONS, PROJECT_COLORS, type Project } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (project: Project) => void
}

export function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    env: 'DEVELOPMENT' as 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION',
    icon: '⚡',
    color: '#2563eb',
  })

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleClose() {
    setForm({ name: '', description: '', env: 'DEVELOPMENT', icon: '⚡', color: '#2563eb' })
    setError('')
    onClose()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Project name is required.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create project.'); return }
      onCreated(data.data.project)
      handleClose()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const slug = slugify(form.name)

  return (
    <Modal open={open} onClose={handleClose} title="Create New Project" size="md">
      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger">
            ⚠ {error}
          </div>
        )}

        {/* Icon & Color pickers */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[11px] text-muted tracking-widest uppercase mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, icon: ic }))}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg border transition-all ${
                    form.icon === ic ? 'border-accent bg-accent/15' : 'border-border hover:border-accent/50'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-muted tracking-widest uppercase mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${
                    form.color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <Input
          label="Project Name"
          name="name"
          placeholder="My Production App"
          value={form.name}
          onChange={onChange}
          required
        />

        {/* Slug preview */}
        {form.name && (
          <p className="text-[11px] text-muted -mt-2">
            Slug: <span className="text-accent-2">/{slug}</span>
          </p>
        )}

        <div>
          <label className="block text-[11px] text-muted tracking-widest uppercase mb-1.5">
            Description <span className="normal-case">(optional)</span>
          </label>
          <textarea
            name="description"
            placeholder="What does this project do?"
            value={form.description}
            onChange={onChange}
            rows={2}
            className="w-full bg-surface border border-border rounded-xl px-5 py-3 font-mono text-sm text-white placeholder:text-muted outline-none transition-all resize-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
          />
        </div>

        <div>
          <label className="block text-[11px] text-muted tracking-widest uppercase mb-1.5">Environment</label>
          <select
            name="env"
            value={form.env}
            onChange={onChange}
            className="w-full bg-surface border border-border rounded-xl px-5 py-4 font-mono text-sm text-white outline-none transition-all focus:border-accent appearance-none cursor-pointer"
          >
            <option value="DEVELOPMENT">🔵 Development</option>
            <option value="STAGING">🟡 Staging</option>
            <option value="PRODUCTION">🟢 Production</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" full onClick={handleClose}>Cancel</Button>
          <Button type="submit" full loading={loading}>Create Project</Button>
        </div>
      </form>
    </Modal>
  )
}
