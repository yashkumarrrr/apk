'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export function GuestOverview() {
  const [name, setName] = useState('Guest')

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('guest')
      if (raw) {
        const { name: n } = JSON.parse(raw)
        if (n) setName(n.split(' ')[0])
      }
    } catch { /* ignore */ }
  }, [])

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-black text-3xl mb-1">{greeting}, {name} 👋</h1>
        <p className="text-muted text-sm">Exploring Step2Dev in guest mode.</p>
      </div>

      {/* Guest notice */}
      <div className="bg-warning/5 border border-warning/20 rounded-xl p-5 flex items-start gap-4">
        <span className="text-2xl flex-shrink-0">👤</span>
        <div>
          <p className="font-display font-bold text-sm mb-1">You&apos;re in guest mode</p>
          <p className="text-muted text-sm mb-3">
            You can explore the full dashboard, but data won&apos;t be saved between sessions. Create a free account to save your projects and pipelines.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-accent text-white text-xs font-display font-bold tracking-[2px] uppercase px-4 py-2 rounded-lg hover:bg-accent-2 transition-colors"
          >
            Create Free Account →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Projects',  value: '0', icon: '📁', href: '/dashboard/projects' },
          { label: 'Pipelines', value: '0', icon: '⚡', href: '/dashboard/pipelines' },
          { label: 'Servers',   value: '—', icon: '🖥️', sub: 'Part 4' },
          { label: 'Alerts',    value: '—', icon: '🔔', sub: 'Part 5' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{s.icon}</span>
              <span className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5 uppercase tracking-wide">{s.label}</span>
            </div>
            <div className="font-display font-black text-3xl mb-0.5">{s.value}</div>
            {s.sub ? <p className="text-[11px] text-muted">{s.sub}</p>
              : s.href ? <Link href={s.href} className="text-[11px] text-accent-2 hover:underline">View all →</Link>
              : null}
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display font-bold text-base">Platform Features</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {[
            { icon: '⚡', label: 'CI/CD Pipelines',   desc: 'Automate builds and deploys', available: true },
            { icon: '🖥️', label: 'Server Management', desc: 'SSH & infra control',         available: false, part: 'Part 4' },
            { icon: '📊', label: 'Monitoring',          desc: 'Real-time health metrics',   available: true },
            { icon: '☁️', label: 'AWS Integration',   desc: 'EC2, S3, RDS in one place',  available: false, part: 'Part 6' },
            { icon: '🤖', label: 'AI Assistant',        desc: 'AI-powered DevOps analysis', available: true,  href: '/dashboard/ai' },
            { icon: '🔔', label: 'Smart Alerts',       desc: 'Get notified instantly',     available: false, part: 'Part 5' },
          ].map(f => (
            <div key={f.label} className="p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="font-display font-bold text-sm mb-1">{f.label}</p>
              <p className="text-muted text-xs mb-2">{f.desc}</p>
              {f.available
                ? <Link href={f.available && 'href' in f ? (f as {href:string}).href : '/dashboard/monitoring'} className="text-[10px] text-accent-2 hover:underline">Open →</Link>
                : <span className="text-[10px] border border-border text-muted rounded px-1.5 py-0.5">{f.part}</span>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
