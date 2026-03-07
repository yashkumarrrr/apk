'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface UserData {
  id: string; name: string; email: string
  emailVerified: boolean; plan: string; createdAt?: string
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
      <div>
        <h2 className="font-display font-bold text-base">{title}</h2>
        {desc && <p className="text-xs text-muted mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { toast }  = useToast()
  const [user,       setUser]       = useState<UserData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [savingPwd,  setSavingPwd]  = useState(false)
  const [name,       setName]       = useState('')
  const [oldPwd,     setOldPwd]     = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.success) { setUser(d.data.user); setName(d.data.user.name) }
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveName() {
    if (!name.trim() || name.trim() === user?.name) return
    setSavingName(true)
    try {
      const res  = await fetch('/api/auth/me', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setUser(u => u ? { ...u, name: data.data.user.name } : u)
        toast('Name updated', 'success')
      } else {
        toast(data.error ?? 'Failed to update', 'error')
      }
    } finally { setSavingName(false) }
  }

  async function savePassword() {
    if (!oldPwd || !newPwd) return
    if (newPwd !== confirmPwd) { toast('Passwords do not match', 'error'); return }
    if (newPwd.length < 8)    { toast('Password must be at least 8 characters', 'error'); return }
    setSavingPwd(true)
    try {
      const res  = await fetch('/api/auth/me', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (data.success) {
        toast('Password changed', 'success')
        setOldPwd(''); setNewPwd(''); setConfirmPwd('')
      } else {
        toast(data.error ?? 'Failed to change password', 'error')
      }
    } finally { setSavingPwd(false) }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const pwdStrength = newPwd.length === 0 ? 0
    : newPwd.length < 8 ? 1
    : (newPwd.length >= 12 && /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) && /[^a-zA-Z0-9]/.test(newPwd)) ? 4
    : /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? 3
    : 2

  const pwdColors = ['', 'bg-danger', 'bg-warning', 'bg-success/70', 'bg-success']
  const pwdLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="bg-surface border border-border rounded-xl p-6 animate-pulse h-36" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-black text-3xl mb-1">Settings</h1>
        <p className="text-muted text-sm">Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <Section title="Profile" desc="Update your display name.">
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
          />
          <Input label="Email" value={user?.email ?? ''} disabled className="opacity-50" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted">
              {user?.emailVerified
                ? <><span className="text-success">✓</span> Email verified</>
                : <><span className="text-warning">⚠</span> Email not verified</>
              }
            </div>
            <Button onClick={saveName} loading={savingName} disabled={!name.trim() || name.trim() === user?.name}>
              Save Name
            </Button>
          </div>
        </div>
      </Section>

      {/* Password */}
      <Section title="Change Password" desc="Must be at least 8 characters.">
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={oldPwd}
            onChange={e => setOldPwd(e.target.value)}
            placeholder="Your current password"
          />
          <Input
            label="New Password"
            type="password"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            placeholder="New password"
          />
          {newPwd && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1,2,3,4].map(n => (
                  <div key={n} className={cn('h-1 flex-1 rounded-full transition-colors', pwdStrength >= n ? pwdColors[pwdStrength] : 'bg-surface-2')} />
                ))}
              </div>
              <p className={cn('text-[11px]', pwdStrength <= 1 ? 'text-danger' : pwdStrength <= 2 ? 'text-warning' : 'text-success')}>
                {pwdLabels[pwdStrength]}
              </p>
            </div>
          )}
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            placeholder="Repeat new password"
          />
          <div className="flex justify-end">
            <Button
              onClick={savePassword}
              loading={savingPwd}
              disabled={!oldPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd}
            >
              Change Password
            </Button>
          </div>
        </div>
      </Section>

      {/* Plan */}
      <Section title="Plan">
        <div className="flex items-center justify-between mb-4">
          <Badge variant={user?.plan === 'FREE' ? 'gray' : user?.plan === 'PRO' ? 'blue' : 'green'} size="sm">
            {user?.plan} Plan
          </Badge>
          {user?.createdAt && (
            <span className="text-xs text-muted">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted">
          {[
            { ok: true,               label: 'All core features' },
            { ok: true,               label: 'Unlimited pipelines' },
            { ok: true,               label: 'SSH server management' },
            { ok: true,               label: 'AI Assistant' },
            { ok: user?.plan !== 'FREE', label: 'Unlimited projects (Pro)' },
            { ok: user?.plan === 'TEAM', label: 'Team collaboration (Team)' },
          ].map(f => (
            <div key={f.label} className={cn('flex items-center gap-2', !f.ok && 'opacity-40')}>
              <span className={f.ok ? 'text-success' : ''}>{f.ok ? '✓' : '✕'}</span>
              {f.label}
            </div>
          ))}
        </div>
      </Section>

      {/* System info */}
      <Section title="Environment" desc="Runtime configuration status.">
        <div className="space-y-2">
          {[
            { label: 'Database',         check: !!process.env.DATABASE_URL,        note: 'PostgreSQL' },
            { label: 'AI Assistant',     check: !!process.env.ANTHROPIC_API_KEY,   note: 'Anthropic Claude' },
            { label: 'Email (Resend)',   check: !!process.env.RESEND_API_KEY,       note: 'Verification emails' },
            { label: 'Webhook Secret',   check: true,                               note: 'Per-pipeline' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs', row.check ? 'text-success' : 'text-muted/40')}>{row.check ? '●' : '○'}</span>
                <span className="text-sm">{row.label}</span>
              </div>
              <span className="text-xs text-muted">{row.note}</span>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <a href="/setup" className="text-xs text-accent-2 hover:underline">View full setup status →</a>
        </div>
      </Section>

      {/* Danger zone */}
      <div className="bg-surface border border-danger/20 rounded-xl p-6">
        <h2 className="font-display font-bold text-base text-danger mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sign out everywhere</p>
            <p className="text-xs text-muted mt-0.5">Revokes all active sessions on all devices.</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 border border-danger/40 text-danger text-xs rounded-lg hover:bg-danger/10 transition-colors font-mono"
          >
            Sign Out All
          </button>
        </div>
      </div>
    </div>
  )
}
