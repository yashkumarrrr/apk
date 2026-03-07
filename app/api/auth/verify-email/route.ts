import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isExpired, ok, err } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return err('Token required', 400)

    const user = await prisma.user.findUnique({ where: { verifyToken: token } })
    if (!user) return err('Invalid or expired link.', 400)
    if (user.emailVerified) return ok({ message: 'Already verified.' })
    if (isExpired(user.verifyTokenExp)) return err('Link expired. Please register again.', 400)

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null, verifyTokenExp: null },
    })
    return ok({ message: 'Email verified! You can now log in.' })
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}

// Handle link clicks from email
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const base = new URL('/auth/verify-email', req.url)

  if (!token) { base.searchParams.set('error', 'missing'); return Response.redirect(base) }

  const user = await prisma.user.findUnique({ where: { verifyToken: token } }).catch(() => null)
  if (!user || isExpired(user.verifyTokenExp)) {
    base.searchParams.set('error', 'invalid')
    return Response.redirect(base)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExp: null },
  })
  base.searchParams.set('success', '1')
  return Response.redirect(base)
}
