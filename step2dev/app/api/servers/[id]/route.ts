import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { z } from 'zod'

type Ctx = { params: Promise<{ id: string }> }

const SAFE_SELECT = {
  id: true, userId: true, name: true, host: true, port: true,
  username: true, authType: true, os: true, status: true,
  tags: true, lastPingedAt: true, cpuUsage: true, memUsage: true,
  diskUsage: true, uptime: true, createdAt: true, updatedAt: true,
}

const updateSchema = z.object({
  name:     z.string().min(1).max(60).trim().optional(),
  host:     z.string().min(1).trim().optional(),
  port:     z.number().int().min(1).max(65535).optional(),
  username: z.string().optional(),
  os:       z.enum(['UBUNTU','DEBIAN','CENTOS','FEDORA','ALPINE','WINDOWS','OTHER']).optional(),
  tags:     z.array(z.string()).optional(),
  status:   z.enum(['ONLINE','OFFLINE','UNKNOWN']).optional(),
  cpuUsage: z.number().optional(),
  memUsage: z.number().optional(),
  diskUsage:z.number().optional(),
  uptime:   z.number().optional(),
})

async function getServer(id: string, userId: string) {
  return prisma.server.findFirst({ where: { id, userId } })
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const server = await prisma.server.findFirst({ where: { id, userId: user.id }, select: SAFE_SELECT })
  if (!server) return err('Server not found', 404)
  return ok({ server })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const existing = await getServer(id, user.id)
  if (!existing) return err('Server not found', 404)

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)
    const server = await prisma.server.update({ where: { id }, data: parsed.data, select: SAFE_SELECT })
    return ok({ server })
  } catch (e) { console.error(e); return err('Server error', 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const { id } = await params
  const existing = await getServer(id, user.id)
  if (!existing) return err('Server not found', 404)
  await prisma.server.delete({ where: { id } })
  return ok({ message: 'Server deleted.' })
}
