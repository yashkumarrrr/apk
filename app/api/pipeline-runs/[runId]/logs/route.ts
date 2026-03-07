import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'

type Ctx = { params: Promise<{ runId: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { runId } = await params

  const run = await prisma.pipelineRun.findFirst({ where: { id: runId, userId: user.id } })
  if (!run) return err('Run not found', 404)

  const logs = await prisma.pipelineLog.findMany({
    where: { runId },
    orderBy: { seq: 'asc' },
  })

  return ok({ logs, run })
}
