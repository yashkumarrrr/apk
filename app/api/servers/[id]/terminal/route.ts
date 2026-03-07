import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getServerConfig, sshStream } from '@/lib/ssh'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { id } = await params

  const server = await prisma.server.findFirst({ where: { id, userId: user.id } })
  if (!server) return new Response('Server not found', { status: 404 })

  const cfg = await getServerConfig(id, user.id)
  if (!cfg) return new Response('Could not load server credentials', { status: 500 })

  const cmd     = req.nextUrl.searchParams.get('cmd') ?? ''
  const encoder = new TextEncoder()
  let closed    = false

  req.signal.addEventListener('abort', () => { closed = true })

  // Special client-side-only commands
  if (!cmd || cmd === 'clear') {
    const payload = JSON.stringify({ line: cmd === 'clear' ? '__clear__' : '' })
    return new Response(`data: ${payload}\n\n`, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { closed = true }
      }

      const cancel = sshStream(
        cfg,
        cmd,
        (line, isErr) => { if (!closed) send({ line, isErr: !!isErr }) },
        (code) => {
          if (!closed) {
            send({ exitCode: code })
            try { controller.close() } catch { /* ok */ }
          }
        },
        (error) => {
          if (!closed) {
            send({ line: `ssh error: ${error.message}`, isErr: true })
            send({ exitCode: 255 })
            try { controller.close() } catch { /* ok */ }
          }
        }
      )

      req.signal.addEventListener('abort', () => {
        closed = true
        cancel()
        try { controller.close() } catch { /* ok */ }
      })
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
