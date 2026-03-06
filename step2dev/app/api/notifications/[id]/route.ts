import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const notif = await prisma.notification.findFirst({ where: { id, userId: user.id } })
  if (!notif) return err('Not found', 404)

  const updated = await prisma.notification.update({ where: { id }, data: { read: true } })
  return ok({ notification: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params

  const notif = await prisma.notification.findFirst({ where: { id, userId: user.id } })
  if (!notif) return err('Not found', 404)

  await prisma.notification.delete({ where: { id } })
  return ok({ message: 'Deleted' })
}
