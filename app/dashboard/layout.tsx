import { getCurrentUser } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Topbar } from '@/components/dashboard/Topbar'
import { GuestGuard } from '@/components/dashboard/GuestGuard'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ── Critical: wrap all DB calls so a missing DB shows setup page, not a crash ──
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // DB not reachable — send to setup wizard
    redirect('/setup')
  }

  if (user) {
    return (
      <div className="flex h-screen bg-bg overflow-hidden">
        <Sidebar user={user} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    )
  }

  return <GuestGuard>{children}</GuestGuard>
}
