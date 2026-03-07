import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import type { AuthUser } from '@/types'

export type { AuthUser }

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const COOKIE = 'acciq_token'

export interface JWTPayload {
  userId: string
  email: string
  sessionId: string
}

// ── Token ────────────────────────────────────────────────────────────────────

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

// ── Cookie ───────────────────────────────────────────────────────────────────

export async function setAuthCookie(token: string) {
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function clearAuthCookie() {
  const jar = await cookies()
  jar.set(COOKIE, '', { maxAge: 0, path: '/' })
}

export async function getTokenFromCookie(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE)?.value ?? null
}

// ── Session ──────────────────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  token: string,
  meta?: { userAgent?: string; ipAddress?: string }
) {
  return prisma.session.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  })
}

export async function invalidateSession(token: string) {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {})
}

// ── Get current user ─────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const token = await getTokenFromCookie()
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) return null

    const u = session.user
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt.toISOString(),
      plan: u.plan,
      avatarUrl: u.avatarUrl,
    }
  } catch {
    return null
  }
}

// ── Guest support ─────────────────────────────────────────────────────────────
// Guest users have a guest_session cookie but no real DB session.
// APIs use this to return empty data instead of 401.

export async function isGuestRequest(): Promise<boolean> {
  try {
    const jar = await cookies()
    return !!jar.get('guest_session')?.value
  } catch {
    return false
  }
}

// Returns real user OR a synthetic guest user (id='guest')
// If neither exists, returns null (true unauthorized)
export async function getCurrentUserOrGuest(): Promise<AuthUser | null> {
  const real = await getCurrentUser()
  if (real) return real

  const guest = await isGuestRequest()
  if (guest) {
    return {
      id: 'guest',
      name: 'Guest',
      email: 'guest@step2dev.com',
      emailVerified: true,
      plan: 'FREE',
      avatarUrl: null,
    }
  }

  return null
}
