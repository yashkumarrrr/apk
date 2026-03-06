import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { collectRealMetrics } from '@/lib/metrics-collector'
import { ok, err } from '@/lib/utils'
import { isGuestRequest } from '@/lib/auth'
import type { MetricType } from '@/types'

const ALL_METRICS: MetricType[] = ['CPU', 'MEMORY', 'DISK', 'NETWORK_IN', 'NETWORK_OUT', 'REQUESTS', 'ERROR_RATE', 'LATENCY']

export async function GET(req: NextRequest) {
  if (await isGuestRequest()) return ok({ series: [], hasRealData: false, serverName: null, onlineServers: 0 })
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  // Take one real snapshot now
  const snapshot = await collectRealMetrics(user.id)

  // Build series: just the current point (no history stored unless you add MetricSnapshot logging)
  const now = Date.now()
  const series = ALL_METRICS.map(type => {
    const current = snapshot ? (snapshot[type as keyof typeof snapshot] as number) ?? 0 : 0
    // Return a single-point series (chart will fill in history as stream runs)
    return {
      type,
      points:  [{ t: now, v: current }],
      current,
    }
  })

  // Also count online servers for context
  const onlineServers = await prisma.server.count({
    where: { userId: user.id, status: 'ONLINE' },
  })

  return ok({
    series,
    hasRealData:   !!snapshot,
    serverName:    snapshot?.serverName ?? null,
    onlineServers,
  })
}
