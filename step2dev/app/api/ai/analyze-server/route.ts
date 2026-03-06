import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { askClaude } from '@/lib/ai'
import { ok, err } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  const { serverId } = await req.json().catch(() => ({}))

  // Get the target server (or the most recently pinged one)
  const server = await prisma.server.findFirst({
    where: serverId
      ? { id: serverId, userId: user.id }
      : { userId: user.id, status: 'ONLINE' },
    orderBy: { lastPingedAt: 'desc' },
  })

  if (!server) return err('No online server found. Connect a server first.', 404)

  const prompt = `Analyze this Linux server's current health metrics and provide a diagnosis.

Server: ${server.name} (${server.host})
OS: ${server.os}
Status: ${server.status}
Last checked: ${server.lastPingedAt?.toISOString() ?? 'unknown'}

Current metrics:
- CPU Usage:    ${server.cpuUsage != null ? `${server.cpuUsage}%` : 'unknown'}
- Memory Usage: ${server.memUsage != null ? `${server.memUsage}%` : 'unknown'}
- Disk Usage:   ${server.diskUsage != null ? `${server.diskUsage}%` : 'unknown'}
- Uptime:       ${server.uptime != null ? `${Math.floor(server.uptime / 86400)}d ${Math.floor((server.uptime % 86400) / 3600)}h` : 'unknown'}

Provide:
1. **Health Assessment** — is this server healthy, under stress, or in danger?
2. **Issues** — flag any metric that's concerning (CPU > 80%, Memory > 85%, Disk > 90%)
3. **Recommendations** — specific commands to run to investigate or fix any issues
4. **Quick wins** — one or two things to do right now to improve performance or free up resources

Be specific and actionable. Use the actual numbers above.`

  try {
    const analysis = await askClaude(
      [{ role: 'user', content: prompt }],
      undefined,
      1200
    )
    return ok({ analysis, server: { id: server.id, name: server.name, host: server.host } })
  } catch (e: unknown) {
    return err(e instanceof Error ? e.message : 'AI analysis failed', 500)
  }
}
