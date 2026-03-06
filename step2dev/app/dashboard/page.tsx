import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { GuestOverview } from '@/components/dashboard/GuestOverview'
import { OnboardingTrigger } from '@/components/onboarding/OnboardingTrigger'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return <GuestOverview />

  const [projectCount, pipelineCount, serverCount, alertCount, recentProjects, recentRuns] = await Promise.all([
    prisma.project.count({ where: { userId: user.id, status: { not: 'ARCHIVED' } } }),
    prisma.pipeline.count({ where: { userId: user.id } }),
    prisma.server.count({ where: { userId: user.id } }),
    prisma.alert.count({ where: { userId: user.id, state: 'ACTIVE' } }),
    prisma.project.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, take: 4 }),
    prisma.pipelineRun.findMany({
      where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5,
      include: { pipeline: { select: { name: true } } },
    }),
  ])

  // Show onboarding for users who registered in the last 5 minutes
  const isNewUser = (Date.now() - new Date(user.createdAt ?? 0).getTime()) < 5 * 60 * 1000

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <OnboardingTrigger isNewUser={isNewUser} />
      <div>
        <h1 className="font-display font-black text-3xl mb-1">{greeting}, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-muted text-sm">Here&apos;s your Step2Dev overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Projects',  value: projectCount,  icon: '📁', href: '/dashboard/projects' },
          { label: 'Pipelines', value: pipelineCount, icon: '⚡', href: '/dashboard/pipelines' },
          { label: 'Servers',   value: serverCount,   icon: '🖥️', href: '/dashboard/servers' },
          { label: 'Alerts',    value: alertCount,    icon: '🔔', href: '/dashboard/monitoring' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{s.icon}</span>
              <span className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5 uppercase tracking-wide">{s.label}</span>
            </div>
            <div className="font-display font-black text-3xl mb-0.5">{s.value}</div>
            {'sub' in s && s.sub
              ? <p className="text-[11px] text-muted">{s.sub}</p>
              : 'href' in s && s.href
              ? <Link href={s.href} className="text-[11px] text-accent-2 hover:underline">View all →</Link>
              : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-bold text-base">Recent Projects</h2>
            <Link href="/dashboard/projects" className="text-xs text-accent-2 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentProjects.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-muted text-sm mb-2">No projects yet</p>
                <Link href="/dashboard/projects" className="text-xs text-accent-2 hover:underline">Create one →</Link>
              </div>
            ) : recentProjects.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}>{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-muted">/{p.slug}</p>
                </div>
                <Badge variant={p.env === 'PRODUCTION' ? 'green' : p.env === 'STAGING' ? 'yellow' : 'blue'} size="xs">
                  {p.env === 'DEVELOPMENT' ? 'Dev' : p.env === 'STAGING' ? 'Stage' : 'Prod'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-bold text-base">Recent Runs</h2>
            <Link href="/dashboard/pipelines" className="text-xs text-accent-2 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentRuns.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-muted text-sm mb-2">No runs yet</p>
                <Link href="/dashboard/pipelines" className="text-xs text-accent-2 hover:underline">Create a pipeline →</Link>
              </div>
            ) : recentRuns.map(run => {
              const sc = run.status === 'SUCCESS' ? 'text-success' : run.status === 'FAILED' ? 'text-danger' : run.status === 'RUNNING' ? 'text-accent-2' : 'text-muted'
              const si = run.status === 'SUCCESS' ? '✓' : run.status === 'FAILED' ? '✕' : run.status === 'RUNNING' ? '◉' : '○'
              return (
                <div key={run.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                  <span className={`text-base font-bold w-5 text-center flex-shrink-0 ${sc}`}>{si}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{run.pipeline.name}</p>
                    <p className="text-[11px] text-muted">⎇ {run.branch} · by {run.triggeredBy}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[11px] font-mono ${sc}`}>{run.status}</p>
                    {run.duration && <p className="text-[10px] text-muted">{run.duration}s</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="font-display font-bold text-base mb-4">Account</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {([['Name', user.name], ['Email', user.email], ['Plan', user.plan], ['Verified', user.emailVerified ? '✓ Yes' : '⚠ Pending']] as [string,string][]).map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] text-muted tracking-widest uppercase mb-1">{k}</p>
              <p className={k==='Plan'?'text-accent-2 font-bold':k==='Verified'?(user.emailVerified?'text-success':'text-warning'):''}>{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
