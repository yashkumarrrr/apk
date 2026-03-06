'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Server } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onAdded: (s: Server) => void
}

const OS_OPTIONS = [
  { value: 'UBUNTU',  label: '🟠 Ubuntu'  },
  { value: 'DEBIAN',  label: '🔴 Debian'  },
  { value: 'CENTOS',  label: '🟣 CentOS'  },
  { value: 'FEDORA',  label: '🔵 Fedora'  },
  { value: 'ALPINE',  label: '⛰️ Alpine'  },
  { value: 'WINDOWS', label: '🪟 Windows' },
  { value: 'OTHER',   label: '🖥️ Other'   },
]

export function AddServerModal({ open, onClose, onAdded }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [authType, setAuthType] = useState<'password' | 'key'>('password')
  const [form, setForm] = useState({
    name: '', host: '', port: '22', username: 'root',
    password: '', privateKey: '', os: 'UBUNTU', tags: '',
  })

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value })); setError('')
  }

  function handleClose() {
    setForm({ name: '', host: '', port: '22', username: 'root', password: '', privateKey: '', os: 'UBUNTU', tags: '' })
    setError(''); setAuthType('password'); onClose()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.host) { setError('Name and host are required.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, host: form.host,
          port: parseInt(form.port) || 22,
          username: form.username, authType,
          password: authType === 'password' ? form.password : undefined,
          privateKey: authType === 'key' ? form.privateKey : undefined,
          os: form.os,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to add server.'); return }
      onAdded(data.data.server)
      handleClose()
    } catch { setError('Network error.')
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Server" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger">⚠ {error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Server Name" placeholder="Production Web 01" value={form.name} onChange={e => set('name', e.target.value)} required />
          <div>
            <label className="block text-[11px] text-muted tracking-widest uppercase mb-1.5">OS</label>
            <select value={form.os} onChange={e => set('os', e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-[17px] font-mono text-sm text-white outline-none focus:border-accent appearance-none">
              {OS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="Host / IP" placeholder="192.168.1.100 or server.example.com" value={form.host} onChange={e => set('host', e.target.value)} required />
          </div>
          <Input label="SSH Port" placeholder="22" value={form.port} onChange={e => set('port', e.target.value)} />
        </div>

        <Input label="Username" placeholder="root" value={form.username} onChange={e => set('username', e.target.value)} />

        {/* Auth type toggle */}
        <div>
          <label className="block text-[11px] text-muted tracking-widest uppercase mb-2">Authentication</label>
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(['password', 'key'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setAuthType(t); setError('') }}
                className={`flex-1 py-2.5 text-[12px] font-mono transition-all ${authType === t ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
                {t === 'password' ? '🔑 Password' : '📄 SSH Key'}
              </button>
            ))}
          </div>
        </div>

        {authType === 'password' ? (
          <Input label="Password" type="password" placeholder="SSH password" value={form.password} onChange={e => set('password', e.target.value)} />
        ) : (
          <div>
            <label className="block text-[11px] text-muted tracking-widest uppercase mb-1.5">Private Key</label>
            <textarea value={form.privateKey} onChange={e => set('privateKey', e.target.value)}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
              rows={4}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-xs text-white placeholder:text-muted outline-none focus:border-accent resize-none transition-all" />
          </div>
        )}

        <Input label="Tags (comma separated, optional)" placeholder="web, nginx, prod" value={form.tags} onChange={e => set('tags', e.target.value)} />

        <div className="bg-surface-2 border border-border rounded-xl p-3 text-[11px] text-muted">
          ⚠ Credentials are stored to enable SSH connections. Use a dedicated deploy user with limited permissions in production.
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" full onClick={handleClose}>Cancel</Button>
          <Button type="submit" full loading={loading}>Add Server</Button>
        </div>
      </form>
    </Modal>
  )
}
