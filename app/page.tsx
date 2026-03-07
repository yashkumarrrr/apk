'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Landing() {
  const router = useRouter()
  const [dbReady, setDbReady] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/setup')
      .then(r => r.json())
      .then(d => setDbReady(d.ready))
      .catch(() => setDbReady(false))
  }, [])

  // DB not ready → send to setup wizard
  if (dbReady === false) {
    return (
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f0883e]/10 border border-[#f0883e]/30 text-3xl mb-6">⚙️</div>
          <h1 className="font-display font-black text-3xl text-white mb-2">Setup Required</h1>
          <p className="text-[#8b949e] text-sm mb-8 leading-relaxed">
            Step2Dev needs a database connection before it can start.<br />
            Follow the setup guide — it only takes 3 minutes.
          </p>
          <button
            onClick={() => router.push('/setup')}
            className="w-full py-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-mono text-sm rounded-xl transition-all mb-3"
          >
            Open Setup Guide →
          </button>
          <p className="text-xs text-[#8b949e]/50 font-mono">
            Make sure DATABASE_URL is set in your .env file
          </p>
        </div>
      </main>
    )
  }

  // Still checking
  if (dbReady === null) {
    return (
      <main className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="text-center">
          <div className="font-display font-black text-xl text-white mb-4">Step2Dev</div>
          <div className="w-5 h-5 border-2 border-[#30363d] border-t-[#2563eb] rounded-full animate-spin mx-auto" />
        </div>
      </main>
    )
  }

  // DB ready → full landing
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-bg px-6">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] text-center">
        <h1 className="font-display font-black text-[clamp(56px,13vw,92px)] leading-none tracking-tight mb-3 animate-fade-up fill-both">
          Step2Dev
        </h1>
        <p className="text-muted text-[11px] tracking-[6px] uppercase mb-14 animate-fade-up delay-100 fill-both">
          DevOps Platform
        </p>
        <div className="flex flex-col gap-3 animate-fade-up delay-200 fill-both">
          <button
            onClick={() => router.push('/auth/register')}
            className="w-full py-[18px] bg-accent hover:bg-accent-2 text-white font-display font-bold text-[13px] tracking-[3px] uppercase rounded-xl transition-all duration-200 hover:shadow-[0_8px_24px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:translate-y-0"
          >
            Get Started Free
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full py-4 bg-transparent border border-border text-muted hover:border-accent hover:text-accent-2 font-mono text-[11px] tracking-[3px] uppercase rounded-xl transition-all duration-200"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push('/auth/login?mode=guest')}
            className="w-full py-3 bg-transparent text-muted/50 hover:text-muted font-mono text-[10px] tracking-[2px] uppercase rounded-xl transition-all duration-200"
          >
            Continue as Guest →
          </button>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-2.5 text-left animate-fade-up delay-400 fill-both">
          {[
            ['⚡', 'CI/CD Pipelines'],
            ['📊', 'Live Monitoring'],
            ['🖥️', 'Server Terminal'],
            ['🤖', 'AI Assistant'],
            ['🔔', 'Smart Alerts'],
            ['🔁', 'Auto Retry & Webhooks'],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2.5 bg-surface border border-border rounded-lg px-3 py-2.5">
              <span className="text-sm">{icon}</span>
              <span className="text-[11px] text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
