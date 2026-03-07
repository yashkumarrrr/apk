'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Check {
  name:    string
  ok:      boolean
  message: string
  fix?:    string
  optional?: boolean
}

interface SetupResult {
  ready:  boolean
  checks: Check[]
  env:    string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="ml-2 text-[10px] font-mono text-muted hover:text-accent-2 transition-colors px-1.5 py-0.5 border border-border rounded"
    >
      {copied ? '✓' : 'copy'}
    </button>
  )
}

export default function SetupWizard() {
  const router   = useRouter()
  const [result,   setResult]   = useState<SetupResult | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [checking, setChecking] = useState(false)

  const runCheck = useCallback(async () => {
    setChecking(true)
    try {
      const res  = await fetch('/api/setup')
      const data = await res.json() as SetupResult
      setResult(data)
      if (data.ready) setTimeout(() => router.push('/'), 1500)
    } catch {
      setResult({
        ready: false,
        env:   'unknown',
        checks: [{
          name:    'API Server',
          ok:      false,
          message: 'Cannot reach /api/setup — is the dev server running?',
          fix:     'npm run dev',
        }],
      })
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }, [router])

  useEffect(() => { runCheck() }, [runCheck])

  const critical = result?.checks.filter(c => !c.optional) ?? []
  const optional  = result?.checks.filter(c => c.optional)  ?? []
  const failCount = critical.filter(c => !c.ok).length

  return (
    <div className="min-h-screen bg-[#080c10] flex items-center justify-center px-4 py-12">
      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(#30363d 1px,transparent 1px),linear-gradient(90deg,#30363d 1px,transparent 1px)',
        backgroundSize: '40px 40px', opacity: 0.1,
      }} />

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 text-2xl mb-4">⚙️</div>
          <h1 className="font-display font-black text-3xl text-white mb-1">Setup Required</h1>
          <p className="text-[#8b949e] text-sm">Step2Dev needs a few things before it can start.</p>
        </div>

        {/* Status card */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden mb-4">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
            <span className="font-mono text-xs text-[#8b949e]">System Status</span>
            <span className={cn(
              'text-[10px] font-mono border rounded px-2 py-0.5 transition-colors',
              loading || checking
                ? 'text-[#8b949e] border-[#30363d]'
                : result?.ready
                ? 'text-[#3fb950] border-[#3fb950]/30 bg-[#3fb950]/5'
                : 'text-[#f85149] border-[#f85149]/30 bg-[#f85149]/5'
            )}>
              {loading || checking ? '⟳ checking…' : result?.ready ? '✓ READY' : `✕ ${failCount} issue${failCount !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="divide-y divide-[#21262d]">
            {loading ? (
              [1,2,3,4].map(i => (
                <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 rounded-full bg-[#21262d] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-[#21262d] rounded w-28" />
                    <div className="h-2.5 bg-[#21262d] rounded w-44" />
                  </div>
                </div>
              ))
            ) : (
              [...critical, ...optional].map((check, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5',
                      check.ok
                        ? 'bg-[#3fb950]/10 border border-[#3fb950]/40 text-[#3fb950]'
                        : check.optional
                        ? 'bg-[#8b949e]/10 border border-[#8b949e]/30 text-[#8b949e]'
                        : 'bg-[#f85149]/10 border border-[#f85149]/40 text-[#f85149]'
                    )}>
                      {check.ok ? '✓' : check.optional ? '○' : '✕'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-white">{check.name}</span>
                        {check.optional && !check.ok && (
                          <span className="text-[10px] text-[#8b949e] border border-[#30363d] rounded px-1 py-0.5">optional</span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#8b949e] mt-0.5 leading-relaxed">{check.message}</p>
                      {check.fix && !check.ok && (
                        <div className="mt-2 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                          <code className="text-[11px] text-[#79c0ff] font-mono break-all leading-relaxed">{check.fix}</code>
                          <CopyButton text={check.fix} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick setup steps — only show when not ready */}
        {!loading && !result?.ready && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 mb-4">
            <h3 className="font-display font-bold text-sm text-white mb-4">Quick Setup</h3>
            <ol className="space-y-3">
              {[
                { cmd: 'cp .env.example .env',                       desc: 'Copy the env template' },
                { cmd: 'docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=step2dev postgres:16-alpine', desc: 'Start PostgreSQL (or use Neon/Supabase)' },
                { cmd: 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/step2dev"', desc: 'Paste into your .env file' },
                { cmd: 'npx prisma db push',                          desc: 'Create database tables' },
                { cmd: 'npm run dev',                                  desc: 'Restart and open localhost:3000' },
              ].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#2563eb]/20 border border-[#2563eb]/40 text-[#79c0ff] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#8b949e] mb-1">{s.desc}</p>
                    <div className="flex items-center bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5">
                      <code className="text-[11px] font-mono text-[#e6edf3] flex-1 break-all">{s.cmd}</code>
                      <CopyButton text={s.cmd} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Success */}
        {result?.ready && (
          <div className="bg-[#3fb950]/5 border border-[#3fb950]/20 rounded-2xl p-5 mb-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-display font-bold text-[#3fb950] text-lg">All systems go!</p>
            <p className="text-xs text-[#8b949e] mt-1">Redirecting to Step2Dev…</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={runCheck}
            disabled={checking || loading}
            className="flex-1 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-mono text-sm rounded-xl transition-all"
          >
            {checking ? '⟳ Checking…' : '⟳ Re-check Status'}
          </button>
          {result?.ready && (
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] font-mono text-sm rounded-xl hover:bg-[#3fb950]/20 transition-all"
            >
              Open Step2Dev →
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-[#8b949e]/30 mt-5 font-mono">
          step2dev v1.0 · {result?.env ?? 'development'}
        </p>
      </div>
    </div>
  )
}
