'use client'
import { useRouter } from 'next/navigation'
import type { AuthUser } from '@/types'
import { NotificationBell } from '@/components/monitoring/NotificationBell'

interface Props { user: AuthUser; guest?: boolean }

export function Topbar({ user, guest }: Props) {
  const router = useRouter()

  async function logout() {
    if (guest) {
      sessionStorage.removeItem('guest')
      document.cookie = 'guest_session=;path=/;max-age=0'
      router.push('/')
    } else {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
      router.refresh()
    }
  }

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2">
        {guest && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning text-xs px-3 py-1.5 rounded-lg">
            <span>👤</span>
            <span>Guest mode — data won&apos;t be saved</span>
            <button
              onClick={() => router.push('/auth/register')}
              className="ml-1 text-white underline hover:no-underline"
            >
              Create account →
            </button>
          </div>
        )}
        {!guest && !user.emailVerified && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning text-xs px-3 py-1.5 rounded-lg">
            <span>⚠</span>
            <span>Please verify your email</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!guest && <NotificationBell />}
        <span className="text-xs text-muted hidden sm:block">{user.email}</span>
        <div className="w-px h-4 bg-border" />
        <button
          onClick={logout}
          className="text-xs text-muted hover:text-white transition-colors px-2 py-1 rounded hover:bg-surface-2"
        >
          {guest ? 'Exit Guest' : 'Sign out'}
        </button>
      </div>
    </header>
  )
}
