import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { signToken, createSession, setAuthCookie } from '@/lib/auth'
import { sendEmail, verifyEmailTemplate } from '@/lib/email'
import { generateToken, tokenExpiry, ok, err, getClientIP, getUA } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return err('Validation failed', 422, parsed.error.flatten().fieldErrors)

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return err('An account with this email already exists.', 409)

    const passwordHash = await bcrypt.hash(password, 12)
    const verifyToken = generateToken(64)
    const verifyTokenExp = tokenExpiry(24)

    const user = await prisma.user.create({
      data: { name, email, passwordHash, verifyToken, verifyTokenExp },
    })

    // Send verification email (non-blocking)
    const tpl = verifyEmailTemplate(name, verifyToken)
    sendEmail({ to: email, ...tpl }).catch(console.error)

    // Create session
    const tmpToken = signToken({ userId: user.id, email, sessionId: 'tmp' })
    const session = await createSession(user.id, tmpToken, {
      ipAddress: getClientIP(req),
      userAgent: getUA(req),
    })
    const finalToken = signToken({ userId: user.id, email, sessionId: session.id })
    await prisma.session.update({ where: { id: session.id }, data: { token: finalToken } })
    await setAuthCookie(finalToken)

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    return ok({ message: 'Account created! Check your email to verify.', user: { id: user.id, name, email } }, 201)
  } catch (e) {
    console.error('Register error:', e)
    return err('Internal server error', 500)
  }
}
