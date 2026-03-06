import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { executePipeline } from '@/lib/pipeline-runner'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const pipeline = await prisma.pipeline.findFirst({ where: { id, userId: user.id } })
  if (!pipeline) return err('Pipeline not found', 404)
  if (!pipeline.enabled) return err('Pipeline is disabled', 400)

  // Check no run already in progress
  const running = await prisma.pipelineRun.findFirst({
    where: { pipelineId: id, status: { in: ['PENDING', 'RUNNING'] } },
  })
  if (running) return err('A run is already in progress', 409)

  const body = await req.json().catch(() => ({}))
  const branch = body.branch ?? pipeline.branch

  // Create the run record
  const run = await prisma.pipelineRun.create({
    data: {
      pipelineId: id,
      userId: user.id,
      status: 'PENDING',
      branch,
      triggeredBy: user.name,
    },
  })

  // Execute async — don't await so response returns immediately
  executePipeline(run.id).catch(console.error)

  return ok({ run }, 201)
}
