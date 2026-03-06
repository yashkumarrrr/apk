import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { streamClaude } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages, context } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('messages required', { status: 400 })
  }

  // Limit history to last 20 messages to control token usage
  const history = messages.slice(-20)

  // Build context string if dashboard data was provided
  let systemExtra = ''
  if (context) {
    if (context.servers?.length) {
      systemExtra += `\nUser's servers:\n${context.servers.map((s: {name:string;host:string;status:string;cpuUsage?:number;memUsage?:number;diskUsage?:number}) =>
        `- ${s.name} (${s.host}): ${s.status}, CPU ${s.cpuUsage ?? '?'}%, RAM ${s.memUsage ?? '?'}%, Disk ${s.diskUsage ?? '?'}%`
      ).join('\n')}`
    }
    if (context.pipelines?.length) {
      systemExtra += `\nUser's pipelines:\n${context.pipelines.map((p: {name:string;trigger:string;lastRun?:{status:string}}) =>
        `- ${p.name}: trigger=${p.trigger}, last run=${p.lastRun?.status ?? 'none'}`
      ).join('\n')}`
    }
    if (context.metrics) {
      const m = context.metrics
      systemExtra += `\nCurrent server metrics: CPU ${m.CPU}%, RAM ${m.MEMORY}%, Disk ${m.DISK}%, Network in ${m.NETWORK_IN} MB/s, Error rate ${m.ERROR_RATE}%, Latency ${m.LATENCY}ms`
    }
  }

  const stream = streamClaude(history, systemExtra || undefined, 2000)

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
