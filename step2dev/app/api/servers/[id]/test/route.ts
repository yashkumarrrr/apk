import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { sshTestConnection, getServerConfig } from '@/lib/ssh'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const server = await prisma.server.findFirst({ where: { id, userId: user.id } })
  if (!server) return err('Server not found', 404)

  const cfg = await getServerConfig(id, user.id)
  if (!cfg) return err('Could not load server credentials', 500)

  // Real SSH connection test
  const result = await sshTestConnection(cfg)

  const updated = await prisma.server.update({
    where: { id },
    data: {
      status:       result.success ? 'ONLINE' : 'OFFLINE',
      lastPingedAt: new Date(),
      ...(result.stats ? {
        cpuUsage:  result.stats.cpu,
        memUsage:  result.stats.mem,
        diskUsage: result.stats.disk,
        uptime:    result.stats.uptime,
      } : {}),
    },
    select: {
      id: true, status: true, lastPingedAt: true,
      cpuUsage: true, memUsage: true, diskUsage: true, uptime: true,
    },
  })

  return ok({
    success: result.success,
    latency: result.latency,
    error:   result.error,
    os:      result.stats?.os,
    server:  updated,
  })
}
