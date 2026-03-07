'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/types'

interface Props { user: AuthUser; guest?: boolean }

const NAV = [
  { href: '/dashboard',          icon: '⊞',  label: 'Overview' },
  { href: '/dashboard/projects', icon: '📁', label: 'Projects' },
  { href: '/dashboard/pipelines', icon: '⚡', label: 'Pipelines' },
  { href: '/dashboard/servers',   icon: '🖥️', label: 'Servers' },
  { href: '/dashboard/monitoring', icon: '📊', label: 'Monitoring' },
  { href: '/dashboard/ai',            icon: '🤖', label: 'AI Assistant' },
  { href: '/dashboard/notifications', icon: '🔔', label: 'Notifications' },
]

const BOTTOM_NAV = [
  { href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
]

export function Sidebar({ user, guest }: Props) {
  const path = usePathname()

  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border flex-shrink-0">
        <Link href="/dashboard" className="font-display font-black text-[17px] tracking-tight hover:text-accent-2 transition-colors">
          Step2Dev
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map(item => {
          const active = item.href === '/dashboard' ? path === '/dashboard' : path.startsWith(item.href)
          const locked = !!item.badge
          return (
            <Link
              key={item.href}
              href={locked ? '#' : item.href}
              onClick={locked ? (e) => e.preventDefault() : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group',
                active
                  ? 'bg-accent/15 text-accent-2'
                  : locked
                  ? 'text-muted/50 cursor-not-allowed'
                  : 'text-muted hover:bg-surface-2 hover:text-white'
              )}
            >
              <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
              <span className="flex-1 font-mono text-[13px]">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] text-muted border border-border rounded px-1.5 py-0.5 tracking-wide">
                  {item.badge}
                </span>
              )}
              {active && !locked && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-2 flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border py-3 px-3 space-y-0.5">
        {BOTTOM_NAV.map(item => {
          const active = path.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active ? 'bg-accent/15 text-accent-2' : 'text-muted hover:bg-surface-2 hover:text-white'
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="font-mono text-[13px]">{item.label}</span>
            </Link>
          )
        })}

        {/* User */}
        <div className="mt-2 px-3 py-2.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent-2 flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">{user.name.split(' ')[0]}</p>
            <p className="text-[10px] text-muted truncate">{guest ? 'Guest' : user.plan}</p>
          </div>
          {guest && (
            <span className="text-[9px] border border-warning/40 text-warning rounded px-1.5 py-0.5 flex-shrink-0">GUEST</span>
          )}
        </div>
      </div>
    </aside>
  )
}
