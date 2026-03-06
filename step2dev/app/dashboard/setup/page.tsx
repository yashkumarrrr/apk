'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Check {
  name:    string
  ok:      boolean
  message: string
  fix?:    string
}

interface SetupResult {
  ok:     boolean
  ready:  boolean
  checks: Check[]
  env:    string
}

export default function SetupPage() {
  const router  = useRouter()
  const [result,   setResult]   = useState<SetupResult | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [checking, setChecking] = useState(false)

  async function runCheck() {
    setChecking(true)
    try {
      const res  = await fetch('/api/setup')
      const data = await res.json()
      setResult(data)
      if (data.ready) {
        setTimeout(() => router.push('/'), 2000)
      }
    } catch {
      setResult({
        ok:     false,
        ready:  false,
        env:    'unknown',
        checks: [{
          name:    'API Server',
          ok:      false,
          message: 'Cannot reach the API — is the server running?',
          fix:     'Run: npm run dev',
        }],
      })
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }

  useEffect(() => { runCheck() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 text-3xl mb-4">
            ⚙️
          </div>
          <h1 className="font-display font-black text-3xl mb-2">Setup Check</h1>
          <p className="text-muted text-sm">
            Step2Dev needs a few things configured before it can run.
          </p>
        </div>

        {/* Checks */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <span className="font-mono text-xs text-muted">System Status</span>
            <span className={cn(
              'text-[10px] font-mono border rounded px-2 py-0.5',
              result?.ready
                ? 'text-success border-success/30 bg-success/5'
                : 'text-warning border-warning/30 bg-warning/5'
            )}>
              {loading ? 'checking…' : result?.ready ? '✓ READY' : '✕ NOT READY'}
            </span>
          </div>

          <div className="divide-y divide-border">
            {loading ? (
              [1,2,3,4,5,6].map(i => (
                <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 rounded-full bg-surface-2 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-surface-2 rounded w-32" />
                    <div className="h-2.5 bg-surface-2 rounded w-48" />
                  </div>
                </div>
              ))
            ) : (
              result?.checks.map((check, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5',
                      check.ok
                        ? 'bg-success/10 border border-success/30 text-success'
                        : 'bg-danger/10 border border-danger/30 text-danger'
                    )}>
                      {check.ok ? '✓' : '✕'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{check.name}</span>
                        {!check.ok && (
                          <span className="text-[10px] text-danger/70">required</span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{check.message}</p>
                      {check.fix && (
                        <div className="mt-2 bg-surface-2 border border-border rounded-lg px-3 py-2">
                          <p className="text-[10px] text-muted mb-1">Fix:</p>
                          <code className="text-[11px] text-accent-2 font-mono break-all">{check.fix}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick setup guide */}
        {!loading && !result?.ready && (
          <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
            <h3 className="font-display font-bold text-sm mb-4">Quick Setup (3 minutes)</h3>
            <div className="space-y-3">
              {[
                { step: '1', title: 'Create .env file', code: 'cp .env.example .env' },
                { step: '2', title: 'Start a PostgreSQL database', code: 'docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=step2dev postgres:16' },
                { step: '3', title: 'Set DATABASE_URL in .env', code: 'DATABASE_URL="postgresql://postgres:password@localhost:5432/step2dev"' },
                { step: '4', title: 'Run database migrations', code: 'npx prisma db push' },
                { step: '5', title: 'Restart the dev server', code: 'npm run dev' },
              ].map(s => (
                <div key={s.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 text-accent-2 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white mb-1">{s.title}</p>
                    <code className="text-[11px] font-mono text-muted bg-surface-2 border border-border rounded px-2 py-1 block break-all">
                      {s.code}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result?.ready && (
          <div className="bg-success/5 border border-success/20 rounded-2xl p-5 mb-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-display font-bold text-success">Everything is configured!</p>
            <p className="text-xs text-muted mt-1">Redirecting to Step2Dev…</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={runCheck}
            disabled={checking}
            className="flex-1 py-3 bg-accent hover:bg-accent-2 disabled:opacity-50 text-white font-mono text-sm rounded-xl transition-all"
          >
            {checking ? '⟳ Checking…' : '⟳ Re-check'}
          </button>
          {result?.ready && (
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 bg-success/10 border border-success/30 text-success font-mono text-sm rounded-xl hover:bg-success/20 transition-all"
            >
              Go to Step2Dev →
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-muted/40 mt-6">
          step2dev · localhost:{typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}
        </p>

      </div>
    </div>
  )
}
