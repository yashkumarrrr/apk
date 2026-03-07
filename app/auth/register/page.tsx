'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setFieldErrors(p => ({ ...p, [e.target.name]: [] }))
    setGeneralError('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setGeneralError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.details) setFieldErrors(data.details)
        else setGeneralError(data.error ?? 'Something went wrong.')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch {
      setGeneralError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <AuthCard title="Check your inbox ✉️">
      <div className="text-center py-6">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-muted text-sm">We sent a verification link to <strong className="text-white">{form.email}</strong></p>
        <p className="text-muted text-xs mt-2">Redirecting to dashboard…</p>
      </div>
    </AuthCard>
  )

  const checks = [
    { label: '8+ chars',   ok: form.password.length >= 8 },
    { label: 'Uppercase',  ok: /[A-Z]/.test(form.password) },
    { label: 'Number',     ok: /[0-9]/.test(form.password) },
  ]
  const score = checks.filter(c => c.ok).length
  const barColor = score === 3 ? 'bg-success' : score === 2 ? 'bg-warning' : score === 1 ? 'bg-danger' : 'bg-border'

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join 100+ DevOps engineers on AccIQ"
      footer={
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-accent-2 hover:underline">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {generalError && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger">
            ⚠ {generalError}
          </div>
        )}
        <Input label="Full Name" name="name" type="text" placeholder="Arjun Sharma"
          value={form.name} onChange={onChange} error={fieldErrors.name?.[0]} required autoComplete="name" />
        <Input label="Email" name="email" type="email" placeholder="you@company.com"
          value={form.email} onChange={onChange} error={fieldErrors.email?.[0]} required autoComplete="email" />
        <Input label="Password" name="password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number"
          value={form.password} onChange={onChange} error={fieldErrors.password?.[0]} required autoComplete="new-password" />

        {form.password.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? barColor : 'bg-border'}`} />
              ))}
            </div>
            <div className="flex gap-3">
              {checks.map(c => (
                <span key={c.label} className={`text-[11px] ${c.ok ? 'text-success' : 'text-muted'}`}>
                  {c.ok ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" full loading={loading} className="mt-2 py-[18px] text-[13px]">
          Save Spot
        </Button>
      </form>
    </AuthCard>
  )
}
