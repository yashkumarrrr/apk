import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const alert = await prisma.alert.findFirst({ where: { id, userId: user.id } })
  if (!alert) return err('Alert not found', 404)

  const { state } = await req.json()
  const updated = await prisma.alert.update({
    where: { id },
    data: {
      state,
      ...(state === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
    },
  })
  return ok({ alert: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const alert = await prisma.alert.findFirst({ where: { id, userId: user.id } })
  if (!alert) return err('Alert not found', 404)
  await prisma.alert.delete({ where: { id } })
  return ok({ message: 'Alert dismissed.' })
}
