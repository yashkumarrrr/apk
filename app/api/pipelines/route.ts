import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isGuestRequest } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { z } from 'zod'

const createSchema = z.object({
  name:      z.string().min(1).max(60).trim(),
  projectId: z.string().min(1),
  repoUrl:   z.string().url().optional().or(z.literal('')),
  branch:    z.string().default('main'),
  trigger:   z.enum(['MANUAL','PUSH','SCHEDULE']).default('MANUAL'),
  stages:    z.array(z.string()).min(1, 'At least one stage required'),
  enabled:   z.boolean().default(true),
})

export async function GET() {
  if (await isGuestRequest()) return ok({ pipelines: [] })
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  const pipelines = await prisma.pipeline.findMany({
    where: { userId: user.id },
    include: {
      project: { select: { name: true, icon: true, color: true } },
      runs:    { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return ok({ pipelines: pipelines.map(p => ({ ...p, lastRun: p.runs[0] ?? null })) })
}

export async function POST(req: NextRequest) {
  if (await isGuestRequest()) return err('Guest mode is read-only. Create an account to save data.', 403)
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  try {
    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

    const { name, projectId, repoUrl, branch, trigger, stages, enabled } = parsed.data

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
    if (!project) return err('Project not found', 404)

    const pipeline = await prisma.pipeline.create({
      data: { userId: user.id, projectId, name, repoUrl: repoUrl || null, branch, trigger, stages, enabled },
    })
    return ok({ pipeline }, 201)
  } catch (e) { console.error(e); return err('Server error', 500) }
}
