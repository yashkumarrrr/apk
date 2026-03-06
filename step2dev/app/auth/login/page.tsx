'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from') ?? '/dashboard'

  const [mode, setMode] = useState<'login' | 'guest'>(params.get('mode') === 'guest' ? 'guest' : 'login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })
  const [guest, setGuest] = useState({ name: '', email: '' })

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid credentials.'); return }
      router.push(from); router.refresh()
    } catch { setError('Network error. Please try again.')
    } finally { setLoading(false) }
  }

  async function onGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!guest.name.trim()) { setError('Name is required.'); return }
    if (!guest.email.trim() || !guest.email.includes('@')) { setError('Valid email is required.'); return }
    setLoading(true); setError('')
    // Store guest info in sessionStorage and go to dashboard
    sessionStorage.setItem('guest', JSON.stringify({ name: guest.name, email: guest.email }))
    router.push('/dashboard?guest=1')
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-bg overflow-hidden px-4 py-12">
      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(#30363d 1px,transparent 1px),linear-gradient(90deg,#30363d 1px,transparent 1px)',
        backgroundSize: '40px 40px', opacity: 0.15,
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%)',
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo — perfectly centered */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block font-display font-black text-3xl tracking-tight hover:text-accent-2 transition-colors">
            Step2Dev
          </Link>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-up fill-both">
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-3.5 text-[12px] font-display font-bold tracking-[2px] uppercase transition-all ${
                mode === 'login'
                  ? 'text-white border-b-2 border-accent bg-accent/5'
                  : 'text-muted hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('guest'); setError('') }}
              className={`flex-1 py-3.5 text-[12px] font-display font-bold tracking-[2px] uppercase transition-all ${
                mode === 'guest'
                  ? 'text-white border-b-2 border-accent bg-accent/5'
                  : 'text-muted hover:text-white'
              }`}
            >
              Guest Mode
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-sm text-danger mb-4">
                ⚠ {error}
              </div>
            )}

            {mode === 'login' ? (
              <>
                <div className="mb-6">
                  <h2 className="font-display font-bold text-xl mb-1">Welcome back</h2>
                  <p className="text-muted text-sm">Sign in to your Step2Dev account</p>
                </div>

                <form onSubmit={onLogin} className="space-y-4">
                  <Input label="Email" name="email" type="email" placeholder="you@company.com"
                    value={form.email} onChange={onChange} required autoComplete="email" />
                  <div>
                    <Input label="Password" name="password" type="password" placeholder="Your password"
                      value={form.password} onChange={onChange} required autoComplete="current-password" />
                    <div className="mt-2 text-right">
                      <Link href="/auth/forgot-password" className="text-xs text-muted hover:text-accent-2 transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  <Button type="submit" full loading={loading} className="py-[18px] text-[13px]">
                    Sign In
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted">
                    No account?{' '}
                    <Link href="/auth/register" className="text-accent-2 hover:underline">Create one free</Link>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="font-display font-bold text-xl mb-1">Guest Access</h2>
                  <p className="text-muted text-sm">Explore Step2Dev — no password needed</p>
                </div>

                <form onSubmit={onGuest} className="space-y-4">
                  <Input
                    label="Your Name"
                    name="name"
                    type="text"
                    placeholder="Arjun Sharma"
                    value={guest.name}
                    onChange={e => { setGuest(p => ({ ...p, name: e.target.value })); setError('') }}
                    required
                    autoComplete="name"
                  />
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={guest.email}
                    onChange={e => { setGuest(p => ({ ...p, email: e.target.value })); setError('') }}
                    required
                    autoComplete="email"
                  />

                  {/* What guest gets */}
                  <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-2">
                    {[
                      '✓ Full dashboard access',
                      '✓ Create & manage projects',
                      '✓ Run CI/CD pipelines',
                      '✗ Data not saved between sessions',
                    ].map(f => (
                      <p key={f} className={`text-[12px] ${f.startsWith('✓') ? 'text-muted' : 'text-muted/50'}`}>{f}</p>
                    ))}
                  </div>

                  <Button type="submit" full loading={loading} className="py-[18px] text-[13px]">
                    Enter Dashboard →
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted">
                    Want to save your data?{' '}
                    <Link href="/auth/register" className="text-accent-2 hover:underline">Create a free account</Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
