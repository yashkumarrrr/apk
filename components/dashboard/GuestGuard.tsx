'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { AuthUser } from '@/types'

const BASE_GUEST: Omit<AuthUser, 'name' | 'email'> = {
  id: 'guest', emailVerified: true, plan: 'FREE', avatarUrl: null,
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function clearCookie(name: string) {
  document.cookie = `${name}=;path=/;max-age=0`
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Check sessionStorage for guest info
    try {
      const raw = sessionStorage.getItem('guest')
      const guestCookie = getCookie('guest_session')

      if (raw && guestCookie) {
        const { name, email } = JSON.parse(raw)
        if (name && email) {
          setUser({ ...BASE_GUEST, name, email })
          setReady(true)
          return
        }
      }
    } catch { /* ignore */ }

    // No valid guest session — redirect
    clearCookie('guest_session')
    router.replace('/auth/login')
  }, [router])

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-[#080c10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#30363d] border-t-[#2563eb] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#080c10] overflow-hidden">
      <Sidebar user={user} guest />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar user={user} guest />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
