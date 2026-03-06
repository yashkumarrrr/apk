'use client'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import type { Project, ProjectEnv } from '@/types'

interface Props {
  project: Project
  onDelete: (id: string) => void
  onUpdate: (project: Project) => void
}

const ENV_BADGE: Record<ProjectEnv, 'blue' | 'yellow' | 'green'> = {
  DEVELOPMENT: 'blue',
  STAGING: 'yellow',
  PRODUCTION: 'green',
}

const ENV_LABEL: Record<ProjectEnv, string> = {
  DEVELOPMENT: 'Dev',
  STAGING: 'Staging',
  PRODUCTION: 'Prod',
}

export function ProjectCard({ project, onDelete, onUpdate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(project.id)
    } finally {
      setDeleting(false)
      setMenuOpen(false)
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: project.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }),
    })
    if (res.ok) {
      const data = await res.json()
      onUpdate(data.data.project)
    }
    setMenuOpen(false)
  }

  const updatedAt = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="group relative bg-surface border border-border rounded-xl p-5 hover:border-accent/40 transition-all duration-200 hover:shadow-[0_0_24px_rgba(37,99,235,0.08)]">
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${project.color}20`, border: `1px solid ${project.color}40` }}
          >
            {project.icon}
          </div>
          <div>
            <h3 className="font-display font-bold text-[15px] leading-tight">{project.name}</h3>
            <p className="text-[11px] text-muted font-mono">/{project.slug}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            ···
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 bg-surface-2 border border-border rounded-xl shadow-xl py-1 min-w-[150px]">
                <button
                  onClick={handleArchive}
                  className="w-full text-left px-4 py-2 text-sm text-muted hover:text-white hover:bg-surface-3 transition-colors"
                >
                  {project.status === 'ACTIVE' ? '⏸ Pause' : '▶ Activate'}
                </button>
                <div className="h-px bg-border mx-2 my-1" />
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                >
                  {deleting ? '…' : '🗑 Delete'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-muted mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Badge variant={ENV_BADGE[project.env]} size="xs">{ENV_LABEL[project.env]}</Badge>
          {project.status !== 'ACTIVE' && (
            <Badge variant="yellow" size="xs">{project.status}</Badge>
          )}
        </div>
        <span className="text-[11px] text-muted">{updatedAt}</span>
      </div>
    </div>
  )
}
