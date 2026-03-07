import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const rule = await prisma.alertRule.findFirst({ where: { id, userId: user.id } })
  if (!rule) return err('Rule not found', 404)
  const body    = await req.json()
  const updated = await prisma.alertRule.update({ where: { id }, data: body })
  return ok({ rule: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const rule = await prisma.alertRule.findFirst({ where: { id, userId: user.id } })
  if (!rule) return err('Rule not found', 404)
  await prisma.alertRule.delete({ where: { id } })
  return ok({ message: 'Rule deleted.' })
}
