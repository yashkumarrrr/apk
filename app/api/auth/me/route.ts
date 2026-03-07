import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return err('Not authenticated', 401)
  return ok({ user })
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const updateSchema = z.object({
  name:        z.string().min(1).max(80).trim().optional(),
  oldPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return err('Not authenticated', 401)

  const body   = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

  const updates: Record<string, unknown> = {}

  if (parsed.data.name) updates.name = parsed.data.name

  if (parsed.data.newPassword) {
    if (!parsed.data.oldPassword) return err('Current password required', 400)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    const match  = dbUser?.passwordHash
      ? await bcrypt.compare(parsed.data.oldPassword, dbUser.passwordHash)
      : false
    if (!match) return err('Current password is incorrect', 401)
    updates.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  }

  if (Object.keys(updates).length === 0) return err('No changes', 400)

  const updated = await prisma.user.update({
    where:  { id: user.id },
    data:   updates,
    select: { id: true, name: true, email: true, emailVerified: true, plan: true },
  })

  return ok({ user: updated })
}
