import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { collectRealMetrics, updateServerStats } from '@/lib/metrics-collector'
import type { MetricType } from '@/types'

const ALL_METRICS: MetricType[] = ['CPU', 'MEMORY', 'DISK', 'NETWORK_IN', 'NETWORK_OUT', 'REQUESTS', 'ERROR_RATE', 'LATENCY']

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const encoder = new TextEncoder()
  let closed    = false
  req.signal.addEventListener('abort', () => { closed = true })

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { closed = true }
      }

      while (!closed) {
        // Collect REAL metrics from the user's server via SSH
        const metrics = await collectRealMetrics(user.id)

        if (metrics) {
          // Update server stats in DB
          await updateServerStats(user.id, metrics)

          const t = Date.now()
          const values: Record<string, number> = {
            CPU:         metrics.CPU,
            MEMORY:      metrics.MEMORY,
            DISK:        metrics.DISK,
            NETWORK_IN:  metrics.NETWORK_IN,
            NETWORK_OUT: metrics.NETWORK_OUT,
            REQUESTS:    metrics.REQUESTS,
            ERROR_RATE:  metrics.ERROR_RATE,
            LATENCY:     metrics.LATENCY,
          }

          send({ t, values, source: metrics.serverName })

          // Check alert rules against real values
          try {
            const rules = await prisma.alertRule.findMany({
              where: { userId: user.id, enabled: true },
            })

            for (const rule of rules) {
              const val = values[rule.metric]
              if (val === undefined) continue

              const triggered =
                rule.comparator === 'gt' ? val > rule.threshold :
                rule.comparator === 'lt' ? val < rule.threshold :
                Math.abs(val - rule.threshold) < 0.5

              if (triggered) {
                const existing = await prisma.alert.findFirst({
                  where: { ruleId: rule.id, state: 'ACTIVE' },
                })
                if (!existing) {
                  await prisma.alert.create({
                    data: {
                      userId:    user.id,
                      ruleId:    rule.id,
                      title:     rule.name,
                      message:   `${rule.metric} is ${val.toFixed(1)} (threshold: ${rule.comparator === 'gt' ? '>' : '<'} ${rule.threshold})`,
                      severity:  rule.severity,
                      state:     'ACTIVE',
                      metric:    rule.metric,
                      value:     val,
                      threshold: rule.threshold,
                    },
                  })
                  send({ __alert: true, metric: rule.metric, value: val, severity: rule.severity, name: rule.name })
                }
              }
            }
          } catch { /* skip alert check if DB fails */ }

        } else {
          // No online server — tell client
          send({ noServer: true, message: 'No online servers found. Add and connect a server to see real metrics.' })
        }

        // Poll every 5 seconds (SSH round-trip takes ~1-2s so total ~6-7s)
        await new Promise(r => setTimeout(r, 5000))
      }

      try { controller.close() } catch { /* ignore */ }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
