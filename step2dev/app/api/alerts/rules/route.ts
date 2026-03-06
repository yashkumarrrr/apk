import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { z } from 'zod'

const createSchema = z.object({
  name:       z.string().min(1).max(80).trim(),
  metric:     z.enum(['CPU','MEMORY','DISK','NETWORK_IN','NETWORK_OUT','REQUESTS','ERROR_RATE','LATENCY']),
  threshold:  z.number(),
  comparator: z.enum(['gt','lt','eq']).default('gt'),
  severity:   z.enum(['INFO','WARNING','CRITICAL']).default('WARNING'),
  enabled:    z.boolean().default(true),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  const rules = await prisma.alertRule.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return ok({ rules })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)
  try {
    const body   = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)
    const rule = await prisma.alertRule.create({ data: { userId: user.id, ...parsed.data } })
    return ok({ rule }, 201)
  } catch (e) { console.error(e); return err('Server error', 500) }
}
