'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import type { Project } from '@/types'

export default function ProjectsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'>('ALL')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (data.success) setProjects(data.data.projects)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleCreated(p: Project) {
    setProjects(prev => [p, ...prev])
    toast(`Project "${p.name}" created!`, 'success')
  }

  function handleDelete(id: string) {
    const p = projects.find(x => x.id === id)
    setProjects(prev => prev.filter(x => x.id !== id))
    toast(`Project "${p?.name}" deleted.`, 'info')
  }

  function handleUpdate(updated: Project) {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    toast('Project updated.', 'success')
  }

  const filtered = projects.filter(p => {
    const matchEnv = filter === 'ALL' || p.env === filter
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
    return matchEnv && matchSearch
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-black text-3xl mb-1">Projects</h1>
          <p className="text-muted text-sm">Manage all your projects in one place.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="flex-shrink-0">
          + New Project
        </Button>
      </div>

      {/* Filter + Search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <input
          type="text"
          placeholder="Search projects…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-surface border border-border rounded-xl px-4 py-2.5 font-mono text-sm text-white placeholder:text-muted outline-none focus:border-accent transition-all flex-1"
        />
        <div className="flex items-center gap-2">
          {(['ALL', 'DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-[11px] font-mono transition-all ${
                filter === f
                  ? 'bg-accent text-white'
                  : 'bg-surface border border-border text-muted hover:border-accent/50 hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'DEVELOPMENT' ? 'Dev' : f === 'STAGING' ? 'Staging' : 'Prod'}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
          {filter !== 'ALL' && <Badge variant="blue" size="xs">{filter}</Badge>}
          {search && <Badge variant="gray" size="xs">"{search}"</Badge>}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-surface-3 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-3 rounded w-3/4" />
                  <div className="h-2 bg-surface-3 rounded w-1/2" />
                </div>
              </div>
              <div className="h-2 bg-surface-3 rounded mb-2" />
              <div className="h-2 bg-surface-3 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">{projects.length === 0 ? '📁' : '🔍'}</div>
          <h3 className="font-display font-bold text-lg mb-2">
            {projects.length === 0 ? 'No projects yet' : 'No results found'}
          </h3>
          <p className="text-muted text-sm mb-6">
            {projects.length === 0
              ? 'Create your first project to get started.'
              : 'Try adjusting your search or filter.'}
          </p>
          {projects.length === 0 && (
            <Button onClick={() => setShowCreate(true)}>Create First Project</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
          {/* Add card */}
          <button
            onClick={() => setShowCreate(true)}
            className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-muted hover:border-accent/40 hover:text-accent-2 transition-all duration-200 min-h-[160px] group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">+</span>
            <span className="text-sm font-mono">New Project</span>
          </button>
        </div>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
