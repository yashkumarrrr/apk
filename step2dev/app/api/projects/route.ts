import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isGuestRequest } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { slugify } from '@/types'
import { z } from 'zod'

const createSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(50).trim(),
  description: z.string().max(200).optional(),
  env:         z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']).default('DEVELOPMENT'),
  icon:        z.string().default('⚡'),
  color:       z.string().default('#2563eb'),
})

export async function GET() {
  // Guests see empty list — no DB access needed
  if (await isGuestRequest()) return ok({ projects: [] })

  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  const projects = await prisma.project.findMany({
    where: { userId: user.id, status: { not: 'ARCHIVED' } },
    orderBy: { updatedAt: 'desc' },
  })
  return ok({ projects })
}

export async function POST(req: NextRequest) {
  if (await isGuestRequest()) return err('Guest mode is read-only. Create an account to save data.', 403)

  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  if (user.plan === 'FREE') {
    const count = await prisma.project.count({ where: { userId: user.id, status: { not: 'ARCHIVED' } } })
    if (count >= 3) return err('Free plan allows up to 3 projects. Upgrade to Pro for unlimited.', 403)
  }

  try {
    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

    const { name, description, env, icon, color } = parsed.data
    let slug = slugify(name)
    const existing = await prisma.project.findUnique({ where: { userId_slug: { userId: user.id, slug } } })
    if (existing) slug = `${slug}-${Date.now().toString(36)}`

    const project = await prisma.project.create({
      data: { userId: user.id, name, slug, description, env, icon, color },
    })
    return ok({ project }, 201)
  } catch (e) {
    console.error('Create project error:', e)
    return err('Server error', 500)
  }
}
