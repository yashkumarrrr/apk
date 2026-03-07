import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ok, err } from '@/lib/utils'

// GET /api/notifications — list recent notifications
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return ok({ notifications: [], unread: 0 }) // guests get empty

  const { searchParams } = req.nextUrl
  const unreadOnly = searchParams.get('unread') === '1'

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })

  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  })

  return ok({ notifications, unread })
}

// POST /api/notifications/read-all — mark all read
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => ({}))

  if (body.action === 'read-all') {
    await prisma.notification.updateMany({
      where:  { userId: user.id, read: false },
      data:   { read: true },
    })
    return ok({ message: 'All marked as read' })
  }

  return err('Unknown action', 400)
}
