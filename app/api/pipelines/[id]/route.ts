import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { z } from 'zod'

const updateSchema = z.object({
  name:          z.string().min(1).max(80).trim().optional(),
  repoUrl:       z.string().url().optional().or(z.literal('')),
  branch:        z.string().optional(),
  trigger:       z.enum(['MANUAL','PUSH','SCHEDULE']).optional(),
  stages:        z.array(z.string()).min(1).optional(),
  enabled:       z.boolean().optional(),
  schedule:      z.string().nullable().optional(),
  retryOnFail:   z.boolean().optional(),
  maxRetries:    z.number().int().min(1).max(10).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

async function getPipeline(id: string, userId: string) {
  return prisma.pipeline.findFirst({ where: { id, userId } })
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const pipeline = await prisma.pipeline.findFirst({
    where: { id, userId: user.id },
    include: {
      project: { select: { name: true, icon: true, color: true } },
      runs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!pipeline) return err('Pipeline not found', 404)
  return ok({ pipeline: { ...pipeline, stages: Array.isArray(pipeline.stages) ? pipeline.stages : JSON.parse(String(pipeline.stages)) } })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const existing = await getPipeline(id, user.id)
  if (!existing) return err('Pipeline not found', 404)

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

    const updated = await prisma.pipeline.update({ where: { id }, data: parsed.data })
    return ok({ pipeline: { ...updated, stages: Array.isArray(updated.stages) ? updated.stages : JSON.parse(String(updated.stages)) } })
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const existing = await getPipeline(id, user.id)
  if (!existing) return err('Pipeline not found', 404)
  await prisma.pipeline.delete({ where: { id } })
  return ok({ message: 'Pipeline deleted.' })
}
