import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

type Ctx = { params: Promise<{ runId: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { runId } = await params

  // Verify ownership
  const run = await prisma.pipelineRun.findFirst({
    where: { id: runId, userId: user.id },
  })
  if (!run) return new Response('Not found', { status: 404 })

  const encoder = new TextEncoder()
  let lastSeq = -1
  let closed = false

  req.signal.addEventListener('abort', () => { closed = true })

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch { closed = true }
      }

      // Send existing logs first
      const existing = await prisma.pipelineLog.findMany({
        where: { runId },
        orderBy: { seq: 'asc' },
      })
      for (const log of existing) {
        send(JSON.stringify(log))
        lastSeq = log.seq
      }

      // Stream new logs as they arrive
      const poll = async () => {
        while (!closed) {
          // Check if run is finished
          const current = await prisma.pipelineRun.findUnique({
            where: { id: runId },
            select: { status: true },
          }).catch(() => null)

          if (!current) { closed = true; break }

          // Get new logs since last seq
          const newLogs = await prisma.pipelineLog.findMany({
            where: { runId, seq: { gt: lastSeq } },
            orderBy: { seq: 'asc' },
          }).catch(() => [])

          for (const log of newLogs) {
            send(JSON.stringify(log))
            lastSeq = log.seq
          }

          // Send run status update
          send(JSON.stringify({ __status: current.status }))

          if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(current.status)) {
            closed = true
            break
          }

          await new Promise(r => setTimeout(r, 500))
        }

        try { controller.close() } catch { /* already closed */ }
      }

      poll().catch(console.error)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
