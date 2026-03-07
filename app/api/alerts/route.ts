import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'
import { isGuestRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (await isGuestRequest()) return ok({ alerts: [], rules: [] })
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  const state = req.nextUrl.searchParams.get('state')

  const alerts = await prisma.alert.findMany({
    where: {
      userId: user.id,
      ...(state ? { state: state as 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED' } : {}),
    },
    include: { rule: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const rules = await prisma.alertRule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return ok({ alerts, rules })
}
