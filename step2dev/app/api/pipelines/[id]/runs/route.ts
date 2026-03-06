import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const pipeline = await prisma.pipeline.findFirst({ where: { id, userId: user.id } })
  if (!pipeline) return err('Pipeline not found', 404)

  const runs = await prisma.pipelineRun.findMany({
    where: { pipelineId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return ok({ runs })
}
