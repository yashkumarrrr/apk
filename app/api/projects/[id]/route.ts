import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  description: z.string().max(200).optional(),
  env: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'PAUSED']).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

async function getProject(id: string, userId: string) {
  return prisma.project.findFirst({ where: { id, userId } })
}

// GET /api/projects/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const project = await getProject(id, user.id)
  if (!project) return err('Project not found', 404)
  return ok({ project })
}

// PATCH /api/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const project = await getProject(id, user.id)
  if (!project) return err('Project not found', 404)

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

    const updated = await prisma.project.update({
      where: { id },
      data: parsed.data,
    })
    return ok({ project: updated })
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}

// DELETE /api/projects/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const project = await getProject(id, user.id)
  if (!project) return err('Project not found', 404)

  await prisma.project.delete({ where: { id } })
  return ok({ message: 'Project deleted.' })
}
