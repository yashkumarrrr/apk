import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import { signToken, createSession, setAuthCookie } from '@/lib/auth'
import { ok, err, getClientIP, getUA } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    // Timing-safe: always hash even if user not found
    const hash = user?.passwordHash ?? '$2a$12$invalidhashtopreventtimingattacks00000000000'
    const match = await bcrypt.compare(password, hash)

    if (!user || !match) return err('Invalid email or password.', 401)

    const tmpToken = signToken({ userId: user.id, email, sessionId: 'tmp' })
    const session = await createSession(user.id, tmpToken, {
      ipAddress: getClientIP(req),
      userAgent: getUA(req),
    })
    const finalToken = signToken({ userId: user.id, email, sessionId: session.id })
    await prisma.session.update({ where: { id: session.id }, data: { token: finalToken } })
    await setAuthCookie(finalToken)
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    return ok({
      user: { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, plan: user.plan },
    })
  } catch (e) {
    console.error('Login error:', e)
    return err('Internal server error', 500)
  }
}
