import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isGuestRequest } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { z } from 'zod'

const createSchema = z.object({
  name:       z.string().min(1).max(60).trim(),
  host:       z.string().min(1).trim(),
  port:       z.number().int().min(1).max(65535).default(22),
  username:   z.string().min(1).default('root'),
  authType:   z.enum(['password', 'key']).default('password'),
  password:   z.string().optional(),
  privateKey: z.string().optional(),
  os:         z.enum(['UBUNTU','DEBIAN','CENTOS','FEDORA','ALPINE','WINDOWS','OTHER']).default('UBUNTU'),
  tags:       z.array(z.string()).default([]),
})

export async function GET() {
  if (await isGuestRequest()) return ok({ servers: [] })
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  const servers = await prisma.server.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, userId: true, name: true, host: true, port: true,
      username: true, authType: true, os: true, status: true,
      tags: true, lastPingedAt: true, cpuUsage: true, memUsage: true,
      diskUsage: true, uptime: true, createdAt: true, updatedAt: true,
    },
  })
  return ok({ servers })
}

export async function POST(req: NextRequest) {
  if (await isGuestRequest()) return err('Guest mode is read-only. Create an account to save data.', 403)
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  try {
    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

    const { name, host, port, username, authType, password, privateKey, os, tags } = parsed.data
    if (authType === 'password' && !password) return err('Password is required', 422)
    if (authType === 'key' && !privateKey)    return err('Private key is required', 422)

    const server = await prisma.server.create({
      data: { userId: user.id, name, host, port, username, authType, password, privateKey, os, tags },
      select: {
        id: true, userId: true, name: true, host: true, port: true,
        username: true, authType: true, os: true, status: true,
        tags: true, lastPingedAt: true, cpuUsage: true, memUsage: true,
        diskUsage: true, uptime: true, createdAt: true, updatedAt: true,
      },
    })
    return ok({ server }, 201)
  } catch (e) { console.error(e); return err('Server error', 500) }
}
